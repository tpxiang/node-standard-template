/**
 * 健康检查服务。
 * live/startup 仅表示进程存活；ready 探测数据库与 Redis 依赖。
 */
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { RedisService } from "../../infrastructure/redis/redis.service";

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  /** 存活探针：进程在即可。 */
  live(): { status: string } {
    return { status: "ok" };
  }

  /** 启动探针：模板中与 live 同语义，可按需扩展初始化就绪条件。 */
  startup(): { status: string } {
    return { status: "ok" };
  }

  /** 就绪探针：依赖不可用时返回 503，供 K8s 摘除流量。 */
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
