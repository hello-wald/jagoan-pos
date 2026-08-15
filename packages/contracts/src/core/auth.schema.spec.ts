import { loginSchema, registerOwnerSchema } from './auth.schema';

describe('registerOwnerSchema', () => {
  it('normalizes email to trimmed lowercase', () => {
    const parsed = registerOwnerSchema.parse({
      merchantName: 'Warung Bu Tini',
      fullName: 'Bu Tini',
      email: '  BuTini@Example.COM ',
      password: 'correct-horse',
    });
    expect(parsed.email).toBe('butini@example.com');
  });

  it('rejects a malformed email', () => {
    expect(() =>
      registerOwnerSchema.parse({
        merchantName: 'W',
        fullName: 'B',
        email: 'not-an-email',
        password: 'correct-horse',
      }),
    ).toThrow();
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(() =>
      registerOwnerSchema.parse({
        merchantName: 'W',
        fullName: 'B',
        email: 'a@b.com',
        password: 'short',
      }),
    ).toThrow();
  });
});

describe('loginSchema', () => {
  // Regression: login must not re-apply the registration password policy.
  // A tightened policy would otherwise lock out every existing user.
  it('accepts a password that violates the registration policy', () => {
    const parsed = loginSchema.parse({ email: 'a@b.com', password: 'x' });
    expect(parsed.password).toBe('x');
  });

  it('rejects an empty password', () => {
    expect(() => loginSchema.parse({ email: 'a@b.com', password: '' })).toThrow();
  });
});
