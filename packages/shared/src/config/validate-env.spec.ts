import { z } from 'zod';
import { validateEnv } from './validate-env';

const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4001),
  DATABASE_URL: z.string().min(1),
});

describe('validateEnv', () => {
  it('coerces and returns the parsed config', () => {
    const parsed = validateEnv(schema)({ PORT: '4002', DATABASE_URL: 'postgres://x' });
    expect(parsed).toEqual({ PORT: 4002, DATABASE_URL: 'postgres://x' });
  });

  it('applies defaults for absent optional vars', () => {
    const parsed = validateEnv(schema)({ DATABASE_URL: 'postgres://x' });
    expect(parsed.PORT).toBe(4001);
  });

  it('throws naming every missing variable', () => {
    expect(() => validateEnv(schema)({})).toThrow(/DATABASE_URL/);
  });
});
