import { Injectable } from "@nestjs/common";
import { Prisma, Role } from "@prisma/client";
import { BusinessException } from "../../common/exceptions/business.exception";
import { ErrorCode } from "../../common/constants/error-codes";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<Role[]> {
    return this.prisma.role.findMany({
      orderBy: { name: "asc" }
    });
  }

  async findById(id: string): Promise<
    Role & {
      permissions: Array<{ permission: { id: string; code: string; description: string | null } }>;
    }
  > {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: {
              select: { id: true, code: true, description: true }
            }
          }
        }
      }
    });
    if (!role) {
      throw new BusinessException(ErrorCode.ROLE_NOT_FOUND, "Role not found", 404);
    }
    return role;
  }

  async assignUser(userId: string, roleId: string): Promise<{ userId: string; roleId: string }> {
    const [user, role] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      this.prisma.role.findUnique({ where: { id: roleId }, select: { id: true } })
    ]);

    if (!user) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, "User not found", 404);
    }
    if (!role) {
      throw new BusinessException(ErrorCode.ROLE_NOT_FOUND, "Role not found", 404);
    }

    try {
      await this.prisma.userRole.upsert({
        where: {
          userId_roleId: { userId, roleId }
        },
        update: {},
        create: { userId, roleId }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new BusinessException(ErrorCode.USER_NOT_FOUND, "User or role not found", 404);
      }
      throw error;
    }

    return { userId, roleId };
  }
}
