import { Global, Module } from "@nestjs/common";
import { CacheModule } from "../cache/cache.module";
import { DistributedLockService } from "./distributed-lock.service";
import { RedisCoreModule } from "./redis-core.module";
import { RedisThrottlerStorage } from "./redis-throttler.storage";

@Global()
@Module({
  imports: [RedisCoreModule, CacheModule],
  providers: [DistributedLockService, RedisThrottlerStorage],
  exports: [RedisCoreModule, DistributedLockService, RedisThrottlerStorage, CacheModule]
})
export class RedisModule {}
