import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { HealthService } from "./health.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get("live")
  live(): { status: string } {
    return this.healthService.live();
  }

  @Get("startup")
  startup(): { status: string } {
    return this.healthService.startup();
  }

  @Get("ready")
  async ready(): Promise<{ status: string; checks: Record<string, string> }> {
    return this.healthService.ready();
  }
}
