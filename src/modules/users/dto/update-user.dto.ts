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
