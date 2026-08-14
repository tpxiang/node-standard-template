import { BadRequestException } from "@nestjs/common";
import { lastValueFrom, of, throwError } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { HttpMetricsInterceptor } from "./http-metrics.interceptor";

const context = () => ({
  switchToHttp: () => ({
    getRequest: () => ({ method: "GET", url: "/users?x=1", routeOptions: { url: "/users" } }),
    getResponse: () => ({ statusCode: 200 })
  })
});

describe("HttpMetricsInterceptor", () => {
  it("records successful requests", async () => {
    const metrics = { observeHttp: vi.fn() };
    await lastValueFrom(
      new HttpMetricsInterceptor(metrics as never).intercept(
        context() as never,
        { handle: () => of({ ok: true }) } as never
      )
    );
    expect(metrics.observeHttp).toHaveBeenCalledWith("GET", "/users", 200, expect.any(Number));
  });

  it("records HttpException status", async () => {
    const metrics = { observeHttp: vi.fn() };
    await expect(
      lastValueFrom(
        new HttpMetricsInterceptor(metrics as never).intercept(
          context() as never,
          { handle: () => throwError(() => new BadRequestException()) } as never
        )
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(metrics.observeHttp).toHaveBeenCalledWith("GET", "/users", 400, expect.any(Number));
  });
});
