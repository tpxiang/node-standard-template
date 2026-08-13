/** 刷新 / 登出请求体：提交 refresh token 明文。 */
import { IsString, MinLength } from "class-validator";

export class RefreshTokenDto {
  @IsString()
  @MinLength(16)
  refreshToken!: string;
}
