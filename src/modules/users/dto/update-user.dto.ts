/** 更新用户请求体：仅允许改名称与状态（改密应走独立流程）。 */
import { IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { UserStatus } from "@prisma/client";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
