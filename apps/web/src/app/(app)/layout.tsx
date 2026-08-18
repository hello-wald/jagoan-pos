import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth/session';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Middleware already gated this, but a layout must never assume a session.
  const session = await readSession();
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-[100dvh]">
      <Sidebar role={session.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
