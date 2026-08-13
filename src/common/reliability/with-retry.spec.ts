import { describe, expect, it, vi } from "vitest";
import { withRetry } from "./with-retry";

describe("withRetry", () => {
  it("retries only when shouldRetry allows it", async () => {
    let calls = 0;
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      withRetry(
        async () => {
          calls += 1;
          if (calls < 3) throw new Error("temporary");
          return "ok";
        },
        { attempts: 3, initialDelayMs: 10, sleep, shouldRetry: () => true }
      )
    ).resolves.toBe("ok");

    expect(calls).toBe(3);
    expect(sleep).toHaveBeenCalledWith(10);
    expect(sleep).toHaveBeenCalledWith(20);
  });

  it("does not retry by default", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("permanent"));
    await expect(withRetry(operation, { attempts: 3 })).rejects.toThrow("permanent");
    expect(operation).toHaveBeenCalledOnce();
  });
});
