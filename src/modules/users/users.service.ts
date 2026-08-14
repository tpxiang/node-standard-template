import { Injectable } from "@nestjs/common";
import { Prisma, UserStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
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
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { requireRequestTenantId } from "../../common/context/request-context";

const userPublicSelect = {
  id: true,
  email: true,
  name: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true
} as const;

const USER_SORT_FIELDS = new Set(["createdAt", "email", "name"]);

type PublicUser = {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PaginationDto): Promise<PageResult<PublicUser>> {
    const tenantId = requireRequestTenantId();
    // 不使用 PostgreSQL 专有的 mode:insensitive，保证 main/mysql 业务代码一致。
    const where = {
      tenantMembers: { some: { tenantId, status: "ACTIVE" as const } },
      ...(query.keyword
        ? {
            OR: [{ email: { contains: query.keyword } }, { name: { contains: query.keyword } }]
          }
        : {})
    };

    const sortBy = resolveSortField(query.sortBy, USER_SORT_FIELDS, "createdAt");
    const { skip, take } = pageOffset(query);

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: userPublicSelect,
        orderBy: { [sortBy]: query.sortOrder },
        skip,
        take
      }),
      this.prisma.user.count({ where })
    ]);

    return toPageResult(items, total, query);
  }

  async findById(id: string): Promise<PublicUser> {
    const tenantId = requireRequestTenantId();
    const user = await this.prisma.user.findFirst({
      where: { id, tenantMembers: { some: { tenantId, status: "ACTIVE" } } },
      select: userPublicSelect
    });
    if (!user) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, "User not found", 404);
    }
    return user;
  }

  async create(dto: CreateUserDto): Promise<{ id: string; email: string; name: string }> {
    const tenantId = requireRequestTenantId();
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new BusinessException(ErrorCode.USER_ALREADY_EXISTS, "User already exists", 409);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { email: dto.email, name: dto.name, passwordHash },
          select: { id: true, email: true, name: true }
        });
        await tx.tenantMember.create({ data: { tenantId, userId: user.id } });
        return user;
      });
    } catch (error) {
      // The pre-check is only a fast path; the database unique index is the concurrency guard.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BusinessException(ErrorCode.USER_ALREADY_EXISTS, "User already exists", 409);
      }
      throw error;
    }
  }

  async update(dto: UpdateUserDto): Promise<PublicUser> {
    await this.findById(dto.id);
    return this.prisma.user.update({
      where: { id: dto.id },
      data: { name: dto.name },
      select: userPublicSelect
    });
  }
}
