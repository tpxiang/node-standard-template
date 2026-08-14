/** 更新平台用户资料：租户成员状态应通过独立的成员管理接口修改。 */
import { IsOptional, IsString, MinLength } from "class-validator";

export class UpdateUserDto {
  @IsString()
  @MinLength(1)
  id!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}
