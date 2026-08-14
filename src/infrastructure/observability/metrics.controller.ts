import { Controller, Get, Header, UseGuards } from "@nestjs/common";
import { MetricsAuthGuard } from "./metrics-auth.guard";
import { MetricsService } from "./metrics.service";

@Controller("metrics")
@UseGuards(MetricsAuthGuard)
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}
  @Get()
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  metricsBody(): Promise<string> {
    return this.metrics.render();
  }
}
