/** 角色接口：列表、详情、给用户分配角色。 */
import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RolesService } from "./roles.service";

@ApiTags("roles")
@ApiBearerAuth()
@Controller("roles")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions("role:read")
  list(): Promise<unknown> {
    return this.rolesService.list();
  }

  @Get(":id")
  @Permissions("role:read")
  findById(@Param("id") id: string): Promise<unknown> {
    return this.rolesService.findById(id);
  }

  @Post(":roleId/users/:userId")
  @Permissions("role:write")
  assignUser(
    @Param("roleId") roleId: string,
    @Param("userId") userId: string
  ): Promise<{ userId: string; roleId: string }> {
    return this.rolesService.assignUser(userId, roleId);
  }
}
