/** 全局数据库模块，导出 PrismaService 供各业务模块注入。 */
import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { UnitOfWorkService } from "./unit-of-work.service";

@Global()
@Module({
  providers: [PrismaService, UnitOfWorkService],
  exports: [PrismaService, UnitOfWorkService]
})
export class DatabaseModule {}
