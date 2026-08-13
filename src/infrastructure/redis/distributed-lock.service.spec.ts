import { describe, expect, it, vi } from "vitest";
import { DistributedLockService } from "./distributed-lock.service";

describe("DistributedLockService", () => {
  it("releases only with the lock token through an atomic operation", async () => {
    const redis = {
      setNx: vi.fn().mockResolvedValue(true),
      compareAndDelete: vi.fn().mockResolvedValue(true)
    };
    const service = new DistributedLockService(redis as never);

    await expect(service.withLock("resource", 10, async () => "ok")).resolves.toBe("ok");
    expect(redis.compareAndDelete).toHaveBeenCalledWith("lock:resource", expect.any(String));
  });
});
