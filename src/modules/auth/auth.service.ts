import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { BusinessException } from "../../common/exceptions/business.exception";
import { ErrorCode } from "../../common/constants/error-codes";
import { PrismaService } from "../../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthUser, TokenPair } from "./auth.types";
import { LoginDto } from "./dto/login.dto";
import { AuthLoginRateLimitService } from "./auth-login-rate-limit.service";
import { AuthTokenService } from "./auth-token.service";

const userAuthInclude = {
  roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } }
} as const;
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly rateLimit: AuthLoginRateLimitService,
    private readonly tokens: AuthTokenService
  ) {}
  async login(dto: LoginDto, requestId?: string): Promise<{ tokens: TokenPair; user: AuthUser }> {
    await this.rateLimit.assertAllowed(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: userAuthInclude
    });
    if (
      !user ||
      user.status !== "ACTIVE" ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    ) {
      await this.rateLimit.recordFailure(dto.email);
      throw new BusinessException(ErrorCode.INVALID_CREDENTIALS, "Invalid email or password", 401);
    }
    await this.rateLimit.clear(dto.email);
    const authUser = this.toUser(user);
    const tokens = await this.tokens.issueForUser(authUser);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.create({ actorId: user.id, action: "LOGIN", resource: "AUTH", requestId });
    return { tokens, user: authUser };
  }
  refresh(token: string): Promise<TokenPair> {
    return this.tokens.refresh(token);
  }
  logout(refresh: string, access?: string): Promise<{ revoked: boolean }> {
    return this.tokens.logout(refresh, access);
  }
  isAccessTokenBlacklisted(token: string): Promise<boolean> {
    return this.tokens.isAccessTokenBlacklisted(token);
  }
  private toUser(user: {
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
}
