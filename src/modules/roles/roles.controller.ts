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
import {
  ApiIdempotencyKey,
  ApiStandardContract
} from "../../common/decorators/api-contract.decorator";
import { IdQueryDto } from "../../common/dto/id-query.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { AssignRoleDto } from "./dto/assign-role.dto";
import { RolesService } from "./roles.service";

/**
 * 入参约定：GET 仅 Query；增删改仅 POST + Body。
 */
@ApiTags("roles")
@ApiBearerAuth()
@ApiStandardContract()
@Controller("roles")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get("list")
  @Permissions("role:read")
  list(@Query() query: PaginationDto): Promise<unknown> {
    return this.rolesService.list(query);
  }

  @Get("detail")
  @Permissions("role:read")
  findById(@Query() query: IdQueryDto): Promise<unknown> {
    return this.rolesService.findById(query.id);
  }

  @Post("assign-user")
  @HttpCode(HttpStatus.OK)
  @ApiIdempotencyKey()
  @Permissions("role:write")
  assignUser(@Body() dto: AssignRoleDto): Promise<{ userId: string; roleId: string }> {
    return this.rolesService.assignUser(dto.userId, dto.roleId);
  }
}
