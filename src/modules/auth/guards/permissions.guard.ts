import { CanActivate, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { ExecutionContext } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { PERMISSIONS_KEY } from "../../../common/decorators/permissions.decorator";
import { AuthUser } from "../auth.types";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest & { user: AuthUser }>();
    const allowed = required.every((permission) => request.user.permissions.includes(permission));
    if (!allowed) {
      throw new ForbiddenException("Insufficient permissions");
    }
    return true;
  }
}
