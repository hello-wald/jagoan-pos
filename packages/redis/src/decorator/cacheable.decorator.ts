import { CustomDecorator, ExecutionContext, SetMetadata } from "@nestjs/common"


export const CACHEABLE_KEY = 'cacheable'

export type CacheKeyFactory = (
    context: ExecutionContext
) => string | null | undefined;


export interface CacheableOptions {
    key: CacheKeyFactory, 
    ttlSeconds?: number
}

export const Cacheable = (options: CacheableOptions): CustomDecorator<string> => SetMetadata(CACHEABLE_KEY, options)