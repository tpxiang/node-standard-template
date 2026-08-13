import { Global, Module } from "@nestjs/common";
import { RedisCoreModule } from "../redis/redis-core.module";
import { CacheService } from "./cache.service";

@Global()
@Module({
  imports: [RedisCoreModule],
  providers: [CacheService],
  exports: [CacheService]
})
export class CacheModule {}
