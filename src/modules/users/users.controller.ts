import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { TenantGuard } from "../auth/guards/tenant.guard";
import { IdQueryDto } from "../../common/dto/id-query.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";
import {
  ApiIdempotencyKey,
  ApiStandardContract
} from "../../common/decorators/api-contract.decorator";

/**
 * 入参约定：GET 仅 Query；增删改仅 POST + Body。
 */
@ApiTags("users")
@ApiBearerAuth()
@ApiStandardContract()
@Controller("users")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
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
  @HttpCode(HttpStatus.OK)
  @ApiIdempotencyKey()
  @Permissions("user:write")
  create(@Body() dto: CreateUserDto): Promise<{ id: string; email: string; name: string }> {
    return this.usersService.create(dto);
  }

  @Post("update")
  @HttpCode(HttpStatus.OK)
  @ApiIdempotencyKey()
  @Permissions("user:write")
  update(@Body() dto: UpdateUserDto): Promise<unknown> {
    return this.usersService.update(dto);
  }
}
