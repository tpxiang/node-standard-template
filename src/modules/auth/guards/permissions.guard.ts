/**
 * 权限守卫：读取 @Permissions 元数据，要求当前用户具备全部声明权限码。
 * 未声明权限的接口默认放行（仍可能受 JwtAuthGuard 约束）。
 */
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
