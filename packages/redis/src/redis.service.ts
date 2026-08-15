import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Redis } from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch (error) {
      this.warn('GET', key, error);
      return null;
    }
  }

  /** Reads a `setRaw` value, unparsed. */
  async getRaw(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.warn('GET', key, error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.warn('SET', key, error);
    }
  }

  /** Writes a bare string, preserving the existing ttl when none is given. */
  async setRaw(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds === undefined) {
        await this.client.set(key, value, 'KEEPTTL');
      } else {
        await this.client.set(key, value, 'EX', ttlSeconds);
      }
    } catch (error) {
      this.warn('SET', key, error);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await this.client.del(...keys);
    } catch (error) {
      this.warn('DEL', keys.join(','), error);
    }
  }

  /** Fixed (not sliding) window counter. Returns 0 if Redis is down, so an outage never locks users out. */
  async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    try {
      const count = await this.client.incr(key);
      if (count === 1) await this.client.expire(key, ttlSeconds);
      return count;
    } catch (error) {
      this.warn('INCR', key, error);
      return 0;
    }
  }

  async sadd(key: string, member: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.sadd(key, member);
      await this.client.expire(key, ttlSeconds);
    } catch (error) {
      this.warn('SADD', key, error);
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      this.warn('SMEMBERS', key, error);
      return [];
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  private warn(op: string, key: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Redis ${op} failed for key "${key}": ${message}`);
  }
}
