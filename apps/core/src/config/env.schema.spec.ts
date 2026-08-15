import { coreEnvSchema } from './env.schema';

const valid = {
  CORE_HOST: '0.0.0.0',
  CORE_TCP_PORT: '4001',
  CORE_DATABASE_URL: 'postgresql://core_svc:pw@pooler.supabase.com:6543/postgres',
  CORE_DIRECT_URL: 'postgresql://core_svc:pw@db.ref.supabase.co:5432/postgres',
  CORE_DATABASE_POOL_MAX: '5',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'a-secret-at-least-32-characters-long',
  JWT_EXPIRES_IN_SECONDS: '3600',
};

describe('coreEnvSchema', () => {
  it('coerces numeric vars', () => {
    const env = coreEnvSchema.parse(valid);
    expect(env.CORE_TCP_PORT).toBe(4001);
    expect(env.JWT_EXPIRES_IN_SECONDS).toBe(3600);
  });

  // A 16-character secret is brute-forceable; the old Joi schema allowed it.
  it('rejects a JWT secret shorter than 32 characters', () => {
    expect(() => coreEnvSchema.parse({ ...valid, JWT_SECRET: 'too-short' })).toThrow();
  });

  it('rejects a non-postgres database url', () => {
    expect(() => coreEnvSchema.parse({ ...valid, CORE_DATABASE_URL: 'mysql://x' })).toThrow();
  });

  it('requires REDIS_URL', () => {
    const { REDIS_URL: _omitted, ...withoutRedis } = valid;
    expect(() => coreEnvSchema.parse(withoutRedis)).toThrow(/REDIS_URL/);
  });
});
