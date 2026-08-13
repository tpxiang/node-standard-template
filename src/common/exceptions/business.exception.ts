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
