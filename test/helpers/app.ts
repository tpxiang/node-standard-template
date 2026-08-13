import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { HttpExceptionFilter } from "../../src/common/filters/http-exception.filter";
import { ResponseInterceptor } from "../../src/common/interceptors/response.interceptor";

export async function createTestApp(): Promise<NestFastifyApplication> {
  const { AppModule } = await import("../../src/app.module");
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: false
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

export async function injectJson(
  app: NestFastifyApplication,
  options: {
    method: "GET" | "POST" | "PATCH";
    url: string;
    payload?: Record<string, unknown> | string;
    headers?: Record<string, string>;
  }
): Promise<{ statusCode: number; json: () => unknown }> {
  const response = await app.inject({
    method: options.method,
    url: options.url,
    payload: options.payload as never,
    headers: {
      "content-type": "application/json",
      ...options.headers
    }
  });

  return {
    statusCode: response.statusCode,
    json: () => {
      try {
        return JSON.parse(response.body) as unknown;
      } catch {
        return response.body;
      }
    }
  };
}
