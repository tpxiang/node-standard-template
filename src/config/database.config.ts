/**
 * 数据库配置命名空间：database.*
 * provider 由分支决定：main=postgresql，mysql 分支=mysql。
 */
import { registerAs } from "@nestjs/config";
import { env } from "node:process";

export const databaseConfig = registerAs("database", () => ({
  url: env.DATABASE_URL,
  provider: env.DATABASE_PROVIDER ?? "postgresql"
}));
