/** 应用基础配置命名空间：app.* */
import { registerAs } from "@nestjs/config";
import { env } from "node:process";

export const appConfig = registerAs("app", () => ({
  env: env.NODE_ENV ?? "development",
  name: env.APP_NAME ?? "enterprise-node-backend",
  port: Number(env.APP_PORT ?? 3000),
  version: env.APP_VERSION ?? "0.1.0",
  logLevel: env.LOG_LEVEL ?? "info",
  throttleTtlSeconds: Number(env.THROTTLE_TTL_SECONDS ?? 60),
  throttleLimit: Number(env.THROTTLE_LIMIT ?? 120),
  corsOrigins: (env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
}));
