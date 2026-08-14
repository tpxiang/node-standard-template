import { Injectable } from "@nestjs/common";
import type { ThrottlerStorage } from "@nestjs/throttler";
import { RedisService } from "./redis.service";

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: RedisService) {}
  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number
  ): Promise<{
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
  }> {
    const duration = blockDuration > 0 ? blockDuration : ttl;
    const result = await this.redis.incrementThrottle(`throttle:${key}`, ttl, limit, duration);
    return {
      totalHits: result.value,
      timeToExpire: Math.max(Math.ceil(result.ttlMs / 1_000), 0),
      isBlocked: result.isBlocked,
      timeToBlockExpire: Math.max(Math.ceil(result.blockTtlMs / 1_000), 0)
    };
  }
}
