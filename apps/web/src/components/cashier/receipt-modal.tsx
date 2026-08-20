'use client';

import { Clock, Printer, Receipt, User, XCircle } from '@phosphor-icons/react';
import { useCashierTransaction } from '@/lib/api/cashier/transactions';
import { formatIdr } from '@/lib/format/currency';
import { formatDateTimeWib } from '@/lib/format/date';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';

export type ReceiptModalProps = {
  saleId: string | null;
  isOpen: boolean;
  onClose: () => void;
};

export function ReceiptModal({ saleId, isOpen, onClose }: ReceiptModalProps) {
  const { data: sale, isPending, isError } = useCashierTransaction(saleId ?? '');

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Detail Struk Pembayaran"
      description="Rincian lengkap transaksi penjualan kasir toko."
      maxWidth="max-w-lg"
    >
      <div className="flex flex-col gap-4 pt-1">
        {isPending ? (
          <div className="flex flex-col gap-3 py-4">
            <Skeleton className="mx-auto h-6 w-48" />
            <Skeleton className="mx-auto h-4 w-32" />
            <div className="my-2 border-t border-dashed border-line" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <div className="my-2 border-t border-dashed border-line" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : isError || !sale ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <XCircle size={36} className="text-danger" weight="duotone" />
            <span className="text-sm font-semibold text-ink">Gagal Memuat Detail Transaksi</span>
            <span className="text-xs text-ink-2">
              Data transaksi tidak ditemukan atau koneksi bermasalah.
            </span>
          </div>
        ) : (
          <div className="flex flex-col rounded-panel border border-line bg-paper/60 p-5 font-sans">
            {/* Header Struk */}
            <div className="flex flex-col items-center gap-1.5 border-b border-dashed border-line pb-4 text-center">
              <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full border border-accent/20 bg-accent/15 text-accent-deep">
                <Receipt size={22} weight="duotone" />
              </div>
              <span className="text-base font-bold tracking-tight text-ink">
                {sale.merchantName}
              </span>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="rounded border border-line bg-surface px-2 py-0.5 font-mono text-xs font-semibold text-ink">
                  {sale.transactionNumber}
                </span>
                <StatusBadge tone={sale.status === 'COMPLETED' ? 'success' : 'danger'}>
                  {sale.status === 'COMPLETED' ? 'Selesai' : 'Dibatalkan'}
                </StatusBadge>
              </div>
            </div>

            {/* Metadata Kasir & Waktu */}
            <div className="flex items-center justify-between border-b border-dashed border-line py-3 text-xs text-ink-2">
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-ink-2" />
                <span>{formatDateTimeWib(sale.createdAt) ?? '—'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User size={14} className="text-ink-2" />
                <span className="font-medium text-ink">{sale.cashierName}</span>
              </div>
            </div>

            {/* Daftar Item Pembelian */}
            <div className="flex flex-col gap-2.5 border-b border-dashed border-line py-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-2">
                Item Belanja ({sale.totalQuantity} pcs)
              </span>
              <div className="flex flex-col gap-2">
                {sale.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 text-xs">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-semibold text-ink">{item.productName}</span>
                      <span className="text-[11px] text-ink-2">
                        {item.quantity} x {formatIdr(item.unitPrice)}
                      </span>
                    </div>
                    <span className="shrink-0 font-semibold text-ink">
                      {formatIdr(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Pembayaran & Kembalian */}
            <div className="flex flex-col gap-2 pt-4">
              <div className="flex items-center justify-between text-sm font-bold text-ink">
                <span>Total Pembayaran</span>
                <span className="text-base text-accent-deep">{formatIdr(sale.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-ink-2">
                <span>Tunai Diterima</span>
                <span className="font-medium text-ink">{formatIdr(sale.cashReceived)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-ink-2">
                <span>Kembalian</span>
                <span className="font-medium text-ink">{formatIdr(sale.changeAmount)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-1 flex items-center justify-between border-t border-line pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => window.print()}
            disabled={!sale || isPending}
            className="gap-1.5 text-xs text-ink-2 hover:text-ink"
          >
            <Printer size={16} />
            <span>Cetak Struk</span>
          </Button>

          <Button type="button" variant="secondary" onClick={onClose}>
            Tutup Struk
          </Button>
        </div>
      </div>
    </Modal>
  );
}
