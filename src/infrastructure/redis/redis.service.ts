import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import {
  INCREMENT_WITH_TTL_SCRIPT,
  RELEASE_LOCK_SCRIPT,
  RENEW_LOCK_SCRIPT,
  THROTTLE_SCRIPT
} from "./redis.scripts";

type MemoryEntry = {
  value: string;
  expiresAt?: number;
};

class MemoryRedisStore {
  private readonly store = new Map<string, MemoryEntry>();

  get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: string, ttlSeconds: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1_000 });
  }

  setNx(key: string, value: string, ttlSeconds: number): boolean {
    if (this.get(key) !== null) return false;
    this.set(key, value, ttlSeconds);
    return true;
  }

  incr(key: string): number {
    const current = Number.parseInt(this.get(key) ?? "0", 10);
    const next = current + 1;
    const entry = this.store.get(key);
    this.store.set(key, {
      value: String(next),
      expiresAt: entry?.expiresAt
    });
    return next;
  }

  incrementWithTtl(key: string, ttlSeconds: number): { value: number; ttl: number } {
    const value = this.incr(key);
    if (value === 1 || this.ttl(key) < 0) this.expire(key, ttlSeconds);
    return { value, ttl: this.ttl(key) };
  }

  incrementThrottle(
    key: string,
    ttlMs: number,
    limit: number,
    blockDurationMs: number
  ): { value: number; ttlMs: number; blockTtlMs: number; isBlocked: boolean } {
    const blockKey = `${key}:block`;
    const blockTtlMs = this.pttl(blockKey);
    if (blockTtlMs > 0 || this.get(blockKey) !== null) {
      return {
        value: limit + 1,
        ttlMs: 0,
        blockTtlMs: Math.max(blockTtlMs, 0),
        isBlocked: true
      };
    }

    const value = this.incr(key);
    if (value === 1 || this.pttl(key) < 0) this.pexpire(key, ttlMs);
    if (value > limit) {
      this.psetex(blockKey, blockDurationMs, "1");
      this.del(key);
      return {
        value,
        ttlMs: 0,
        blockTtlMs: blockDurationMs,
        isBlocked: true
      };
    }

    return {
      value,
      ttlMs: Math.max(this.pttl(key), 0),
      blockTtlMs: 0,
      isBlocked: false
    };
  }

  expire(key: string, ttlSeconds: number): void {
    const entry = this.store.get(key);
    if (!entry) return;
    entry.expiresAt = Date.now() + ttlSeconds * 1_000;
  }

  pexpire(key: string, ttlMs: number): void {
    const entry = this.store.get(key);
    if (!entry) return;
    entry.expiresAt = Date.now() + ttlMs;
  }

  psetex(key: string, ttlMs: number, value: string): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  ttl(key: string): number {
    const ttlMs = this.pttl(key);
    if (ttlMs === -2) return -2;
    if (ttlMs === -1) return -1;
    return Math.floor(ttlMs / 1_000);
  }

  pttl(key: string): number {
    const entry = this.store.get(key);
    if (!entry) return -2;
    if (entry.expiresAt === undefined) return -1;
    const remaining = entry.expiresAt - Date.now();
    if (remaining <= 0) {
      this.store.delete(key);
      return -2;
    }
    return remaining;
  }

  del(key: string): void {
    this.store.delete(key);
  }

  compareAndDelete(key: string, expectedValue: string): boolean {
    if (this.get(key) !== expectedValue) return false;
    this.del(key);
    return true;
  }

  compareAndExpire(key: string, expectedValue: string, ttlSeconds: number): boolean {
    if (this.get(key) !== expectedValue) return false;
    this.expire(key, ttlSeconds);
    return true;
  }

  ping(): string {
    return "PONG";
  }

  private isExpired(entry: MemoryEntry): boolean {
    return entry.expiresAt !== undefined && entry.expiresAt <= Date.now();
  }
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly memory = new MemoryRedisStore();
  private useMemory = false;

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

  async get(key: string): Promise<string | null> {
    await this.ensureConnected();
    return this.useMemory ? this.memory.get(key) : this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.ensureConnected();
    if (this.useMemory) {
      this.memory.set(key, value, ttlSeconds);
      return;
    }
    await this.client.set(key, value, "EX", ttlSeconds);
  }

  async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    await this.ensureConnected();
    if (this.useMemory) return this.memory.setNx(key, value, ttlSeconds);
    const result = await this.client.set(key, value, "EX", ttlSeconds, "NX");
    return result === "OK";
  }

  async incr(key: string): Promise<number> {
    await this.ensureConnected();
    if (this.useMemory) return this.memory.incr(key);
    return this.client.incr(key);
  }

  async incrementWithTtl(key: string, ttlSeconds: number): Promise<{ value: number; ttl: number }> {
    await this.ensureConnected();
    if (this.useMemory) return this.memory.incrementWithTtl(key, ttlSeconds);
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
    if (this.useMemory) return this.memory.incrementThrottle(key, ttlMs, limit, blockDurationMs);
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
    if (this.useMemory) {
      this.memory.expire(key, ttlSeconds);
      return;
    }
    await this.client.expire(key, ttlSeconds);
  }

  async ttl(key: string): Promise<number> {
    await this.ensureConnected();
    if (this.useMemory) return this.memory.ttl(key);
    return this.client.ttl(key);
  }

  async del(key: string): Promise<void> {
    await this.ensureConnected();
    if (this.useMemory) {
      this.memory.del(key);
      return;
    }
    await this.client.del(key);
  }

  async compareAndDelete(key: string, expectedValue: string): Promise<boolean> {
    await this.ensureConnected();
    if (this.useMemory) return this.memory.compareAndDelete(key, expectedValue);
    const result = await this.client.eval(RELEASE_LOCK_SCRIPT, 1, key, expectedValue);
    return Number(result) === 1;
  }

  async compareAndExpire(key: string, expectedValue: string, ttlSeconds: number): Promise<boolean> {
    await this.ensureConnected();
    if (this.useMemory) return this.memory.compareAndExpire(key, expectedValue, ttlSeconds);
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
    if (this.useMemory) return this.memory.ping();
    return this.client.ping();
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.useMemory && this.client.status !== "end") {
      await this.client.quit();
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.useMemory) return;
    if (this.client.status === "wait") {
      try {
        await this.client.connect();
      } catch {
        this.useMemory = true;
      }
    }
  }
}
