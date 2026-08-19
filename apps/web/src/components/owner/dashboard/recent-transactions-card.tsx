import Link from 'next/link';
import type { Route } from 'next';
import { ArrowUpRight, Receipt } from '@phosphor-icons/react';
import type { Sale } from '@jagoan-pos/contracts';
import { formatIdr } from '@/lib/format/currency';
import { formatDateTimeWib } from '@/lib/format/date';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';

export type RecentTransactionsCardProps = {
  transactions?: Sale[];
  isPending?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  presetLabel?: string;
  className?: string;
};

export function RecentTransactionsCard({
  transactions,
  isPending = false,
  isError = false,
  onRetry,
  presetLabel,
  className = '',
}: RecentTransactionsCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt size={18} weight="duotone" className="text-accent-deep" />
            <div>
              <CardTitle>Transaksi Terbaru</CardTitle>
              <CardDescription>
                {presetLabel
                  ? `Aktivitas penjualan kasir (${presetLabel})`
                  : 'Aktivitas penjualan kasir yang baru masuk'}
              </CardDescription>
            </div>
          </div>
          <Link
            href={'/transactions' as Route}
            className="flex items-center gap-1 text-xs font-medium text-accent-deep hover:underline"
          >
            <span>Lihat Semua Transaksi</span>
            <ArrowUpRight size={13} weight="bold" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="flex flex-col items-start gap-2 py-4">
            <Banner tone="danger">Gagal memuat transaksi terbaru.</Banner>
            {onRetry ? (
              <Button variant="secondary" size="sm" onClick={onRetry}>
                Coba lagi
              </Button>
            ) : null}
          </div>
        ) : isPending ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !transactions || transactions.length === 0 ? (
          <p className="py-8 text-center text-xs text-ink-2">
            Belum ada riwayat transaksi yang tercatat pada periode ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-[11px] font-medium text-ink-2">
                  <th className="pb-2 font-medium">No. Transaksi</th>
                  <th className="pb-2 font-medium">Waktu (WIB)</th>
                  <th className="pb-2 font-medium">Kasir</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                  <th className="pb-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="transition-colors hover:bg-paper/50">
                    <td className="py-2.5 font-mono font-medium text-ink">
                      {tx.transactionNumber}
                    </td>
                    <td className="py-2.5 text-ink-2">{formatDateTimeWib(tx.createdAt)}</td>
                    <td className="py-2.5 text-ink-2">{tx.cashierName || '-'}</td>
                    <td className="py-2.5 text-right font-semibold text-ink">
                      {formatIdr(tx.totalAmount)}
                    </td>
                    <td className="py-2.5 text-right">
                      <StatusBadge tone={tx.status === 'COMPLETED' ? 'success' : 'danger'}>
                        {tx.status === 'COMPLETED' ? 'Selesai' : 'Batal'}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
