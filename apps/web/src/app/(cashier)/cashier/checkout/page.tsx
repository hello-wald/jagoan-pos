import type { Metadata } from 'next';
import { CheckoutView } from '@/components/cashier/checkout-view';

export const metadata: Metadata = {
  title: 'POS Kasir | Jagoan POS',
  description: 'Proses transaksi kasir, pencarian produk dan cetak struk pembayaran.',
};

export default function CashierCheckoutPage() {
  return <CheckoutView />;
}
