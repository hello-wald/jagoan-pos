import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService, REDIS_CLIENT } from './redis.service';

const client = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  sadd: jest.fn(),
  smembers: jest.fn(),
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

  // setRaw with ttl omitted must preserve whatever ttl is already on the key,
  // rather than clearing it (a plain SET with no options would strip the ttl).
  it('writes a raw value with KEEPTTL when no ttl is given', async () => {
    await service.setRaw('k', 'v');
    expect(client.set).toHaveBeenCalledWith('k', 'v', 'KEEPTTL');
  });

  it('writes a raw value with an EX ttl when one is given', async () => {
    await service.setRaw('k', 'v', 60);
    expect(client.set).toHaveBeenCalledWith('k', 'v', 'EX', 60);
  });

  // Unlike get(), getRaw() must not attempt to JSON-parse the value — it
  // returns whatever setRaw wrote, verbatim, even if that isn't valid JSON.
  it('returns a raw string verbatim without JSON-parsing it', async () => {
    client.get.mockResolvedValue('revoked');
    await expect(service.getRaw('k')).resolves.toBe('revoked');
  });

  it('returns null from getRaw on a miss', async () => {
    client.get.mockResolvedValue(null);
    await expect(service.getRaw('k')).resolves.toBeNull();
  });

  // The variadic spread is the part that can silently drop keys, so assert
  // with more than one key.
  it('forwards every key to del in a single call', async () => {
    await service.del('a', 'b', 'c');
    expect(client.del).toHaveBeenCalledWith('a', 'b', 'c');
  });

  it('adds a member and sets the ttl on sadd', async () => {
    await service.sadd('k', 'member-1', 120);
    expect(client.sadd).toHaveBeenCalledWith('k', 'member-1');
    expect(client.expire).toHaveBeenCalledWith('k', 120);
  });

  it('returns the member array from smembers', async () => {
    client.smembers.mockResolvedValue(['member-1', 'member-2']);
    await expect(service.smembers('k')).resolves.toEqual(['member-1', 'member-2']);
  });

  // Cache must never take the caller down — fail open with an empty set,
  // not undefined and not a thrown error.
  it('returns an empty array from smembers when Redis is unreachable', async () => {
    client.smembers.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(service.smembers('k')).resolves.toEqual([]);
  });
});
