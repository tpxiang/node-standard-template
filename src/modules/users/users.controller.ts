/**
 * 用户接口。
 * 入参约定：GET 仅 Query；增删改仅 POST + Body；不使用 path / header 业务入参。
 */
import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { IdQueryDto } from "../../common/dto/id-query.dto";
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

  @Get("list")
  @Permissions("user:read")
  list(@Query() query: PaginationDto): Promise<unknown> {
    return this.usersService.list(query);
  }

  @Get("detail")
  @Permissions("user:read")
  findById(@Query() query: IdQueryDto): Promise<unknown> {
    return this.usersService.findById(query.id);
  }

  @Post("create")
  @Permissions("user:write")
  create(@Body() dto: CreateUserDto): Promise<{ id: string; email: string; name: string }> {
    return this.usersService.create(dto);
  }

  @Post("update")
  @Permissions("user:write")
  update(@Body() dto: UpdateUserDto): Promise<unknown> {
    return this.usersService.update(dto);
  }
}
