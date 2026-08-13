/**
 * 审计日志服务：记录关键业务动作（如登录）。
 * 建议后续按业务扩展 action / resource 约定，便于检索与合规审计。
 */
import { Injectable } from "@nestjs/common";
import { Prisma, AuditLog } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";

export interface CreateAuditLogInput {
  actorId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Prisma.InputJsonValue;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateAuditLogInput): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        metadata: input.metadata,
        ip: input.ip,
        userAgent: input.userAgent,
        requestId: input.requestId
      }
    });
  }
}
