'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Route } from 'next';
import type { UserRole } from '@jagoan-pos/contracts';
import { CaretLeft, List, Package, X, type Icon } from '@phosphor-icons/react';
import { LogoutButton } from '@/components/auth/logout-button';

type NavItem = { href: Route; label: string; icon: Icon };

// Cast at the source, same pattern as homeForRole in lib/auth/roles.ts:
// typedRoutes can't see /admin/products as a literal until Task 11 builds
// the page, so these are asserted once here instead of at each Link.
const NAV: Record<UserRole, ReadonlyArray<NavItem>> = {
  GLOBAL_ADMIN: [{ href: '/admin/products' as Route, label: 'Katalog Produk', icon: Package }],
  OWNER: [],
  CASHIER: [],
};

const COLLAPSED_KEY = 'jagoan.sidebar.collapsed';

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The server can't read localStorage, so the rail renders expanded and the
  // stored preference lands on mount. Width animates only after that, or the
  // restore itself would play as an animation on every page load.
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === '1');
    setRestored(true);
  }, []);

  useEffect(() => {
    if (restored) window.localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  }, [collapsed, restored]);

  // A route change is the drawer's cue to close; on desktop it is a no-op.
  useEffect(() => setDrawerOpen(false), [pathname]);

  const items = NAV[role];

  return (
    <>
      {/* Mobile opener. Not a navbar — a single affordance for the drawer. */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        aria-label="Buka menu"
        className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-control border border-line bg-surface text-ink-2 transition-colors duration-150 hover:text-ink lg:hidden"
      >
        <List size={18} weight="regular" aria-hidden />
      </button>

      {drawerOpen ? (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-30 bg-ink/20 lg:hidden"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'lg:w-[72px] lg:px-3' : 'lg:w-60'} ${
          restored ? 'lg:transition-[width,padding] lg:duration-200' : 'lg:transition-none'
        }`}
      >
        <div
          className={`mb-8 flex items-center gap-2 px-2 ${collapsed ? 'lg:justify-center lg:gap-0 lg:px-0' : ''}`}
        >
          <Package size={20} weight="regular" className="shrink-0 text-accent-deep" aria-hidden />
          <span className={`font-medium tracking-[-0.01em] ${collapsed ? 'lg:hidden' : ''}`}>
            Jagoan POS
          </span>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Tutup menu"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-control text-ink-2 hover:bg-paper hover:text-ink lg:hidden"
          >
            <X size={16} weight="regular" aria-hidden />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const ItemIcon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                aria-current={active ? 'page' : undefined}
                className={`flex h-10 items-center rounded-control text-sm transition-colors duration-150 ${
                  active ? 'bg-paper text-ink' : 'text-ink-2 hover:bg-paper hover:text-ink'
                } ${collapsed ? 'gap-3 px-3 lg:justify-center lg:gap-0 lg:px-0' : 'gap-3 px-3'}`}
              >
                <ItemIcon size={18} weight="regular" className="shrink-0" aria-hidden />
                <span className={collapsed ? 'truncate lg:hidden' : 'truncate'}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 flex flex-col gap-1 border-t border-line pt-4">
          {/* Collapse is a desktop-only idea; on mobile the rail is a drawer. */}
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Perlebar menu' : 'Perkecil menu'}
            aria-expanded={!collapsed}
            className={`hidden h-10 items-center rounded-control text-sm text-ink-2 transition-colors duration-150 hover:bg-paper hover:text-ink lg:flex ${
              collapsed ? 'justify-center px-0' : 'gap-3 px-3'
            }`}
          >
            <CaretLeft
              size={18}
              weight="regular"
              className={`shrink-0 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
              aria-hidden
            />
            <span className={collapsed ? 'sr-only' : 'truncate'}>Perkecil</span>
          </button>
          <LogoutButton collapsed={collapsed} />
        </div>
      </aside>
    </>
  );
}
