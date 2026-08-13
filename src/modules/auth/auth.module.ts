/** 认证模块：导出 AuthService 与守卫，供 Users/Roles 等业务模块复用。 */
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthLoginRateLimitService } from "./auth-login-rate-limit.service";
import { AuthTokenService } from "./auth-token.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { PermissionsGuard } from "./guards/permissions.guard";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("auth.accessSecret")
      })
    })
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthLoginRateLimitService,
    AuthTokenService,
    JwtAuthGuard,
    PermissionsGuard
  ],
  exports: [AuthService, JwtAuthGuard, PermissionsGuard]
})
export class AuthModule {}
