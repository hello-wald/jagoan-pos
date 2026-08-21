import type { Route } from 'next';
import type { UserRole } from '@jagoan-pos/contracts';

// Cast once, here: these routes are built in a later task (T10), so
// Next's typedRoutes literal union can't see them yet. Every caller gets
// back an already-typed Route instead of repeating the cast at each
// router.push/replace/redirect call site.
const HOME_BY_ROLE: Record<UserRole, Route> = {
  GLOBAL_ADMIN: '/admin/products' as Route,
  OWNER: '/dashboard' as Route,
  CASHIER: '/cashier/checkout' as Route,
};

export function homeForRole(role: UserRole): Route {
  return HOME_BY_ROLE[role];
}

export const PUBLIC_ROUTES = ['/', '/login', '/register', '/forbidden'] as const;

/**
 * Routes for slices not yet built are listed on purpose, so the protection
 * scheme is complete and testable before those pages exist.
 */
const ROUTE_ROLES: ReadonlyArray<[RegExp, readonly UserRole[]]> = [
  [/^\/admin(\/|$)/, ['GLOBAL_ADMIN']],
  [/^\/dashboard(\/|$)/, ['OWNER']],
  [/^\/inventory(\/|$)/, ['OWNER']],
  [/^\/staff(\/|$)/, ['OWNER']],
  [/^\/insights(\/|$)/, ['OWNER']],
  [/^\/transactions(\/|$)/, ['OWNER']],
  [/^\/profile(\/|$)/, ['OWNER']],
  [/^\/cashier(\/|$)/, ['CASHIER']],
];

export type RouteDecision = { kind: 'allow' } | { kind: 'login' } | { kind: 'forbidden' };

export function decideRoute(pathname: string, role: UserRole | null): RouteDecision {
  if (PUBLIC_ROUTES.some((route) => pathname === route)) return { kind: 'allow' };

  const rule = ROUTE_ROLES.find(([pattern]) => pattern.test(pathname));
  if (!rule) return role ? { kind: 'allow' } : { kind: 'login' };
  if (!role) return { kind: 'login' };

  return rule[1].includes(role) ? { kind: 'allow' } : { kind: 'forbidden' };
}
