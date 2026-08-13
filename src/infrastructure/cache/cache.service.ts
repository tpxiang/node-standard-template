import { Injectable } from "@nestjs/common";
import { RedisService } from "../redis/redis.service";

export interface CacheOptions {
  ttlSeconds: number;
  namespace?: string;
}

/** 统一 JSON 缓存封装，业务代码不直接拼接 Redis Key。 */
@Injectable()
export class CacheService {
  constructor(private readonly redis: RedisService) {}

  async get<T>(key: string, namespace = "default"): Promise<T | null> {
    const value = await this.redis.get(this.buildKey(namespace, key));
    if (value === null) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      await this.delete(key, namespace);
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions): Promise<void> {
    this.assertTtl(options.ttlSeconds);
    await this.redis.set(
      this.buildKey(options.namespace ?? "default", key),
      JSON.stringify(value),
      options.ttlSeconds
    );
  }

  async delete(key: string, namespace = "default"): Promise<void> {
    await this.redis.del(this.buildKey(namespace, key));
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, options: CacheOptions): Promise<T> {
    const namespace = options.namespace ?? "default";
    const cached = await this.get<T>(key, namespace);
    if (cached !== null) return cached;

    const value = await factory();
    await this.set(key, value, { ...options, namespace });
    return value;
  }

  private buildKey(namespace: string, key: string): string {
    const normalizedNamespace = namespace.trim();
    const normalizedKey = key.trim();
    if (!normalizedNamespace || !normalizedKey) {
      throw new Error("Cache namespace and key cannot be empty");
    }
    return `cache:${normalizedNamespace}:${normalizedKey}`;
  }

  private assertTtl(ttlSeconds: number): void {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error("Cache ttlSeconds must be a positive integer");
    }
  }
}
