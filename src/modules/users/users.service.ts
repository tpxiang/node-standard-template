import { Injectable } from "@nestjs/common";
import { UserStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { BusinessException } from "../../common/exceptions/business.exception";
import { ErrorCode } from "../../common/constants/error-codes";
import { PageResult, PaginationDto } from "../../common/dto/pagination.dto";
import { PrismaService } from "../../database/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

const userPublicSelect = {
  id: true,
  email: true,
  name: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true
} as const;

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
    // 不使用 PostgreSQL 专有的 mode:insensitive，保证 main/mysql 业务代码一致。
    const where = query.keyword
      ? {
          OR: [{ email: { contains: query.keyword } }, { name: { contains: query.keyword } }]
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: userPublicSelect,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prisma.user.count({ where })
    ]);

    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize
    };
  }

  async findById(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userPublicSelect
    });
    if (!user) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, "User not found", 404);
    }
    return user;
  }

  async create(dto: CreateUserDto): Promise<{ id: string; email: string; name: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new BusinessException(ErrorCode.USER_ALREADY_EXISTS, "User already exists", 409);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<PublicUser> {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        status: dto.status
      },
      select: userPublicSelect
    });
  }
}
