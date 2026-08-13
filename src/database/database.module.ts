/** 全局数据库模块，导出 PrismaService 供各业务模块注入。 */
import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService]
})
export class DatabaseModule {}
