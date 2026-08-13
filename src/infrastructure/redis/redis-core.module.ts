import { Global, Module } from "@nestjs/common";
import { RedisService } from "./redis.service";

/** Redis 原始客户端模块，供缓存、锁、队列等上层能力复用。 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService]
})
export class RedisCoreModule {}
