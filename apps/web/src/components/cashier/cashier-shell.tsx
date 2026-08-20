'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Route } from 'next';
import { Receipt, SignOut, Storefront, User, type Icon } from '@phosphor-icons/react';
import { logoutAction } from '@/lib/auth/actions';
import { useCurrentUser } from '@/lib/api/auth';

interface CashierShellProps {
  children: React.ReactNode;
}

type NavItem = {
  href: Route;
  label: string;
  icon: Icon;
};

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  {
    href: '/cashier/checkout' as Route,
    label: 'POS Kasir',
    icon: Storefront,
  },
  {
    href: '/cashier/transactions' as Route,
    label: 'Riwayat Transaksi',
    icon: Receipt,
  },
];

export function CashierShell({ children }: CashierShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { data: user } = useCurrentUser();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
      router.replace('/login');
      router.refresh();
    });
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface">
      {/* Top POS Header */}
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link
            href={'/cashier/checkout' as Route}
            className="flex items-center gap-2.5 text-ink transition-opacity hover:opacity-80"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-control bg-accent-deep/10 text-accent-deep">
              <Storefront size={22} weight="duotone" aria-hidden />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-tight tracking-tight">Jagoan POS</span>
              <span className="text-[11px] font-medium leading-tight text-ink-3">Mode Kasir</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-9 items-center gap-2 rounded-control px-3 text-xs font-medium transition-colors duration-150 ${
                    active
                      ? 'bg-paper text-ink shadow-xs'
                      : 'text-ink-2 hover:bg-paper/60 hover:text-ink'
                  }`}
                >
                  <IconComponent size={16} weight={active ? 'bold' : 'regular'} aria-hidden />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Info & Logout */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="hidden text-right sm:block">
              <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-ink">
                <User size={14} weight="bold" className="text-ink-3" aria-hidden />
                <span>{user.fullName}</span>
              </div>
              <div className="text-[11px] text-ink-3">
                Merchant {user.merchantName || 'Merchant'}
              </div>
            </div>
          ) : null}

          {user ? <div className="hidden h-6 w-px bg-line sm:block" /> : null}

          <button
            type="button"
            disabled={pending}
            onClick={handleLogout}
            title="Keluar"
            aria-label="Keluar"
            className="flex h-9 items-center gap-2 rounded-control border border-line bg-surface px-3 text-xs font-medium text-ink-2 transition-colors duration-150 hover:bg-paper hover:text-danger disabled:pointer-events-none disabled:opacity-50"
          >
            <SignOut size={16} weight="regular" aria-hidden />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Cashier Workspace */}
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
