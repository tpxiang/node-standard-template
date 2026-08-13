import { Controller, Get, INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

@Controller("health")
class TestHealthController {
  @Get("live") live(): { status: string } {
    return { status: "ok" };
  }
}

describe("HTTP health flow", () => {
  let app: INestApplication;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TestHealthController]
    }).compile();
    app = await moduleRef.createNestApplication(new FastifyAdapter()).init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(async () => {
    await app.close();
  });
  it("serves liveness over HTTP", async () => {
    const response = await request(app.getHttpServer()).get("/health/live").expect(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
