/**
 * 认证接口：登录 / 刷新 / 登出。
 * 登录与刷新单独收紧 Throttle，降低爆破与滥用风险。
 */
import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { FastifyRequest } from "fastify";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ApiStandardContract } from "../../common/decorators/api-contract.decorator";

@ApiTags("auth")
@ApiStandardContract()
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto, @Req() request: FastifyRequest): Promise<unknown> {
    return this.authService.login(dto, request.headers["x-request-id"]?.toString());
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  refresh(@Body() dto: RefreshTokenDto): Promise<unknown> {
    return this.authService.refresh(dto.refreshToken);
  }

  /** 建议同时传 refresh（body）与 access（Authorization），以便即时失效 access。 */
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  logout(
    @Body() dto: RefreshTokenDto,
    @Headers("authorization") authorization?: string
  ): Promise<unknown> {
    const accessToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
    return this.authService.logout(dto.refreshToken, accessToken);
  }
}
