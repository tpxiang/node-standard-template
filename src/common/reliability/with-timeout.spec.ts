import { describe, expect, it } from "vitest";
import { setTimeout } from "node:timers";
import { withTimeout } from "./with-timeout";

describe("withTimeout", () => {
  it("returns the operation result before timeout", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 100)).resolves.toBe("ok");
  });

  it("rejects when the operation exceeds timeout", async () => {
    const operation = new Promise<string>((resolve) => setTimeout(() => resolve("late"), 50));
    await expect(withTimeout(operation, 5)).rejects.toThrow("timed out");
  });
});
