/**
 * 根模块：装配配置、限流、日志、基础设施与业务模块。
 * ThrottlerGuard 作为全局守卫，接口级可用 @Throttle 覆盖更严策略。
 */
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { appConfig } from "./config/app.config";
import { authConfig } from "./config/auth.config";
import { databaseConfig } from "./config/database.config";
import { observabilityConfig } from "./config/observability.config";
import { redisConfig } from "./config/redis.config";
import { validateEnv } from "./config/env.validation";
import { IdempotencyInterceptor } from "./common/interceptors/idempotency.interceptor";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { DatabaseModule } from "./database/database.module";
import { RedisModule } from "./infrastructure/redis/redis.module";
import { RedisThrottlerStorage } from "./infrastructure/redis/redis-throttler.storage";
import { HttpMetricsInterceptor } from "./infrastructure/observability/http-metrics.interceptor";
import { MetricsModule } from "./infrastructure/observability/metrics.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { RolesModule } from "./modules/roles/roles.module";
import { SchedulerModule } from "./modules/scheduler/scheduler.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, authConfig, databaseConfig, redisConfig, observabilityConfig],
      validate: validateEnv
    }),
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisThrottlerStorage, ConfigService],
      useFactory: (storage: RedisThrottlerStorage, config: ConfigService) => ({
        storage,
        throttlers: [
          {
            ttl: config.getOrThrow<number>("app.throttleTtlSeconds") * 1000,
            limit: config.getOrThrow<number>("app.throttleLimit")
          }
        ]
      })
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.getOrThrow<string>("app.logLevel"),
          // 敏感字段脱敏，避免 access/refresh token、密码进入日志。
          redact: {
            paths: [
              "req.headers.authorization",
              "req.headers.cookie",
              "res.headers.set-cookie",
              "password",
              "accessToken",
              "refreshToken"
            ],
            censor: "[REDACTED]"
          },
          customProps: (req) => ({
            requestId: req.headers["x-request-id"]
          })
        }
      })
    }),
    DatabaseModule,
    RedisModule,
    MetricsModule,
    SchedulerModule,
    HealthModule,
    AuditModule,
    RolesModule,
    UsersModule,
    AuthModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor
    }
  ]
})
export class AppModule {}
