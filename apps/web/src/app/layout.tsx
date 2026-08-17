import type { Metadata } from 'next';
import { dmMono, instrumentSans } from '../lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jagoan POS',
  description: 'Sistem kasir dan manajemen katalog',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${instrumentSans.variable} ${dmMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
