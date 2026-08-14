import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { clearInterval, setInterval } from "node:timers";
import { BusinessException } from "../../common/exceptions/business.exception";
import { ErrorCode } from "../../common/constants/error-codes";
import { RedisService } from "./redis.service";

export interface DistributedLockHandle {
  resource: string;
  token: string;
}

/** Redis 分布式锁：SET NX + token 校验释放/续期，避免误删他人锁。 */
@Injectable()
export class DistributedLockService {
  constructor(private readonly redis: RedisService) {}

  async acquire(resource: string, ttlSeconds: number): Promise<DistributedLockHandle | null> {
    const handle = { resource, token: randomUUID() };
    const acquired = await this.redis.setNx(this.key(resource), handle.token, ttlSeconds);
    return acquired ? handle : null;
  }

  release(handle: DistributedLockHandle): Promise<boolean> {
    return this.redis.compareAndDelete(this.key(handle.resource), handle.token);
  }

  renew(handle: DistributedLockHandle, ttlSeconds: number): Promise<boolean> {
    return this.redis.compareAndExpire(this.key(handle.resource), handle.token, ttlSeconds);
  }

  async withLock<T>(resource: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
    const handle = await this.acquire(resource, ttlSeconds);
    if (!handle) {
      throw new BusinessException(
        ErrorCode.LOCK_NOT_ACQUIRED,
        `Resource is locked: ${resource}`,
        409
      );
    }

    let renewalError: Error | undefined;
    const interval = setInterval(
      () => {
        void this.renew(handle, ttlSeconds)
          .then((renewed) => {
            if (!renewed) renewalError = new Error(`Lock lease lost: ${resource}`);
          })
          .catch((error: unknown) => {
            renewalError = error instanceof Error ? error : new Error(String(error));
          });
      },
      Math.max(1_000, Math.floor((ttlSeconds * 1_000) / 3))
    );
    interval.unref();
    try {
      const result = await fn();
      if (renewalError) throw renewalError;
      return result;
    } finally {
      clearInterval(interval);
      await this.release(handle);
    }
  }

  private key(resource: string): string {
    const normalized = resource.trim();
    if (!normalized) throw new Error("Lock resource cannot be empty");
    return `lock:${normalized}`;
  }
}
