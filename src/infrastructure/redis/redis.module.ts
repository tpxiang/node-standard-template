import { Global, Module } from "@nestjs/common";
import { CacheModule } from "../cache/cache.module";
import { DistributedLockService } from "./distributed-lock.service";
import { RedisCoreModule } from "./redis-core.module";

@Global()
@Module({
  imports: [RedisCoreModule, CacheModule],
  providers: [DistributedLockService],
  exports: [RedisCoreModule, DistributedLockService, CacheModule]
})
export class RedisModule {}
