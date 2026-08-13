import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import helmet from "@fastify/helmet";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { randomUUID } from "node:crypto";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";

async function bootstrap(): Promise<void> {
  // 在 nestjs-pino 就绪前缓存日志，避免启动失败时丢失上下文。
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true
  });

  const configService = app.get(ConfigService);
  const logger = new Logger("Bootstrap");

  await app.register(helmet);

  const corsOrigins = configService.getOrThrow<string[]>("app.corsOrigins");
  app.enableCors({
    origin: corsOrigins,
    credentials: true
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
  app.enableShutdownHooks();

  // 统一请求 ID，贯穿响应头、日志、链路追踪和错误响应。
  app
    .getHttpAdapter()
    .getInstance()
    .addHook("onRequest", async (request, reply) => {
      const requestId = request.headers["x-request-id"]?.toString() ?? randomUUID();
      request.headers["x-request-id"] = requestId;
      reply.header("x-request-id", requestId);
    });

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Enterprise Node Backend")
    .setDescription("Standard enterprise Node.js backend API")
    .setVersion(configService.getOrThrow<string>("app.version"))
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  const port = configService.getOrThrow<number>("app.port");
  await app.listen(port, "0.0.0.0");
  logger.log(`Application started on port ${port}`);
}

void bootstrap();
