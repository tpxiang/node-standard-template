/**
 * Redis 封装：懒连接、KV/计数、缓存和分布式锁原子脚本。
 */
import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import {
  INCREMENT_WITH_TTL_SCRIPT,
  RELEASE_LOCK_SCRIPT,
  RENEW_LOCK_SCRIPT,
  THROTTLE_SCRIPT
} from "./redis.scripts";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(configService: ConfigService) {
    this.client = new Redis({
      host: configService.getOrThrow<string>("redis.host"),
      port: configService.getOrThrow<number>("redis.port"),
      password: configService.get<string>("redis.password"),
      db: configService.getOrThrow<number>("redis.db"),
      keyPrefix: configService.get<string>("redis.keyPrefix"),
      connectTimeout: configService.get<number>("redis.connectTimeoutMs") ?? 2_000,
      commandTimeout: configService.get<number>("redis.commandTimeoutMs") ?? 2_000,
      lazyConnect: true,
      maxRetriesPerRequest: 1
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    await this.ensureConnected();
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.ensureConnected();
    await this.client.set(key, value, "EX", ttlSeconds);
  }

  async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    await this.ensureConnected();
    const result = await this.client.set(key, value, "EX", ttlSeconds, "NX");
    return result === "OK";
  }

  async incr(key: string): Promise<number> {
    await this.ensureConnected();
    return this.client.incr(key);
  }

  async incrementWithTtl(key: string, ttlSeconds: number): Promise<{ value: number; ttl: number }> {
    await this.ensureConnected();
    const result = (await this.client.eval(
      INCREMENT_WITH_TTL_SCRIPT,
      1,
      key,
      String(ttlSeconds)
    )) as [number, number];
    return { value: Number(result[0]), ttl: Number(result[1]) };
  }

  async incrementThrottle(
    key: string,
    ttlMs: number,
    limit: number,
    blockDurationMs: number
  ): Promise<{ value: number; ttlMs: number; blockTtlMs: number; isBlocked: boolean }> {
    await this.ensureConnected();
    const result = (await this.client.eval(
      THROTTLE_SCRIPT,
      2,
      key,
      `${key}:block`,
      String(ttlMs),
      String(limit),
      String(blockDurationMs)
    )) as [number, number, number, number];
    return {
      value: Number(result[0]),
      ttlMs: Number(result[1]),
      blockTtlMs: Number(result[2]),
      isBlocked: Number(result[3]) === 1
    };
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.ensureConnected();
    await this.client.expire(key, ttlSeconds);
  }

  async ttl(key: string): Promise<number> {
    await this.ensureConnected();
    return this.client.ttl(key);
  }

  async del(key: string): Promise<void> {
    await this.ensureConnected();
    await this.client.del(key);
  }

  async compareAndDelete(key: string, expectedValue: string): Promise<boolean> {
    await this.ensureConnected();
    const result = await this.client.eval(RELEASE_LOCK_SCRIPT, 1, key, expectedValue);
    return Number(result) === 1;
  }

  async compareAndExpire(key: string, expectedValue: string, ttlSeconds: number): Promise<boolean> {
    await this.ensureConnected();
    const result = await this.client.eval(
      RENEW_LOCK_SCRIPT,
      1,
      key,
      expectedValue,
      String(ttlSeconds)
    );
    return Number(result) === 1;
  }

  async ping(): Promise<string> {
    await this.ensureConnected();
    return this.client.ping();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status !== "end") {
      await this.client.quit();
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.client.status === "wait") {
      await this.client.connect();
    }
  }
}
