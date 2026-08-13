import { describe, expect, it, vi } from "vitest";
import { HealthService } from "./health.service";

describe("HealthService", () => {
  it("returns ok for liveness", () => {
    const service = new HealthService({} as never, {} as never);

    expect(service.live()).toEqual({ status: "ok" });
  });

  it("returns ok for startup", () => {
    const service = new HealthService({} as never, {} as never);

    expect(service.startup()).toEqual({ status: "ok" });
  });

  it("reports dependency status", async () => {
    const prisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ result: 1 }])
    };
    const redis = {
      ping: vi.fn().mockResolvedValue("PONG")
    };
    const service = new HealthService(prisma as never, redis as never);

    await expect(service.ready()).resolves.toEqual({
      status: "ok",
      checks: {
        database: "ok",
        redis: "ok"
      }
    });
  });
});
