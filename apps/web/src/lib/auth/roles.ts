import type { UserRole } from '@jagoan-pos/contracts';

const HOME_BY_ROLE: Record<UserRole, string> = {
  GLOBAL_ADMIN: '/admin/products',
  OWNER: '/dashboard',
  CASHIER: '/checkout',
};

export function homeForRole(role: UserRole): string {
  return HOME_BY_ROLE[role];
}

export const PUBLIC_ROUTES = ['/login', '/register', '/forbidden'] as const;

/**
 * Routes for slices not yet built are listed on purpose, so the protection
 * scheme is complete and testable before those pages exist.
 */
const ROUTE_ROLES: ReadonlyArray<[RegExp, readonly UserRole[]]> = [
  [/^\/admin(\/|$)/, ['GLOBAL_ADMIN']],
  [/^\/dashboard(\/|$)/, ['OWNER']],
  [/^\/reports(\/|$)/, ['OWNER']],
  [/^\/insights(\/|$)/, ['OWNER']],
  [/^\/inventory(\/|$)/, ['OWNER']],
  [/^\/team(\/|$)/, ['OWNER']],
  [/^\/checkout(\/|$)/, ['CASHIER']],
];

export type RouteDecision = { kind: 'allow' } | { kind: 'login' } | { kind: 'forbidden' };

export function decideRoute(pathname: string, role: UserRole | null): RouteDecision {
  if (PUBLIC_ROUTES.some((route) => pathname === route)) return { kind: 'allow' };

  const rule = ROUTE_ROLES.find(([pattern]) => pattern.test(pathname));
  if (!rule) return role ? { kind: 'allow' } : { kind: 'login' };
  if (!role) return { kind: 'login' };

  return rule[1].includes(role) ? { kind: 'allow' } : { kind: 'forbidden' };
}
