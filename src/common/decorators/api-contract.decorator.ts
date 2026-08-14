import { applyDecorators } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiExtraModels,
  ApiHeader,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { ApiErrorResponseDto, ApiSuccessResponseDto } from "../dto/api-response.dto";
export function ApiStandardContract(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiExtraModels(ApiSuccessResponseDto, ApiErrorResponseDto),
    ApiHeader({ name: "X-Request-Id", required: false }),
    ApiOkResponse({ type: ApiSuccessResponseDto }),
    ApiBadRequestResponse({ type: ApiErrorResponseDto }),
    ApiUnauthorizedResponse({ type: ApiErrorResponseDto }),
    ApiConflictResponse({ type: ApiErrorResponseDto }),
    ApiInternalServerErrorResponse({ type: ApiErrorResponseDto })
  );
}
export function ApiIdempotencyKey(): MethodDecorator {
  return ApiHeader({
    name: "Idempotency-Key",
    required: false,
    description: "Deduplicates retries of the same POST request"
  });
}
