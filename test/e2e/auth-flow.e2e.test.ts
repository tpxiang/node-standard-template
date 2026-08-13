import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { env } from "node:process";
import { createTestApp, injectJson } from "../helpers/app";

const shouldRun = env.RUN_E2E === "1" || env.RUN_E2E === "true";

describe.runIf(shouldRun)("auth and users flow (e2e)", () => {
  let app: NestFastifyApplication;
  let accessToken = "";
  let refreshToken = "";

  beforeAll(async () => {
    app = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it("logs in with seeded admin", async () => {
    const response = await injectJson(app, {
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "admin@example.com",
        password: "ChangeMe123!"
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      success: boolean;
      data: { tokens: { accessToken: string; refreshToken: string } };
    };
    expect(body.success).toBe(true);
    accessToken = body.data.tokens.accessToken;
    refreshToken = body.data.tokens.refreshToken;
  });

  it("refreshes tokens", async () => {
    const response = await injectJson(app, {
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      data: { accessToken: string; refreshToken: string };
    };
    accessToken = body.data.accessToken;
    refreshToken = body.data.refreshToken;
  });

  it("creates a user and rejects unauthorized list access", async () => {
    const email = `noperm-${Date.now()}@example.com`;
    const create = await injectJson(app, {
      method: "POST",
      url: "/users",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        email,
        name: "No Perm",
        password: "ChangeMe123!"
      }
    });
    expect(create.statusCode).toBe(201);

    const login = await injectJson(app, {
      method: "POST",
      url: "/auth/login",
      payload: { email, password: "ChangeMe123!" }
    });
    expect(login.statusCode).toBe(200);
    const limitedToken = (login.json() as { data: { tokens: { accessToken: string } } }).data.tokens
      .accessToken;

    const denied = await injectJson(app, {
      method: "GET",
      url: "/users",
      headers: { authorization: `Bearer ${limitedToken}` }
    });
    expect(denied.statusCode).toBe(403);
  });

  it("blacklists access token after logout", async () => {
    const allowed = await injectJson(app, {
      method: "GET",
      url: "/users",
      headers: { authorization: `Bearer ${accessToken}` }
    });
    expect(allowed.statusCode).toBe(200);

    const logout = await injectJson(app, {
      method: "POST",
      url: "/auth/logout",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { refreshToken }
    });
    expect(logout.statusCode).toBe(200);

    const denied = await injectJson(app, {
      method: "GET",
      url: "/users",
      headers: { authorization: `Bearer ${accessToken}` }
    });
    expect(denied.statusCode).toBe(401);
  });
});

describe.skipIf(shouldRun)("auth and users flow (e2e skipped)", () => {
  it("skips unless RUN_E2E=1", () => {
    expect(true).toBe(true);
  });
});
