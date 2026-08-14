import { describe, expect, it, vi } from "vitest";
import { HealthService } from "./health.service";

describe("HealthService", () => {
  it("returns ok for liveness", () => {
    const service = new HealthService({} as never, {} as never);

    expect(service.live()).toEqual({ status: "ok" });
  });

  it("checks dependencies during startup", async () => {
    const service = new HealthService(
      { $queryRaw: vi.fn().mockResolvedValue([{ result: 1 }]) } as never,
      { ping: vi.fn().mockResolvedValue("PONG") } as never
    );
    await expect(service.startup()).resolves.toEqual({
      status: "ok",
      checks: { database: "ok", redis: "ok" }
    });
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
