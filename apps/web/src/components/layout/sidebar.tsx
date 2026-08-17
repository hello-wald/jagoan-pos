import Link from 'next/link';
import type { UserRole } from '@jagoan-pos/contracts';
import { Package } from '@phosphor-icons/react/dist/ssr';

type NavItem = { href: string; label: string };

const NAV: Record<UserRole, NavItem[]> = {
  GLOBAL_ADMIN: [{ href: '/admin/products', label: 'Katalog Produk' }],
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            href={item.href as any}
            className="rounded-[--radius-control] px-3 py-2 text-sm text-ink-2 transition-colors duration-150 hover:bg-paper hover:text-ink"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
