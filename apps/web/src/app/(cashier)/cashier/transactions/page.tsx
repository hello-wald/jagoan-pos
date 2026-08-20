import { CashierTransactionsView } from '@/components/cashier/transactions-view';

export const metadata = {
  title: 'Riwayat Transaksi - Kasir Jagoan POS',
  description: 'Daftar riwayat transaksi penjualan kasir toko.',
};

export default function CashierTransactionsPage() {
  return <CashierTransactionsView />;
}
