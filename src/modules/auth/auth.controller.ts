import { Body, Controller, Headers, Post, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { FastifyRequest } from "fastify";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto, @Req() request: FastifyRequest): Promise<unknown> {
    return this.authService.login(dto, request.headers["x-request-id"]?.toString());
  }

  @Post("refresh")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  refresh(@Body() dto: RefreshTokenDto): Promise<unknown> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post("logout")
  logout(
    @Body() dto: RefreshTokenDto,
    @Headers("authorization") authorization?: string
  ): Promise<unknown> {
    const accessToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
    return this.authService.logout(dto.refreshToken, accessToken);
  }
}
