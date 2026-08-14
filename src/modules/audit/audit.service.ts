/**
 * 审计日志服务：记录关键业务动作（如登录）。
 * 建议后续按业务扩展 action / resource 约定，便于检索与合规审计。
 */
import { Injectable } from "@nestjs/common";
import { Prisma, AuditLog } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { getRequestContext } from "../../common/context/request-context";

export const AUDIT_ACTIONS = ["LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE", "ASSIGN_ROLE"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditResource = "AUTH" | "USER" | "ROLE" | "PERMISSION" | "SYSTEM";

export interface CreateAuditLogInput {
  actorId?: string;
  action: AuditAction;
  resource: AuditResource;
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
    const context = getRequestContext();
    return this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        metadata: input.metadata,
        ip: input.ip ?? context?.clientIp,
        userAgent: input.userAgent ?? context?.userAgent,
        requestId: input.requestId ?? context?.requestId
      }
    });
  }
}
