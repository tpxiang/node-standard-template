/**
 * 业务异常：携带稳定错误码，由全局过滤器转换为统一错误响应。
 */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import { HttpException, HttpStatus } from "@nestjs/common";
import { ErrorCode } from "../constants/error-codes";

export class BusinessException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status: number = HttpStatus.BAD_REQUEST
  ) {
    super({ code, message }, status);
  }
}
