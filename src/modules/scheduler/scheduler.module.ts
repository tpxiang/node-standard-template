import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { HeartbeatJob } from "./heartbeat.job";

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [HeartbeatJob]
})
export class SchedulerModule {}
