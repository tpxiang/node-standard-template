/**
 * 启动期环境变量校验。
 * 校验失败直接阻止应用启动，避免带着错误配置上线。
 * @Type(() => Number) 确保来自 env 的数字字符串能通过 IsInt。
 */
import { plainToInstance, Type } from "class-transformer";
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min, validateSync } from "class-validator";

class EnvironmentVariables {
  @IsIn(["development", "test", "staging", "production"])
  NODE_ENV = "development";

  @IsString()
  @IsNotEmpty()
  APP_NAME = "enterprise-node-backend";

  @Type(() => Number)
  @IsInt()
  @Min(1)
  APP_PORT = 3000;

  @IsString()
  @IsNotEmpty()
  APP_VERSION = "0.1.0";

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  /** main 默认 postgresql；mysql 分支应改为 mysql */
  @IsIn(["postgresql", "mysql"])
  DATABASE_PROVIDER = "postgresql";

  @IsString()
  @IsNotEmpty()
  REDIS_HOST = "localhost";

  @Type(() => Number)
  @IsInt()
  @Min(1)
  REDIS_PORT = 6379;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  REDIS_DB = 0;

  @IsOptional()
  @IsString()
  REDIS_KEY_PREFIX?: string;

  @Type(() => Number)
  @IsInt()
  @Min(100)
  REDIS_CONNECT_TIMEOUT_MS = 2000;

  @Type(() => Number)
  @IsInt()
  @Min(100)
  REDIS_COMMAND_TIMEOUT_MS = 2000;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_EXPIRES_IN = "15m";

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_EXPIRES_IN = "7d";

  @IsString()
  @IsNotEmpty()
  CORS_ORIGINS = "http://localhost:3000";

  @IsString()
  @IsNotEmpty()
  LOG_LEVEL = "info";

  @Type(() => Number)
  @IsInt()
  @Min(1)
  THROTTLE_TTL_SECONDS = 60;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT = 120;

  @IsString()
  @IsNotEmpty()
  METRICS_ENABLED = "true";

  @IsOptional()
  @IsString()
  METRICS_TOKEN?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true
  });
  const errors = validateSync(validated, {
    skipMissingProperties: false
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  if (validated.NODE_ENV === "production") {
    const insecure: string[] = [];
    if (
      validated.JWT_ACCESS_SECRET.length < 32 ||
      /^(change-me|replace-with|your[-_])/i.test(validated.JWT_ACCESS_SECRET)
    )
      insecure.push("JWT_ACCESS_SECRET must contain at least 32 characters");
    if (
      validated.JWT_REFRESH_SECRET.length < 32 ||
      /^(change-me|replace-with|your[-_])/i.test(validated.JWT_REFRESH_SECRET)
    )
      insecure.push("JWT_REFRESH_SECRET must contain at least 32 characters");
    if (validated.CORS_ORIGINS.split(",").some((origin) => origin.trim() === "*"))
      insecure.push("CORS_ORIGINS must not contain '*' in production");
    if (validated.METRICS_ENABLED.toLowerCase() !== "false" && !validated.METRICS_TOKEN)
      insecure.push("METRICS_TOKEN is required when metrics are enabled in production");
    if (insecure.length > 0) throw new Error(insecure.join("; "));
  }

  return validated;
}
