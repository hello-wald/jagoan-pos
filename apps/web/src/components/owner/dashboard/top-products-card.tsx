import Link from 'next/link';
import type { Route } from 'next';
import { ArrowUpRight, Sparkle } from '@phosphor-icons/react';
import type { TopProducts } from '@jagoan-pos/contracts';
import { formatIdr } from '@/lib/format/currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export type TopProductsCardProps = {
  topProducts?: TopProducts | null;
  isPending?: boolean;
  className?: string;
};

export function TopProductsCard({
  topProducts,
  isPending = false,
  className = '',
}: TopProductsCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkle size={18} weight="duotone" className="text-accent" />
            <div>
              <CardTitle>5 Produk Terlaris</CardTitle>
              <CardDescription>Penyumbang omzet terbesar</CardDescription>
            </div>
          </div>
          <Link
            href={'/inventory' as Route}
            className="flex items-center gap-1 text-xs font-medium text-accent-deep hover:underline"
          >
            <span>Stok</span>
            <ArrowUpRight size={13} weight="bold" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !topProducts || topProducts.products.length === 0 ? (
          <p className="py-8 text-center text-xs text-ink-2">
            Belum ada data produk terjual pada periode ini.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {topProducts.products.map((p, index) => (
              <div
                key={p.productId}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper text-xs font-semibold text-ink-2">
                    #{index + 1}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-sm font-medium text-ink">{p.productName}</span>
                    <span className="truncate text-[11px] text-ink-2">{p.sku}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <span className="text-sm font-semibold text-ink">{formatIdr(p.revenue)}</span>
                  <span className="text-[11px] text-ink-2">{p.units} terjual</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
