import { Injectable } from "@nestjs/common";
import { Prisma, Role } from "@prisma/client";
import { BusinessException } from "../../common/exceptions/business.exception";
import { ErrorCode } from "../../common/constants/error-codes";
import {
  PageResult,
  PaginationDto,
  pageOffset,
  resolveSortField,
  toPageResult
} from "../../common/dto/pagination.dto";
import { PrismaService } from "../../database/prisma.service";

const ROLE_SORT_FIELDS = new Set(["name", "createdAt"]);

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PaginationDto): Promise<PageResult<Role>> {
    const where = query.keyword
      ? {
          OR: [{ name: { contains: query.keyword } }, { description: { contains: query.keyword } }]
        }
      : {};

    const sortBy = resolveSortField(query.sortBy, ROLE_SORT_FIELDS, "name");
    const { skip, take } = pageOffset(query);

    const [items, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        orderBy: { [sortBy]: query.sortOrder },
        skip,
        take
      }),
      this.prisma.role.count({ where })
    ]);

    return toPageResult(items, total, query);
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

  /** 幂等赋权：已存在则 no-op。模板未提供撤权 API，需按业务补齐。 */
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
