import { describe, expect, it, vi } from "vitest";
import { firstValueFrom } from "rxjs";
import { IdempotencyInterceptor } from "./idempotency.interceptor";

describe("IdempotencyInterceptor", () => {
  it("rejects a concurrent request", async () => {
    const redis = { get: vi.fn().mockResolvedValue(null), setNx: vi.fn().mockResolvedValue(false) };
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: "POST",
          url: "/users/create",
          body: {},
          headers: { "idempotency-key": "key" }
        }),
        getResponse: () => ({ header: vi.fn() })
      })
    };
    await expect(
      firstValueFrom(
        new IdempotencyInterceptor(redis as never).intercept(
          context as never,
          { handle: vi.fn() } as never
        )
      )
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_IN_PROGRESS" });
  });
});
