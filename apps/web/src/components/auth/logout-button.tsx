'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SignOut } from '@phosphor-icons/react';
import { logoutAction } from '@/lib/auth/actions';

/**
 * Lives in the sidebar rail, so it is styled as a nav row rather than a
 * Button: same height, same hover, and it collapses to its icon with the rail.
 * `collapsed` is a desktop-only state — the mobile drawer is always full width.
 */
export function LogoutButton({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      title={collapsed ? 'Keluar' : undefined}
      className={`flex h-10 w-full items-center gap-3 rounded-control px-3 text-sm text-ink-2 transition-colors duration-150 hover:bg-paper hover:text-ink disabled:pointer-events-none disabled:opacity-50 ${
        collapsed ? 'lg:justify-center lg:gap-0 lg:px-0' : ''
      }`}
      onClick={() =>
        startTransition(async () => {
          await logoutAction();
          router.replace('/login');
          router.refresh();
        })
      }
    >
      <SignOut size={18} weight="regular" className="shrink-0" aria-hidden />
      <span className={collapsed ? 'truncate lg:hidden' : 'truncate'}>Keluar</span>
    </button>
  );
}
