import type { Metadata } from 'next';
import { DashboardView } from '@/components/owner/dashboard-view';

export const metadata: Metadata = {
  title: 'Dashboard & Laporan | Jagoan POS',
  description: 'Ringkasan performa penjualan, metrik bisnis, dan analitik toko Anda.',
};

export default function DashboardPage() {
  return <DashboardView />;
}
