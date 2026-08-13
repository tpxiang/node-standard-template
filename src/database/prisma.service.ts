import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // 模块启动时主动连接数据库，让就绪检查能尽早暴露连接问题。
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  // Nest 关闭时释放连接池，避免发布或重启时进程挂起。
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
