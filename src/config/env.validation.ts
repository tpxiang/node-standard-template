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

  return validated;
}
