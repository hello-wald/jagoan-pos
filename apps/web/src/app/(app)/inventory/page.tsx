import type { Metadata } from 'next';
import { InventoryView } from '@/components/owner/inventory-view';

export const metadata: Metadata = {
  title: 'Manajemen Inventori & Stok | Jagoan POS',
  description: 'Kelola stok fisik produk, pantau stok menipis, dan lakukan penyesuaian stok toko.',
};

export default function InventoryPage() {
  return <InventoryView />;
}
