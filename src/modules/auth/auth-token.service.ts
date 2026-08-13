import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { ErrorCode } from "../../common/constants/error-codes";
import { PrismaService } from "../../database/prisma.service";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { AuthUser, RefreshTokenPayload, TokenPair } from "./auth.types";

type DbClient = Prisma.TransactionClient | PrismaService;

const userAuthInclude = {
  roles: {
    include: {
      role: {
        include: { permissions: { include: { permission: true } } }
      }
    }
  }
} as const;

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService
  ) {}

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
      if (!stored)
        throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, "Invalid refresh token", 401);
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
      await tx.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
      return this.issueTokens(tx, this.toAuthUser(stored.user));
    });
  }

  async logout(refreshToken: string, accessToken?: string): Promise<{ revoked: boolean }> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() }
    });
    if (accessToken) await this.blacklistAccessToken(accessToken);
    return { revoked: true };
  }

  isAccessTokenBlacklisted(accessToken: string): Promise<boolean> {
    return this.redis.get(this.accessBlacklistKey(accessToken)).then((value) => value !== null);
  }

  issueForUser(user: AuthUser): Promise<TokenPair> {
    return this.issueTokens(this.prisma, user);
  }

  private async issueTokens(db: DbClient, user: AuthUser): Promise<TokenPair> {
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions,
        type: "access"
      },
      {
        secret: this.configService.getOrThrow<string>("auth.accessSecret"),
        expiresIn: this.configService.getOrThrow<string>("auth.accessExpiresIn")
      }
    );
    const tokenId = randomUUID();
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, tokenId, type: "refresh" },
      {
        secret: this.configService.getOrThrow<string>("auth.refreshSecret"),
        expiresIn: this.configService.getOrThrow<string>("auth.refreshExpiresIn")
      }
    );
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

  private toAuthUser(user: {
    id: string;
    email: string;
    roles: Array<{ role: { name: string; permissions: Array<{ permission: { code: string } }> } }>;
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

  private async blacklistAccessToken(accessToken: string): Promise<void> {
    const decoded = this.jwtService.decode(accessToken) as { exp?: number } | null;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const ttl = typeof decoded?.exp === "number" ? Math.max(decoded.exp - nowSeconds, 1) : 15 * 60;
    await this.redis.set(this.accessBlacklistKey(accessToken), "1", ttl);
  }

  private accessBlacklistKey(token: string): string {
    return `auth:access:blacklist:${this.hashToken(token)}`;
  }
  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private getRefreshExpiry(): Date {
    const expiresIn = this.configService.getOrThrow<string>("auth.refreshExpiresIn");
    const match = /^(\d+)([dhm])$/.exec(expiresIn);
    if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const multiplier = match[2] === "d" ? 24 * 60 * 60 : match[2] === "h" ? 60 * 60 : 60;
    return new Date(Date.now() + Number(match[1]) * multiplier * 1000);
  }
}
