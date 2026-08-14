import { Global, Module } from "@nestjs/common";
import { MetricsAuthGuard } from "./metrics-auth.guard";
import { MetricsController } from "./metrics.controller";
import { MetricsService } from "./metrics.service";

@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService, MetricsAuthGuard],
  exports: [MetricsService]
})
export class MetricsModule {}
