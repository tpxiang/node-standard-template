import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { createHash, randomUUID } from "node:crypto";
import { clearInterval, setInterval } from "node:timers";
import { Observable, from, of, throwError } from "rxjs";
import { catchError, finalize, map, mergeMap } from "rxjs/operators";
import { getRequestTenantId, getRequestUserId } from "../context/request-context";
import { ErrorCode } from "../constants/error-codes";
import { BusinessException } from "../exceptions/business.exception";
import { RedisService } from "../../infrastructure/redis/redis.service";

const IDEMPOTENCY_HEADER = "idempotency-key";
const RESULT_TTL_SECONDS = 24 * 60 * 60;
const LOCK_TTL_SECONDS = 60;
const MAX_KEY_LENGTH = 256;

interface CachedResult {
  fingerprint: string;
  body: unknown;
}

/**
 * POST 请求若携带 Idempotency-Key：
 * - Key 按用户、接口隔离，避免不同调用方相互污染；
 * - 相同 Key 搭配不同请求体返回冲突；
 * - 命中缓存则直接返回上次成功响应体；
 * - 并发同 Key 返回 409，避免双执行。
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly redis: RedisService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();

    if (request.method !== "POST") return next.handle();

    const rawKey = request.headers[IDEMPOTENCY_HEADER];
    const key = (Array.isArray(rawKey) ? rawKey[0] : rawKey)?.trim();
    if (!key) return next.handle();
    if (key.length > MAX_KEY_LENGTH) {
      throw new BusinessException(
        ErrorCode.IDEMPOTENCY_KEY_INVALID,
        `Idempotency-Key must not exceed ${MAX_KEY_LENGTH} characters`,
        400
      );
    }

    const scope = this.scopeKey(request, key);
    const resultKey = `idempotency:result:${scope}`;
    const lockKey = `idempotency:lock:${scope}`;
    const fingerprint = this.requestFingerprint(request);

    return from(this.redis.get(resultKey)).pipe(
      mergeMap((cached) => {
        if (cached) {
          const parsed = this.parseCachedResult(cached);
          if (parsed.fingerprint !== fingerprint) {
            return throwError(() => this.conflict());
          }
          void reply.header("idempotency-replay", "true");
          return of(parsed.body);
        }

        const lockToken = randomUUID();
        return from(this.redis.setNx(lockKey, lockToken, LOCK_TTL_SECONDS)).pipe(
          mergeMap((locked) => {
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

            const renewal = setInterval(
              () => {
                void this.redis.compareAndExpire(lockKey, lockToken, LOCK_TTL_SECONDS);
              },
              Math.floor((LOCK_TTL_SECONDS * 1_000) / 3)
            );
            renewal.unref();
            return next.handle().pipe(
              mergeMap((body) =>
                from(
                  this.redis.set(
                    resultKey,
                    JSON.stringify({ fingerprint, body } satisfies CachedResult),
                    RESULT_TTL_SECONDS
                  )
                ).pipe(map(() => body))
              ),
              map((body) => {
                void reply.header("idempotency-replay", "false");
                return body;
              }),
              catchError((error: unknown) => throwError(() => error)),
              finalize(() => {
                clearInterval(renewal);
                void this.redis.compareAndDelete(lockKey, lockToken);
              })
            );
          })
        );
      })
    );
  }

  private scopeKey(request: FastifyRequest, key: string): string {
    const userId = getRequestUserId() ?? "anonymous";
    const tenantId = getRequestTenantId() ?? "no-tenant";
    return createHash("sha256")
      .update(`${tenantId}\n${userId}\n${request.method}\n${request.url}\n${key}`)
      .digest("hex");
  }

  private requestFingerprint(request: FastifyRequest): string {
    return createHash("sha256")
      .update(JSON.stringify(request.body ?? null))
      .digest("hex");
  }

  private parseCachedResult(value: string): CachedResult {
    try {
      const parsed = JSON.parse(value) as Partial<CachedResult>;
      if (typeof parsed.fingerprint !== "string" || !("body" in parsed)) {
        throw new Error("invalid cached result");
      }
      return parsed as CachedResult;
    } catch {
      throw new BusinessException(
        ErrorCode.IDEMPOTENCY_KEY_INVALID,
        "Stored idempotency result is invalid",
        409
      );
    }
  }

  private conflict(): BusinessException {
    return new BusinessException(
      ErrorCode.IDEMPOTENCY_KEY_CONFLICT,
      "Idempotency-Key was already used with a different request",
      409
    );
  }
}
