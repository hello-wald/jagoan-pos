import type { Metadata } from 'next';
import { TransactionsView } from '@/components/owner/transactions/transactions-view';

export const metadata: Metadata = {
  title: 'Riwayat Transaksi | Jagoan POS',
  description: 'Pantau riwayat transaksi penjualan toko, cek rincian pembayaran, dan cetak struk.',
};

export default function TransactionsPage() {
  return <TransactionsView />;
}
