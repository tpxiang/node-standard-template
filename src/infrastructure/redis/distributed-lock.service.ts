import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { BusinessException } from "../../common/exceptions/business.exception";
import { ErrorCode } from "../../common/constants/error-codes";
import { RedisService } from "./redis.service";

/**
 * Redis 分布式锁：SET NX + token 校验释放，避免误删他人锁。
 */
@Injectable()
export class DistributedLockService {
  constructor(private readonly redis: RedisService) {}

  async withLock<T>(
    resource: string,
    ttlSeconds: number,
    fn: () => Promise<T>
  ): Promise<T> {
    const key = `lock:${resource}`;
    const token = randomUUID();
    const acquired = await this.redis.setNx(key, token, ttlSeconds);
    if (!acquired) {
      throw new BusinessException(
        ErrorCode.LOCK_NOT_ACQUIRED,
        `Resource is locked: ${resource}`,
        409
      );
    }

    try {
      return await fn();
    } finally {
      await this.releaseIfOwned(key, token);
    }
  }

  private async releaseIfOwned(key: string, token: string): Promise<void> {
    const current = await this.redis.get(key);
    if (current === token) {
      await this.redis.del(key);
    }
  }
}
