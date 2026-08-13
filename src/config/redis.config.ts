import { registerAs } from "@nestjs/config";
import { env } from "node:process";

export const redisConfig = registerAs("redis", () => ({
  host: env.REDIS_HOST ?? "localhost",
  port: Number(env.REDIS_PORT ?? 6379),
  password: env.REDIS_PASSWORD || undefined,
  db: Number(env.REDIS_DB ?? 0)
}));
