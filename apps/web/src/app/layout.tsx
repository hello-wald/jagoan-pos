import type { Metadata } from 'next';
import { dmMono, instrumentSans } from '../lib/fonts';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'POS Jagoan | POS & Insight Bisnis Rice Bowl',
  description:
    'Kelola checkout, stok, transaksi, dan insight penjualan bisnis rice bowl dalam satu sistem.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${instrumentSans.variable} ${dmMono.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
