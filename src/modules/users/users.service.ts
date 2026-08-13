import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { BusinessException } from "../../common/exceptions/business.exception";
import { ErrorCode } from "../../common/constants/error-codes";
import { PrismaService } from "../../database/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
}
