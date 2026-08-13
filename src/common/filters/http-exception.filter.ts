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

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const body = this.resolveBody(exceptionResponse);

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
