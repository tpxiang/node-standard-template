import { describe, expect, it, vi } from "vitest";
import { setTimeout as sleep } from "node:timers/promises";
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

  it("renews a lock while the protected operation is running", async () => {
    const redis = {
      setNx: vi.fn().mockResolvedValue(true),
      compareAndExpire: vi.fn().mockResolvedValue(true),
      compareAndDelete: vi.fn().mockResolvedValue(true)
    };
    const service = new DistributedLockService(redis as never);
    let finish!: () => void;
    const operation = service.withLock(
      "resource",
      3,
      () => new Promise<void>((resolve) => (finish = resolve))
    );
    await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    await sleep(1_050);
    expect(redis.compareAndExpire).toHaveBeenCalledWith("lock:resource", expect.any(String), 3);
    finish();
    await operation;
  });
});
