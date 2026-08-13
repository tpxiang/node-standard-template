/**
 * Redis 封装：懒连接 + KV/计数/分布式锁原语。
 */
import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(configService: ConfigService) {
    this.client = new Redis({
      host: configService.getOrThrow<string>("redis.host"),
      port: configService.getOrThrow<number>("redis.port"),
      password: configService.get<string>("redis.password"),
      db: configService.getOrThrow<number>("redis.db"),
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
