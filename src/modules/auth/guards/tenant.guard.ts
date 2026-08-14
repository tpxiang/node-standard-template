import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { setRequestTenantId } from "../../../common/context/request-context";
import { PrismaService } from "../../../database/prisma.service";
import type { AuthUser } from "../auth.types";

type TenantRequest = FastifyRequest & { user: AuthUser };

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const tenantId = request.headers["x-tenant-id"]?.toString().trim();
    if (!tenantId) throw new BadRequestException("X-Tenant-Id header is required");

    const member = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId: request.user.id } },
      include: {
        tenant: true,
        roles: {
          include: { role: { include: { permissions: { include: { permission: true } } } } }
        }
      }
    });
    if (!member || member.status !== "ACTIVE" || member.tenant.status !== "ACTIVE") {
      throw new ForbiddenException("Tenant membership is not active");
    }

    const tenantRoles = member.roles.filter(({ role }) => role.tenantId === tenantId);
    request.user.roles = tenantRoles.map(({ role }) => role.name);
    request.user.permissions = [
      ...new Set(
        tenantRoles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.code))
      )
    ];
    setRequestTenantId(tenantId);
    return true;
  }
}
