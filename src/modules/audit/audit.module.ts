/** 全局审计模块，供认证等业务写入操作日志。 */
import { Global, Module } from "@nestjs/common";
import { AuditService } from "./audit.service";

@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService]
})
export class AuditModule {}
