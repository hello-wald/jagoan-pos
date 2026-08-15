import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService, REDIS_CLIENT } from './redis.service';

const client = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  quit: jest.fn(),
};

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: REDIS_CLIENT, useValue: client },
        { provide: ConfigService, useValue: { getOrThrow: () => 'redis://localhost:6379' } },
      ],
    }).compile();
    service = moduleRef.get(RedisService);
  });

  it('round-trips a JSON value', async () => {
    client.get.mockResolvedValue('{"a":1}');
    await expect(service.get<{ a: number }>('k')).resolves.toEqual({ a: 1 });
  });

  it('returns null on a miss', async () => {
    client.get.mockResolvedValue(null);
    await expect(service.get('k')).resolves.toBeNull();
  });

  // Cache must never take the caller down.
  it('returns null instead of throwing when Redis is unreachable', async () => {
    client.get.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(service.get('k')).resolves.toBeNull();
  });

  it('writes JSON with an EX ttl', async () => {
    await service.set('k', { a: 1 }, 60);
    expect(client.set).toHaveBeenCalledWith('k', '{"a":1}', 'EX', 60);
  });

  // Regression: incrWithTtl must only set the expiry on the first increment,
  // otherwise the 15-minute lockout window slides forever and never lapses.
  it('sets the ttl only on the first increment', async () => {
    client.incr.mockResolvedValueOnce(1);
    await service.incrWithTtl('k', 900);
    expect(client.expire).toHaveBeenCalledWith('k', 900);

    client.incr.mockResolvedValueOnce(2);
    client.expire.mockClear();
    await service.incrWithTtl('k', 900);
    expect(client.expire).not.toHaveBeenCalled();
  });
});
