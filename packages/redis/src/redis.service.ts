import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService implements OnModuleInit{

    private client: Redis | null = null
    private readonly logger = new Logger(RedisService.name)

    constructor(private readonly configService: ConfigService){}

    onModuleInit() {
        const url =  this.configService.getOrThrow<string>("UPSTASH_REDIS_REST_URL")
        const token =  this.configService.getOrThrow<string>("UPSTASH_REDIS_REST_TOKEN")

        this.client = new Redis({url, token})
    }

    async get<T>(key:string): Promise<T | null> { 
        if(!this.client) return null
        try {
            const data = await this.client.get<T>(key)
            return data ?? null
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Redis GET failed for key: "${key}": ${errMsg}`)
            return null
        }
    }

    async set(key: string, value: unknown, ttlSeconds = 300): Promise <void>{ 
        if(!this.client) return
        try {
            await this.client.set(key, value, {ex: ttlSeconds})
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Redis GET failed for key: "${key}": ${errMsg}`)
            return
        }
    }

    async del(key: string): Promise<void>{
        if(!this.client) return
        try {
            await this.client.del(key)
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Redis DEL failed for key "${key}": ${errMsg}`);
            return
        }
    }

}
