import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisCacheInterceptor } from './interceptors/redis-cache.interceptor';

@Global()
@Module({
  providers: [RedisService, RedisCacheInterceptor],
  exports: [RedisService, RedisCacheInterceptor]
})
export class RedisModule {}
