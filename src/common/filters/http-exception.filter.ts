/**
 * 全局异常过滤器：将任意异常转为统一错误响应信封。
 * 约定字段：success / code / message / requestId / timestamp。
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { ErrorCode } from "../constants/error-codes";

interface ErrorResponseBody {
  code?: ErrorCode;
  message?: string | string[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<FastifyReply>();
    const request = context.getRequest<FastifyRequest>();
    const requestId = request.headers["x-request-id"]?.toString();

    const mapped = this.mapInfrastructureException(exception);
    const status =
      mapped?.status ??
      (exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR);
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const body = mapped?.body ?? this.resolveBody(exceptionResponse);

    // 4xx 多为可预期业务/校验错误；仅 5xx 记录完整异常上下文。
    if (status >= 500) {
      this.logger.error(
        {
          err: exception,
          requestId,
          path: request.url,
          method: request.method
        },
        "Unhandled exception"
      );
    }

    void response.status(status).send({
      success: false,
      code: body.code ?? this.resolveDefaultCode(status),
      message: body.message ?? "Internal server error",
      requestId,
      timestamp: new Date().toISOString()
    });
  }

  private mapInfrastructureException(
    exception: unknown
  ): { status: number; body: ErrorResponseBody } | undefined {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === "P2002")
        return {
          status: HttpStatus.CONFLICT,
          body: { code: ErrorCode.RESOURCE_ALREADY_EXISTS, message: "Resource already exists" }
        };
      if (exception.code === "P2025")
        return {
          status: HttpStatus.NOT_FOUND,
          body: { code: ErrorCode.RESOURCE_NOT_FOUND, message: "Resource not found" }
        };
      if (exception.code === "P2003")
        return {
          status: HttpStatus.CONFLICT,
          body: { code: ErrorCode.RESOURCE_CONFLICT, message: "Resource is still referenced" }
        };
    }
    const code = (exception as { code?: unknown } | null)?.code;
    if (typeof code === "string" && ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT"].includes(code)) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        body: { code: ErrorCode.DEPENDENCY_UNAVAILABLE, message: "Dependency unavailable" }
      };
    }
    return undefined;
  }

  private resolveBody(response: string | object | undefined): ErrorResponseBody {
    if (!response) return {};
    if (typeof response === "string") return { message: response };
    const value = response as Record<string, unknown>;
    const code = typeof value.code === "string" ? (value.code as ErrorCode) : undefined;
    const message =
      typeof value.message === "string" || Array.isArray(value.message) ? value.message : undefined;
    return { code, message };
  }

  /** 将框架默认 HTTP 状态映射为前端可依赖的稳定业务错误码。 */
  private resolveDefaultCode(status: number): ErrorCode {
    if (status === HttpStatus.UNAUTHORIZED) return ErrorCode.AUTH_TOKEN_INVALID;
    if (status === HttpStatus.FORBIDDEN) return ErrorCode.AUTH_FORBIDDEN;
    if (status === HttpStatus.BAD_REQUEST) return ErrorCode.VALIDATION_ERROR;
    return ErrorCode.INTERNAL_SERVER_ERROR;
  }
}
