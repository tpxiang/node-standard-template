/**
 * JWT 鉴权守卫：校验 Bearer access token，并检查 Redis 黑名单。
 * 通过后将 AuthUser 挂到 request.user，供权限守卫与 @CurrentUser 使用。
 */
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { FastifyRequest } from "fastify";
import { setRequestUserId } from "../../../common/context/request-context";
import { AuthService } from "../auth.service";
import { AccessTokenPayload, AuthUser } from "../auth.types";

type AuthenticatedRequest = FastifyRequest & { user: AuthUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;

    if (!token) {
      throw new UnauthorizedException("Authorization token is required");
    }

    try {
      if (await this.authService.isAccessTokenBlacklisted(token)) {
        throw new UnauthorizedException("Authorization token has been revoked");
      }

      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>("auth.accessSecret")
      });
      // 防止误用 refresh token 访问受保护接口。
      if (payload.type !== "access") {
        throw new UnauthorizedException("Invalid token type");
      }
      request.user = {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles,
        permissions: payload.permissions
      };
      setRequestUserId(payload.sub);
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Invalid or expired authorization token");
    }
  }
}
