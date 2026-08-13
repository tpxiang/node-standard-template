/** Prisma 事务工作单元：统一事务入口，便于后续加入超时、重试和事务事件收集。 */
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";

export type TransactionClient = Prisma.TransactionClient;
export type TransactionCallback<T> = (tx: TransactionClient) => Promise<T>;

@Injectable()
export class UnitOfWorkService {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(callback: TransactionCallback<T>): Promise<T> {
    return this.prisma.$transaction(callback);
  }
}
