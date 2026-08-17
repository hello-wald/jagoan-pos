import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth/session';
import { homeForRole } from '@/lib/auth/roles';

export default async function RootPage() {
  const session = await readSession();
  redirect(session ? homeForRole(session.role) : '/login');
}
