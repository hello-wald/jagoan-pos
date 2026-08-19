import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth/session';
import { Sidebar } from '@/components/layout/sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Middleware already gated this, but a layout must never assume a session.
  const session = await readSession();
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-[100dvh]">
      <Sidebar role={session.role} />
      {/* pt-20 on mobile clears the fixed drawer opener the sidebar renders. */}
      <main className="min-w-0 flex-1 px-6 pb-8 pt-20 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
