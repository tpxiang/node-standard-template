/** 角色接口：列表、详情、给用户分配角色。GET 仅 Query；写操作仅 POST + Body。 */
import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { IdQueryDto } from "../../common/dto/id-query.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { AssignRoleDto } from "./dto/assign-role.dto";
import { RolesService } from "./roles.service";

@ApiTags("roles")
@ApiBearerAuth()
@Controller("roles")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get("list")
  @Permissions("role:read")
  list(): Promise<unknown> {
    return this.rolesService.list();
  }

  @Get("detail")
  @Permissions("role:read")
  findById(@Query() query: IdQueryDto): Promise<unknown> {
    return this.rolesService.findById(query.id);
  }

  @Post("assign-user")
  @Permissions("role:write")
  assignUser(@Body() dto: AssignRoleDto): Promise<{ userId: string; roleId: string }> {
    return this.rolesService.assignUser(dto.userId, dto.roleId);
  }
}
