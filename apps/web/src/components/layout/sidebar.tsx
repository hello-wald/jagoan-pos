import Link from 'next/link';
import type { Route } from 'next';
import type { UserRole } from '@jagoan-pos/contracts';
import { Package } from '@phosphor-icons/react/dist/ssr';

type NavItem = { href: Route; label: string };

// Cast at the source, same pattern as homeForRole in lib/auth/roles.ts:
// typedRoutes can't see /admin/products as a literal until Task 11 builds
// the page, so these are asserted once here instead of at each Link.
const NAV: Record<UserRole, ReadonlyArray<NavItem>> = {
  GLOBAL_ADMIN: [{ href: '/admin/products' as Route, label: 'Katalog Produk' }],
  OWNER: [],
  CASHIER: [],
};

export function Sidebar({ role }: { role: UserRole }) {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-line bg-surface px-4 py-6 lg:block">
      <div className="mb-8 flex items-center gap-2 px-2">
        <Package size={20} weight="regular" className="text-accent-deep" aria-hidden />
        <span className="font-medium tracking-[-0.01em]">Jagoan POS</span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV[role].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-control px-3 py-2 text-sm text-ink-2 transition-colors duration-150 hover:bg-paper hover:text-ink"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
