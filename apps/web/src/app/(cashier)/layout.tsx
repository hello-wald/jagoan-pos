import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth/session';
import { CashierShell } from '@/components/cashier/cashier-shell';

export default async function CashierLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect('/login');
  if (session.role !== 'CASHIER') redirect('/forbidden');

  return <CashierShell>{children}</CashierShell>;
}
