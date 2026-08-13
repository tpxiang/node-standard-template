import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { RedisService } from "../../infrastructure/redis/redis.service";

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  live(): { status: string } {
    return { status: "ok" };
  }

  startup(): { status: string } {
    return { status: "ok" };
  }

  async ready(): Promise<{ status: string; checks: Record<string, string> }> {
    const checks: Record<string, string> = {};

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = "ok";
    } catch {
      checks.database = "failed";
    }

    try {
      await this.redis.ping();
      checks.redis = "ok";
    } catch {
      checks.redis = "failed";
    }

    const status = Object.values(checks).every((value) => value === "ok") ? "ok" : "failed";
    if (status !== "ok") {
      throw new ServiceUnavailableException({
        status,
        checks
      });
    }

    return { status, checks };
  }
}
