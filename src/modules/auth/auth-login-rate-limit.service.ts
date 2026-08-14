import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/exceptions/business.exception";
import { ErrorCode } from "../../common/constants/error-codes";
import { RedisService } from "../../infrastructure/redis/redis.service";

const LOGIN_FAIL_LIMIT = 5;
const LOGIN_FAIL_WINDOW_SECONDS = 15 * 60;

@Injectable()
export class AuthLoginRateLimitService {
  constructor(private readonly redis: RedisService) {}
  async assertAllowed(email: string): Promise<void> {
    const key = this.key(email);
    const raw = await this.redis.get(key);
    const failures = raw ? Number(raw) : 0;
    if (failures < LOGIN_FAIL_LIMIT) return;
    const ttl = await this.redis.ttl(key);
    throw new BusinessException(
      ErrorCode.AUTH_RATE_LIMITED,
      `Too many failed login attempts. Retry in ${Math.max(ttl, 1)} seconds`,
      429
    );
  }
  async recordFailure(email: string): Promise<void> {
    const key = this.key(email);
    await this.redis.incrementWithTtl(key, LOGIN_FAIL_WINDOW_SECONDS);
  }
  clear(email: string): Promise<void> {
    return this.redis.del(this.key(email));
  }
  private key(email: string): string {
    return `auth:login:fail:${email.trim().toLowerCase()}`;
  }
}
