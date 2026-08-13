import { registerAs } from "@nestjs/config";
import { env } from "node:process";

export const databaseConfig = registerAs("database", () => ({
  url: env.DATABASE_URL,
  provider: env.DATABASE_PROVIDER ?? "postgresql"
}));
