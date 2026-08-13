import { describe, expect, it, vi } from "vitest";
import { CacheService } from "./cache.service";

describe("CacheService", () => {
  it("serializes values and namespaces keys", async () => {
    const redis = { get: vi.fn().mockResolvedValue(null), set: vi.fn(), del: vi.fn() };
    const service = new CacheService(redis as never);

    await service.set("user:1", { id: "1" }, { namespace: "users", ttlSeconds: 60 });

    expect(redis.set).toHaveBeenCalledWith("cache:users:user:1", JSON.stringify({ id: "1" }), 60);
  });

  it("loads from cache before invoking factory", async () => {
    const redis = { get: vi.fn().mockResolvedValue(JSON.stringify({ value: 1 })), set: vi.fn() };
    const factory = vi.fn().mockResolvedValue({ value: 2 });
    const service = new CacheService(redis as never);

    await expect(
      service.getOrSet("key", factory, { namespace: "test", ttlSeconds: 60 })
    ).resolves.toEqual({ value: 1 });
    expect(factory).not.toHaveBeenCalled();
  });
});
