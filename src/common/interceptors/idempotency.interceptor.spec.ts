import { describe, expect, it, vi } from "vitest";
import { firstValueFrom } from "rxjs";
import { IdempotencyInterceptor } from "./idempotency.interceptor";
import { requestContext } from "../context/request-context";

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

  it("isolates the same idempotency key between tenants", async () => {
    const redis = { get: vi.fn().mockResolvedValue(null), setNx: vi.fn().mockResolvedValue(false) };
    const request = {
      method: "POST",
      url: "/users/create",
      body: {},
      headers: { "idempotency-key": "key" }
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ header: vi.fn() })
      })
    };
    const interceptor = new IdempotencyInterceptor(redis as never);

    requestContext.enterWith({ requestId: "request-a", userId: "user-1", tenantId: "tenant-a" });
    await expect(
      firstValueFrom(interceptor.intercept(context as never, { handle: vi.fn() } as never))
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_IN_PROGRESS" });
    const tenantAKey = redis.get.mock.calls[0][0];

    requestContext.enterWith({ requestId: "request-b", userId: "user-1", tenantId: "tenant-b" });
    await expect(
      firstValueFrom(interceptor.intercept(context as never, { handle: vi.fn() } as never))
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_IN_PROGRESS" });

    expect(tenantAKey).not.toBe(redis.get.mock.calls[1][0]);
  });
});
