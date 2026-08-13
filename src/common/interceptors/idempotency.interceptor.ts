import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { Observable, from, of, throwError } from "rxjs";
import { catchError, switchMap, tap } from "rxjs/operators";
import { BusinessException } from "../exceptions/business.exception";
import { ErrorCode } from "../constants/error-codes";
import { RedisService } from "../../infrastructure/redis/redis.service";

const IDEMPOTENCY_HEADER = "idempotency-key";
const RESULT_TTL_SECONDS = 24 * 60 * 60;
const LOCK_TTL_SECONDS = 60;

/**
 * POST 请求若携带 Idempotency-Key：
 * - 命中缓存则直接返回上次成功响应体（已含统一信封）
 * - 并发同 key 返回 409，避免双执行
 * 未带 header 时透传，不强制幂等。
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly redis: RedisService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();

    if (request.method !== "POST") {
      return next.handle();
    }

    const rawKey = request.headers[IDEMPOTENCY_HEADER];
    const key = Array.isArray(rawKey) ? rawKey[0] : rawKey;
    if (!key?.trim()) {
      return next.handle();
    }

    const resultKey = `idempotency:result:${key.trim()}`;
    const lockKey = `idempotency:lock:${key.trim()}`;

    return from(this.redis.get(resultKey)).pipe(
      switchMap((cached) => {
        if (cached) {
          return of(JSON.parse(cached) as unknown);
        }

        return from(this.redis.setNx(lockKey, "1", LOCK_TTL_SECONDS)).pipe(
          switchMap((locked) => {
            if (!locked) {
              return throwError(
                () =>
                  new BusinessException(
                    ErrorCode.IDEMPOTENCY_IN_PROGRESS,
                    "Request with this Idempotency-Key is already in progress",
                    409
                  )
              );
            }

            return next.handle().pipe(
              tap((body) => {
                void this.redis.set(resultKey, JSON.stringify(body), RESULT_TTL_SECONDS);
                void this.redis.del(lockKey);
                void reply.header("idempotency-replay", "false");
              }),
              catchError((error: unknown) => {
                void this.redis.del(lockKey);
                return throwError(() => error);
              })
            );
          })
        );
      })
    );
  }
}
