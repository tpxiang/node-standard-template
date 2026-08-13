import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BusinessException } from "../../common/exceptions/business.exception";
import { ErrorCode } from "../../common/constants/error-codes";
import { DistributedLockService } from "../../infrastructure/redis/distributed-lock.service";

/** 定时任务骨架示例：带分布式锁的心跳日志。 */
@Injectable()
export class HeartbeatJob {
  private readonly logger = new Logger(HeartbeatJob.name);

  constructor(private readonly lock: DistributedLockService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    try {
      await this.lock.withLock("cron:heartbeat", 50, async () => {
        this.logger.debug("scheduler heartbeat");
      });
    } catch (error) {
      if (error instanceof BusinessException && error.code === ErrorCode.LOCK_NOT_ACQUIRED) {
        return;
      }
      this.logger.warn({ err: error }, "Heartbeat job failed");
    }
  }
}
