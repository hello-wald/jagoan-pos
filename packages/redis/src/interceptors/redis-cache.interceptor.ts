import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Observable, of, switchMap } from 'rxjs';
import { RedisService } from '../redis.service';
import { CACHEABLE_KEY, type CacheableOptions } from '../decorator/cacheable.decorator';

@Injectable()
export class RedisCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RedisCacheInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const options = this.reflector.get<CacheableOptions | undefined>(
      CACHEABLE_KEY,
      context.getHandler(),
    );
    if (!options) return next.handle();

    const key = options.key(context);
    if (!key) return next.handle();

    const ttlSeconds = options.ttlSeconds ?? 300;
    const cached = await this.redis.get(key);
    if (cached !== null) {
      this.logger.debug(`cache hit ${key}`);
      return of(cached);
    }

    return next.handle().pipe(
      switchMap(async (response: unknown) => {
        if (response !== undefined && response !== null) {
          await this.redis.set(key, response, ttlSeconds);
        }
        return response;
      }),
    );
  }
}
