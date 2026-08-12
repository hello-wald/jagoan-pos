import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { of, firstValueFrom } from 'rxjs';
import { RedisCacheInterceptor } from './redis-cache.interceptor';
import { RedisService } from '../redis.service';

describe('RedisCacheInterceptor', () => {
  let interceptor: RedisCacheInterceptor;
  let reflector: Reflector;
  let redisService: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };

  const mockHandler = () => {};

  const createMockContext = (payload: unknown = {}) => {
    return {
      getHandler: jest.fn().mockReturnValue(mockHandler),
      getClass: jest.fn(),
      switchToRpc: jest.fn().mockReturnValue({
        getData: jest.fn().mockReturnValue(payload),
        getContext: jest.fn(),
      }),
      switchToHttp: jest.fn(),
      switchToWs: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      getType: jest.fn(),
    } as unknown as ExecutionContext;
  };

  const createMockCallHandler = (returnValue: unknown = 'db-result') => {
    const handleMock = jest.fn().mockReturnValue(of(returnValue));
    const callHandler: CallHandler = {
      handle: handleMock,
    };
    return { callHandler, handleMock };
  };

  beforeEach(async () => {
    redisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisCacheInterceptor,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: redisService,
        },
      ],
    }).compile();

    interceptor = module.get<RedisCacheInterceptor>(RedisCacheInterceptor);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should bypass caching and call next.handle() if @Cacheable metadata is not present', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);

    const context = createMockContext();
    const { callHandler, handleMock } = createMockCallHandler();

    const result$ = await interceptor.intercept(context, callHandler);
    const result = await firstValueFrom(result$);

    expect(handleMock).toHaveBeenCalledTimes(1);
    expect(redisService.get).not.toHaveBeenCalled();
    expect(result).toBe('db-result');
  });

  it('should bypass caching and call next.handle() if key generator returns null', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue({
      key: () => null,
      ttlSeconds: 300,
    });

    const context = createMockContext();
    const { callHandler, handleMock } = createMockCallHandler();

    const result$ = await interceptor.intercept(context, callHandler);
    const result = await firstValueFrom(result$);

    expect(handleMock).toHaveBeenCalledTimes(1);
    expect(redisService.get).not.toHaveBeenCalled();
    expect(result).toBe('db-result');
  });

  it('should return cached data and NOT call next.handle() on Cache HIT', async () => {
    const cachedData = { id: '1', name: 'cached-cashier' };
    const cacheKey = 'appk:core:cashiers:merchant-1';

    jest.spyOn(reflector, 'get').mockReturnValue({
      key: () => cacheKey,
      ttlSeconds: 300,
    });
    redisService.get.mockResolvedValue(cachedData);

    const context = createMockContext();
    const { callHandler, handleMock } = createMockCallHandler();

    const result$ = await interceptor.intercept(context, callHandler);
    const result = await firstValueFrom(result$);

    expect(redisService.get).toHaveBeenCalledWith(cacheKey);
    expect(handleMock).not.toHaveBeenCalled();
    expect(redisService.set).not.toHaveBeenCalled();
    expect(result).toEqual(cachedData);
  });

  it('should call next.handle() and save response to Redis on Cache MISS', async () => {
    const dbData = { id: '1', name: 'db-cashier' };
    const cacheKey = 'appk:core:cashiers:merchant-1';

    jest.spyOn(reflector, 'get').mockReturnValue({
      key: () => cacheKey,
      ttlSeconds: 600,
    });
    redisService.get.mockResolvedValue(null);

    const context = createMockContext();
    const { callHandler, handleMock } = createMockCallHandler(dbData);

    const result$ = await interceptor.intercept(context, callHandler);
    const result = await firstValueFrom(result$);

    expect(redisService.get).toHaveBeenCalledWith(cacheKey);
    expect(handleMock).toHaveBeenCalledTimes(1);
    expect(redisService.set).toHaveBeenCalledWith(cacheKey, dbData, 600);
    expect(result).toEqual(dbData);
  });

  it('should use default TTL (300s) if ttlSeconds is not explicitly provided on Cache MISS', async () => {
    const dbData = { id: '2', name: 'default-ttl-cashier' };
    const cacheKey = 'appk:core:cashiers:merchant-2';

    jest.spyOn(reflector, 'get').mockReturnValue({
      key: () => cacheKey,
    });
    redisService.get.mockResolvedValue(null);

    const context = createMockContext();
    const { callHandler, handleMock } = createMockCallHandler(dbData);

    const result$ = await interceptor.intercept(context, callHandler);
    const result = await firstValueFrom(result$);

    expect(handleMock).toHaveBeenCalledTimes(1);
    expect(redisService.set).toHaveBeenCalledWith(cacheKey, dbData, 300);
    expect(result).toEqual(dbData);
  });
});
