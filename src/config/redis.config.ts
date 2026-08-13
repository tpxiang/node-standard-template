/** Redis 配置命名空间：redis.* */
import { registerAs } from "@nestjs/config";
import { env } from "node:process";

export const redisConfig = registerAs("redis", () => ({
  host: env.REDIS_HOST ?? "localhost",
  port: Number(env.REDIS_PORT ?? 6379),
  password: env.REDIS_PASSWORD || undefined,
  db: Number(env.REDIS_DB ?? 0),
  keyPrefix: env.REDIS_KEY_PREFIX ?? "enterprise:",
  connectTimeoutMs: Number(env.REDIS_CONNECT_TIMEOUT_MS ?? 2000),
  commandTimeoutMs: Number(env.REDIS_COMMAND_TIMEOUT_MS ?? 2000)
}));
