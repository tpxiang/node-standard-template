import { IsString, MinLength } from "class-validator";

/** POST /roles/assign-user 请求体。 */
export class AssignRoleDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsString()
  @MinLength(1)
  roleId!: string;
}
