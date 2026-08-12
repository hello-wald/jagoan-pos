import {
    CallHandler,
    ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../redis.service';
import { Observable, of, switchMap } from 'rxjs';
import { CACHEABLE_KEY, CacheableOptions } from '../decorator/cacheable.decorator';

@Injectable()
export class RedisCacheInterceptor implements NestInterceptor{
    private readonly logger = new Logger(RedisCacheInterceptor.name);
    constructor(
        private readonly reflector: Reflector,
        private readonly redisService: RedisService,
    ){}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
        const options = this.reflector.get<CacheableOptions | undefined>(
            CACHEABLE_KEY, 
            context.getHandler()
        )

        if(!options){
            return next.handle()
        }

        
        const cacheKey = options.key(context)
        if(!cacheKey){
            return next.handle()
        }
        const ttlSeconds = options.ttlSeconds ?? 300
        

        const cachedData = await this.redisService.get(cacheKey)
        if(cachedData !== null){
            this.logger.log(`[Cache HIT] key: "${cacheKey}"`);
            return of(cachedData)
        }
        this.logger.log(`[Cache MISS] key: "${cacheKey}"`);
        return next.handle().pipe(
            switchMap(async (response: unknown) => {
                if (response !== undefined && response !== null) {
                    await this.redisService.set(cacheKey, response, ttlSeconds);
                    this.logger.log(`[Cache SET] key: "${cacheKey}" (TTL: ${ttlSeconds})`);
                }
                return response;
        }),
    );
    }
}