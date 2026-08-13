/**
 * 认证服务：登录、刷新、登出。
 * - refresh 采用旋转签发 + 重放检测（已吊销 token 再使用会踢掉全部会话）
 * - 登录失败计入 Redis，超过阈值返回 429
 * - logout 可顺带将 access token 写入黑名单直至过期
 */
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash, randomUUID } from "node:crypto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { ErrorCode } from "../../common/constants/error-codes";
import { PrismaService } from "../../database/prisma.service";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { AuditService } from "../audit/audit.service";
import { AccessTokenPayload, AuthUser, RefreshTokenPayload, TokenPair } from "./auth.types";
import { LoginDto } from "./dto/login.dto";

type DbClient = Prisma.TransactionClient | PrismaService;

/** 查询用户时一并带出角色与权限码，供签发 JWT。 */
const userAuthInclude = {
  roles: {
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      }
    }
  }
} as const;

/** 连续失败次数上限与锁定窗口（秒）。 */
const LOGIN_FAIL_LIMIT = 5;
const LOGIN_FAIL_WINDOW_SECONDS = 15 * 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly redis: RedisService
  ) {}

  async login(dto: LoginDto, requestId?: string): Promise<{ tokens: TokenPair; user: AuthUser }> {
    await this.assertLoginNotRateLimited(dto.email);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: userAuthInclude
    });

    // 用户不存在、非 ACTIVE、密码错误统一返回同一文案，避免账号枚举。
    if (
      !user ||
      user.status !== "ACTIVE" ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    ) {
      await this.recordLoginFailure(dto.email);
      throw new BusinessException(ErrorCode.INVALID_CREDENTIALS, "Invalid email or password", 401);
    }

    await this.clearLoginFailures(dto.email);

    const authUser = this.toAuthUser(user);
    const tokens = await this.issueTokens(this.prisma, authUser);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });
    await this.auditService.create({
      actorId: user.id,
      action: "LOGIN",
      resource: "AUTH",
      requestId
    });

    return { tokens, user: authUser };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>("auth.refreshSecret")
      });
    } catch {
      throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, "Invalid refresh token", 401);
    }

    if (payload.type !== "refresh") {
      throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, "Invalid refresh token", 401);
    }

    const tokenHash = this.hashToken(refreshToken);

    return this.prisma.$transaction(async (tx) => {
      const stored = await tx.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: { include: userAuthInclude } }
      });

      if (!stored) {
        throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, "Invalid refresh token", 401);
      }

      // 已吊销的 refresh token 被再次使用 → 吊销该用户全部会话（防重放）。
      if (stored.revokedAt) {
        await tx.refreshToken.updateMany({
          where: { userId: stored.userId, revokedAt: null },
          data: { revokedAt: new Date() }
        });
        throw new BusinessException(
          ErrorCode.AUTH_TOKEN_REUSED,
          "Refresh token reuse detected",
          401
        );
      }

      if (stored.expiresAt < new Date()) {
        throw new BusinessException(ErrorCode.AUTH_TOKEN_EXPIRED, "Refresh token expired", 401);
      }

      if (stored.user.status !== "ACTIVE") {
        throw new BusinessException(ErrorCode.INVALID_CREDENTIALS, "User is not active", 401);
      }

      // 旋转：旧 refresh 立即作废，再签发新的一对 token。
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() }
      });

      return this.issueTokens(tx, this.toAuthUser(stored.user));
    });
  }

  /**
   * 登出：吊销 refresh；若请求携带 access，则写入 Redis 黑名单直至 JWT 过期。
   */
  async logout(refreshToken: string, accessToken?: string): Promise<{ revoked: boolean }> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() }
    });

    if (accessToken) {
      await this.blacklistAccessToken(accessToken);
    }

    return { revoked: true };
  }

  async isAccessTokenBlacklisted(accessToken: string): Promise<boolean> {
    const value = await this.redis.get(this.accessBlacklistKey(accessToken));
    return value !== null;
  }

  private async blacklistAccessToken(accessToken: string): Promise<void> {
    const decoded = this.jwtService.decode(accessToken) as { exp?: number } | null;
    const nowSeconds = Math.floor(Date.now() / 1000);
    // TTL 对齐 access 剩余寿命，过期后自动清理，避免 Redis 无限堆积。
    const ttlSeconds =
      typeof decoded?.exp === "number" ? Math.max(decoded.exp - nowSeconds, 1) : 15 * 60;
    await this.redis.set(this.accessBlacklistKey(accessToken), "1", ttlSeconds);
  }

  private accessBlacklistKey(accessToken: string): string {
    return `auth:access:blacklist:${this.hashToken(accessToken)}`;
  }

  private toAuthUser(user: {
    id: string;
    email: string;
    roles: Array<{
      role: {
        name: string;
        permissions: Array<{ permission: { code: string } }>;
      };
    }>;
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      roles: user.roles.map(({ role }) => role.name),
      permissions: user.roles.flatMap(({ role }) =>
        role.permissions.map(({ permission }) => permission.code)
      )
    };
  }

  private async issueTokens(db: DbClient, user: AuthUser): Promise<TokenPair> {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      type: "access"
    };
    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.configService.getOrThrow<string>("auth.accessSecret"),
      expiresIn: this.configService.getOrThrow<string>("auth.accessExpiresIn")
    });

    // 先生成 tokenId，再一次性写入最终 hash，避免并发下 "pending" 唯一键冲突。
    const tokenId = randomUUID();
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      tokenId,
      type: "refresh"
    };
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.getOrThrow<string>("auth.refreshSecret"),
      expiresIn: this.configService.getOrThrow<string>("auth.refreshExpiresIn")
    });

    await db.refreshToken.create({
      data: {
        id: tokenId,
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: this.getRefreshExpiry()
      }
    });

    return { accessToken, refreshToken };
  }

  /** 仅存 hash，数据库泄露时无法直接还原明文 refresh token。 */
  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private getRefreshExpiry(): Date {
    const expiresIn = this.configService.getOrThrow<string>("auth.refreshExpiresIn");
    const daysMatch = /^(\d+)d$/.exec(expiresIn);
    const hoursMatch = /^(\d+)h$/.exec(expiresIn);
    const minutesMatch = /^(\d+)m$/.exec(expiresIn);
    const now = Date.now();

    if (daysMatch) return new Date(now + Number(daysMatch[1]) * 24 * 60 * 60 * 1000);
    if (hoursMatch) return new Date(now + Number(hoursMatch[1]) * 60 * 60 * 1000);
    if (minutesMatch) return new Date(now + Number(minutesMatch[1]) * 60 * 1000);
    return new Date(now + 7 * 24 * 60 * 60 * 1000);
  }

  private loginFailKey(email: string): string {
    return `auth:login:fail:${email.trim().toLowerCase()}`;
  }

  private async assertLoginNotRateLimited(email: string): Promise<void> {
    const key = this.loginFailKey(email);
    const raw = await this.redis.get(key);
    const failures = raw ? Number(raw) : 0;
    if (failures < LOGIN_FAIL_LIMIT) return;

    const ttl = await this.redis.ttl(key);
    throw new BusinessException(
      ErrorCode.AUTH_RATE_LIMITED,
      `Too many failed login attempts. Retry in ${Math.max(ttl, 1)} seconds`,
      429
    );
  }

  private async recordLoginFailure(email: string): Promise<void> {
    const key = this.loginFailKey(email);
    const failures = await this.redis.incr(key);
    if (failures === 1) {
      await this.redis.expire(key, LOGIN_FAIL_WINDOW_SECONDS);
    }
  }

  private async clearLoginFailures(email: string): Promise<void> {
    await this.redis.del(this.loginFailKey(email));
  }
}
