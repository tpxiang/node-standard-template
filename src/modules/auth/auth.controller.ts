import { Body, Controller, Post, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { FastifyRequest } from "fastify";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() dto: LoginDto, @Req() request: FastifyRequest): Promise<unknown> {
    return this.authService.login(dto, request.headers["x-request-id"]?.toString());
  }
}
