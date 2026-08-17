import { readSession } from '@/lib/auth/session';
import { LogoutButton } from '@/components/auth/logout-button';

export async function Topbar() {
  const session = await readSession();
  const label = session?.merchantId ? 'Merchant' : 'Jagoan POS';

  return (
    <div className="flex h-16 items-center justify-between border-b border-line bg-surface px-8">
      <span className="text-sm font-medium text-ink">{label}</span>
      <LogoutButton />
    </div>
  );
}
