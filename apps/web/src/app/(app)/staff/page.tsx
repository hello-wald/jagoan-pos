import type { Metadata } from 'next';
import { StaffView } from '@/components/owner/staff/staff-view';

export const metadata: Metadata = {
  title: 'Manajemen Kasir & Staf | POS Jagoan',
  description: 'Kelola akun kasir toko, tambahkan staf baru, dan pantau status akun kasir.',
};

export default function StaffPage() {
  return <StaffView />;
}
