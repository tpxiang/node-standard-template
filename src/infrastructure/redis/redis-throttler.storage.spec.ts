import { describe, expect, it, vi } from "vitest";
import { RedisThrottlerStorage } from "./redis-throttler.storage";

describe("RedisThrottlerStorage", () => {
  it("marks a key blocked after the shared Redis limit is exceeded", async () => {
    const redis = {
      incrementThrottle: vi
        .fn()
        .mockResolvedValue({ value: 3, ttlMs: 0, blockTtlMs: 1_000, isBlocked: true })
    };
    const storage = new RedisThrottlerStorage(redis as never);
    await expect(storage.increment("client", 1000, 2, 1000)).resolves.toEqual({
      totalHits: 3,
      timeToExpire: 0,
      isBlocked: true,
      timeToBlockExpire: 1
    });
    expect(redis.incrementThrottle).toHaveBeenCalledWith("throttle:client", 1000, 2, 1000);
  });
});
