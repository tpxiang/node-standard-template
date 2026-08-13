import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { BusinessException } from "../../common/exceptions/business.exception";
import { ErrorCode } from "../../common/constants/error-codes";
import { PrismaService } from "../../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AccessTokenPayload, AuthUser } from "./auth.types";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService
  ) {}

  async login(dto: LoginDto, requestId?: string): Promise<{ accessToken: string; user: AuthUser }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (
      !user ||
      user.status !== "ACTIVE" ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    ) {
      throw new BusinessException(ErrorCode.INVALID_CREDENTIALS, "Invalid email or password", 401);
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      roles: user.roles.map(({ role }) => role.name),
      permissions: user.roles.flatMap(({ role }) =>
        role.permissions.map(({ permission }) => permission.code)
      )
    };

    const payload: AccessTokenPayload = {
      sub: authUser.id,
      email: authUser.email,
      roles: authUser.roles,
      permissions: authUser.permissions,
      type: "access"
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>("auth.accessSecret"),
      expiresIn: this.configService.getOrThrow<string>("auth.accessExpiresIn")
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });
    await this.auditService.create({
      actorId: user.id,
      action: "LOGIN",
      resource: "AUTH",
      requestId
    });

    return { accessToken, user: authUser };
  }
}
