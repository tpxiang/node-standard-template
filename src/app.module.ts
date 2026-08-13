/**
 * 根模块：装配配置、限流、日志、基础设施与业务模块。
 * ThrottlerGuard 作为全局守卫，接口级可用 @Throttle 覆盖更严策略。
 */
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { env } from "node:process";
import { appConfig } from "./config/app.config";
import { authConfig } from "./config/auth.config";
import { databaseConfig } from "./config/database.config";
import { redisConfig } from "./config/redis.config";
import { validateEnv } from "./config/env.validation";
import { DatabaseModule } from "./database/database.module";
import { RedisModule } from "./infrastructure/redis/redis.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { RolesModule } from "./modules/roles/roles.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, authConfig, databaseConfig, redisConfig],
      validate: validateEnv
    }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(env.THROTTLE_TTL_SECONDS ?? 60) * 1000,
        limit: Number(env.THROTTLE_LIMIT ?? 120)
      }
    ]),
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.LOG_LEVEL ?? "info",
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
    }),
    DatabaseModule,
    RedisModule,
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
    }
  ]
})
export class AppModule {}
