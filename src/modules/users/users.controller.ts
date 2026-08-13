/**
 * 用户接口。类级挂载 JWT + 权限守卫，方法级声明所需权限码。
 */
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions("user:read")
  list(@Query() query: PaginationDto): Promise<unknown> {
    return this.usersService.list(query);
  }

  @Get(":id")
  @Permissions("user:read")
  findById(@Param("id") id: string): Promise<unknown> {
    return this.usersService.findById(id);
  }

  @Post()
  @Permissions("user:write")
  create(@Body() dto: CreateUserDto): Promise<{ id: string; email: string; name: string }> {
    return this.usersService.create(dto);
  }

  @Patch(":id")
  @Permissions("user:write")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto): Promise<unknown> {
    return this.usersService.update(id, dto);
  }
}
