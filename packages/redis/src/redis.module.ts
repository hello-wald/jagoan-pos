import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REDIS_CLIENT, RedisService } from './redis.service';
import { RedisCacheInterceptor } from './interceptors/redis-cache.interceptor';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis(config.getOrThrow<string>('REDIS_URL'), {
          maxRetriesPerRequest: 2,
          // Fail fast instead of buffering commands while disconnected —
          // the cache must degrade, not queue up latency on the hot path.
          enableOfflineQueue: false,
          lazyConnect: false,
        }),
    },
    RedisService,
    RedisCacheInterceptor,
  ],
  exports: [RedisService, RedisCacheInterceptor],
})
export class RedisModule {}
