import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { FastifyRequest } from "fastify";
import { AccessTokenPayload, AuthUser } from "../auth.types";

type AuthenticatedRequest = FastifyRequest & { user: AuthUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;

    if (!token) {
      throw new UnauthorizedException("Authorization token is required");
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>("auth.accessSecret")
      });
      if (payload.type !== "access") {
        throw new UnauthorizedException("Invalid token type");
      }
      request.user = {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles,
        permissions: payload.permissions
      };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired authorization token");
    }
  }
}
