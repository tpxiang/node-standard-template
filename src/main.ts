/**
 * 应用启动入口。
 * 负责装配全局中间件、校验、异常处理、请求 ID、Swagger（非生产）与监听端口。
 */
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import helmet from "@fastify/helmet";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { randomUUID } from "node:crypto";
import { env } from "node:process";
import { AppModule } from "./app.module";
import { requestContext } from "./common/context/request-context";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap(): Promise<void> {
  // bufferLogs：在 nestjs-pino 就绪前缓存启动日志，避免丢失上下文。
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true
  });

  const configService = app.get(ConfigService);
  const logger = new Logger("Bootstrap");

  await app.register(helmet, {
    // Swagger UI 需要内联脚本/样式，生产关闭 docs 后仍可按需收紧 CSP。
    contentSecurityPolicy: false
  });

  const corsOrigins = configService.getOrThrow<string[]>("app.corsOrigins");
  app.enableCors({
    origin: corsOrigins,
    credentials: true
  });

  // whitelist + forbidNonWhitelisted：只接受 DTO 声明字段，拒绝未知属性。
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  // requestId 写入 ALS，供审计/日志/业务代码无感读取。
  app
    .getHttpAdapter()
    .getInstance()
    .addHook("onRequest", (request, reply, done) => {
      const requestId = request.headers["x-request-id"]?.toString() ?? randomUUID();
      request.headers["x-request-id"] = requestId;
      reply.header("x-request-id", requestId);
      requestContext.run(
        {
          requestId,
          clientIp: request.ip,
          userAgent: request.headers["user-agent"]
        },
        () => done()
      );
    });

  // 生产环境不暴露 Swagger，降低接口面泄露风险。
  const nodeEnv = configService.get<string>("NODE_ENV") ?? env.NODE_ENV ?? "development";
  if (nodeEnv !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Enterprise Node Backend")
      .setDescription("Standard enterprise Node.js backend API")
      .setVersion(configService.getOrThrow<string>("app.version"))
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("docs", app, document);
  }

  const port = configService.getOrThrow<number>("app.port");
  await app.listen(port, "0.0.0.0");
  logger.log(`Application started on port ${port}`);
}

void bootstrap();
