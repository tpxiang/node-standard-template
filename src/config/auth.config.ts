import { registerAs } from "@nestjs/config";
import { env } from "node:process";

export const authConfig = registerAs("auth", () => ({
  accessSecret: env.JWT_ACCESS_SECRET,
  refreshSecret: env.JWT_REFRESH_SECRET,
  accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN ?? "7d"
}));
