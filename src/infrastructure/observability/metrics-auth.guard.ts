import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyRequest } from "fastify";

@Injectable()
export class MetricsAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    if (this.config.get<boolean>("observability.metricsEnabled") === false) {
      throw new NotFoundException();
    }
    const expected = this.config.get<string>("observability.metricsToken");
    if (!expected) return true;
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const authorization = request.headers.authorization;
    const provided =
      request.headers["x-metrics-token"]?.toString() ??
      (authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined);
    if (provided !== expected) throw new UnauthorizedException("Invalid metrics token");
    return true;
  }
}
