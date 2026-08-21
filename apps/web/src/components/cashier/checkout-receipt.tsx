'use client';

import type { Sale } from '@jagoan-pos/contracts';
import { Modal } from '@/components/ui/modal';
import { formatIdr } from '@/lib/format/currency';
import { formatDateTimeWib } from '@/lib/format/date';
import { CheckCircle, Printer } from '@phosphor-icons/react';

interface CheckoutReceiptProps {
  open: boolean;
  onClose: () => void;
  sale: Sale;
}

export function CheckoutReceipt({ open, onClose, sale }: CheckoutReceiptProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Transaksi Berhasil"
      description="Struk pembayaran resmi telah dicatat oleh sistem"
      maxWidth="max-w-md"
    >
      <div className="flex flex-col gap-6">
        {/* Success Header Banner */}
        <div className="flex items-center gap-3 rounded-control border border-accent-deep/20 bg-accent-deep/5 p-3 text-accent-deep">
          <CheckCircle size={24} weight="fill" className="shrink-0" aria-hidden />
          <div className="flex flex-col">
            <span className="text-xs font-semibold">Pembayaran Diterima</span>
            <span className="text-[11px] text-ink-2">No. Transaksi: {sale.transactionNumber}</span>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div
          id="printable-receipt"
          className="flex flex-col rounded-panel border border-line bg-paper/50 p-4 font-mono text-xs text-ink"
        >
          {/* Header Store & Cashier Info */}
          <div className="flex flex-col items-center border-b border-dashed border-line pb-3 text-center">
            <span className="text-sm font-bold tracking-tight">
              {sale.merchantName || 'POS Jagoan Merchant'}
            </span>
            <span className="text-[11px] text-ink-2">{formatDateTimeWib(sale.createdAt)}</span>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-3">
              <span>Kasir: {sale.cashierName}</span>
              <span>•</span>
              <span>{sale.transactionNumber}</span>
            </div>
          </div>

          {/* Items List */}
          <div className="flex flex-col gap-2.5 py-3 border-b border-dashed border-line">
            {sale.items.map((item) => (
              <div key={item.id} className="flex justify-between items-start text-xs">
                <div className="flex flex-col pr-2">
                  <span className="font-medium">{item.productName}</span>
                  <span className="text-[11px] text-ink-3">
                    {item.quantity} x {formatIdr(item.unitPrice)}
                  </span>
                </div>
                <span className="font-semibold shrink-0">{formatIdr(item.subtotal)}</span>
              </div>
            ))}
          </div>

          {/* Financial Calculation */}
          <div className="flex flex-col gap-1.5 pt-3 text-xs">
            <div className="flex justify-between font-medium text-ink-2">
              <span>Total Qty</span>
              <span>{sale.totalQuantity} item</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-ink">
              <span>Total Belanja</span>
              <span>{formatIdr(sale.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-ink-2">
              <span>Tunai Diterima</span>
              <span>{formatIdr(sale.cashReceived)}</span>
            </div>
            <div className="flex justify-between font-semibold text-accent-deep">
              <span>Kembalian</span>
              <span>{formatIdr(sale.changeAmount)}</span>
            </div>
          </div>

          <div className="mt-4 border-t border-dashed border-line pt-2 text-center text-[10px] text-ink-3">
            Terima kasih atas kunjungan Anda!
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-control border border-line bg-surface text-xs font-semibold text-ink transition-colors hover:bg-paper"
          >
            <Printer size={16} weight="bold" aria-hidden />
            <span>Cetak Struk</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 flex-1 items-center justify-center rounded-control bg-accent-deep text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            <span>Transaksi Baru</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
