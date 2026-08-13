import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
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
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.LOG_LEVEL ?? "info",
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
  ]
})
export class AppModule {}
