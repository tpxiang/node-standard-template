import { createParamDecorator } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import type { AuthUser } from "../../modules/auth/auth.types";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<FastifyRequest & { user: AuthUser }>();
    return request.user;
  }
);
