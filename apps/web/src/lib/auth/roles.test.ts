import { describe, expect, it } from 'vitest';
import { decideRoute, homeForRole } from './roles';

describe('homeForRole', () => {
  it('sends each role to its own landing route', () => {
    expect(homeForRole('GLOBAL_ADMIN')).toBe('/admin/products');
    expect(homeForRole('OWNER')).toBe('/dashboard');
    expect(homeForRole('CASHIER')).toBe('/checkout');
  });
});

describe('decideRoute', () => {
  it('lets anyone reach public routes', () => {
    expect(decideRoute('/login', null)).toEqual({ kind: 'allow' });
    expect(decideRoute('/register', null)).toEqual({ kind: 'allow' });
    expect(decideRoute('/forbidden', null)).toEqual({ kind: 'allow' });
  });

  it('sends an anonymous visitor on a protected route to login', () => {
    expect(decideRoute('/admin/products', null)).toEqual({ kind: 'login' });
    expect(decideRoute('/dashboard', null)).toEqual({ kind: 'login' });
    expect(decideRoute('/inventory', null)).toEqual({ kind: 'login' });
    expect(decideRoute('/staff', null)).toEqual({ kind: 'login' });
    expect(decideRoute('/insights', null)).toEqual({ kind: 'login' });
    expect(decideRoute('/transactions', null)).toEqual({ kind: 'login' });
    expect(decideRoute('/profile', null)).toEqual({ kind: 'login' });
  });

  it('allows the matching role', () => {
    expect(decideRoute('/admin/products', 'GLOBAL_ADMIN')).toEqual({ kind: 'allow' });
    expect(decideRoute('/dashboard', 'OWNER')).toEqual({ kind: 'allow' });
    expect(decideRoute('/inventory', 'OWNER')).toEqual({ kind: 'allow' });
    expect(decideRoute('/staff', 'OWNER')).toEqual({ kind: 'allow' });
    expect(decideRoute('/insights', 'OWNER')).toEqual({ kind: 'allow' });
    expect(decideRoute('/transactions', 'OWNER')).toEqual({ kind: 'allow' });
    expect(decideRoute('/profile', 'OWNER')).toEqual({ kind: 'allow' });
    expect(decideRoute('/checkout', 'CASHIER')).toEqual({ kind: 'allow' });
  });

  it('forbids a mismatched role', () => {
    expect(decideRoute('/admin/products', 'CASHIER')).toEqual({ kind: 'forbidden' });
    expect(decideRoute('/admin/products', 'OWNER')).toEqual({ kind: 'forbidden' });

    const ownerRoutes = [
      '/dashboard',
      '/inventory',
      '/staff',
      '/insights',
      '/transactions',
      '/profile',
    ];
    for (const route of ownerRoutes) {
      expect(decideRoute(route, 'CASHIER')).toEqual({ kind: 'forbidden' });
      expect(decideRoute(route, 'GLOBAL_ADMIN')).toEqual({ kind: 'forbidden' });
    }
  });

  // The prefix boundary: /admin-tools must not be matched by the /admin rule.
  it('matches on path segments, not bare string prefixes', () => {
    expect(decideRoute('/admin-tools', 'CASHIER')).toEqual({ kind: 'allow' });
    expect(decideRoute('/admin', 'GLOBAL_ADMIN')).toEqual({ kind: 'allow' });
    expect(decideRoute('/admin', 'CASHIER')).toEqual({ kind: 'forbidden' });
  });

  it('allows an authenticated user on an unmapped route', () => {
    expect(decideRoute('/settings', 'OWNER')).toEqual({ kind: 'allow' });
  });
});
