'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Cube,
  Minus,
  Package,
  Plus,
  TrendDown,
  TrendUp,
} from '@phosphor-icons/react';
import type { MerchantStockItem } from '@jagoan-pos/contracts';
import { formatIdr } from '@/lib/format/currency';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/ui/status-badge';

export type StockAdjustModalProps = {
  isOpen: boolean;
  onClose: () => void;
  item: MerchantStockItem | null;
  onSave: (productId: string, stockQuantity: number) => Promise<void>;
  isSaving?: boolean;
};

export function StockAdjustModal({
  isOpen,
  onClose,
  item,
  onSave,
  isSaving = false,
}: StockAdjustModalProps) {
  const [stockInput, setStockInput] = useState<string>('0');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setStockInput(String(item.stockQuantity));
      setErrorMessage(null);
    }
  }, [item]);

  if (!item) return null;

  const handleDelta = (delta: number) => {
    const currentNum = parseInt(stockInput, 10);
    const base = isNaN(currentNum) ? 0 : currentNum;
    const next = Math.max(0, base + delta);
    setStockInput(String(next));
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stockInput.trim() === '') {
      setErrorMessage('Jumlah stok wajib diisi.');
      return;
    }

    const parsed = Number(stockInput);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setErrorMessage('Jumlah stok harus berupa bilangan bulat positif (minimal 0).');
      return;
    }

    try {
      setErrorMessage(null);
      await onSave(item.productId, parsed);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyesuaikan stok produk.';
      setErrorMessage(msg);
    }
  };

  const numericValue = Number(stockInput);
  const isValidNumber = Number.isInteger(numericValue) && numericValue >= 0;
  const isLow = item.stockQuantity > 0 && item.stockQuantity <= 10;
  const isOut = item.stockQuantity === 0;
  const diff = isValidNumber ? numericValue - item.stockQuantity : 0;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Penyesuaian Stok Fisik"
      description="Ubah jumlah stok barang fisik yang tersedia di toko Anda"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-1">
        {errorMessage ? <Banner tone="danger">{errorMessage}</Banner> : null}

        {/* Selected Product Card Banner */}
        <div className="flex flex-col gap-3 rounded-panel border border-line bg-paper/50 p-4 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-accent/15 text-accent-deep border border-accent/20">
                <Package size={22} weight="duotone" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="truncate text-sm font-semibold text-ink leading-snug">
                  {item.name}
                </span>
                <div className="mt-1 flex items-center">
                  <span
                    title={item.sku}
                    className="max-w-45 truncate font-mono rounded bg-surface px-1.5 py-0.5 border border-line text-[11px] font-medium text-ink-2"
                  >
                    {item.sku}
                  </span>
                </div>
                <span className="mt-1 text-xs font-semibold text-ink">
                  {formatIdr(item.currentPrice)}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end shrink-0 pl-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-2">
                Stok Awal
              </span>
              <div className="mt-1">
                <StatusBadge tone={isOut ? 'danger' : isLow ? 'warning' : 'success'}>
                  {item.stockQuantity} pcs
                </StatusBadge>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Value Stepper Input */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="stock-quantity-input" className="text-xs font-semibold text-ink">
              Jumlah Stok Baru
            </label>
            {isValidNumber && diff !== 0 ? (
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium ${
                  diff > 0 ? 'text-success' : 'text-danger'
                }`}
              >
                {diff > 0 ? (
                  <>
                    <TrendUp size={14} weight="bold" />
                    <span>+{diff} pcs (Restock)</span>
                  </>
                ) : (
                  <>
                    <TrendDown size={14} weight="bold" />
                    <span>{diff} pcs (Penyesuaian)</span>
                  </>
                )}
              </span>
            ) : (
              <span className="text-[11px] text-ink-2">Tidak ada perubahan</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Kurangi stok"
              onClick={() => handleDelta(-1)}
              disabled={(isValidNumber && numericValue <= 0) || isSaving}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control border border-line bg-surface text-ink transition-all hover:bg-paper active:scale-95 disabled:opacity-40 shadow-xs"
            >
              <Minus size={18} weight="bold" />
            </button>

            <div className="relative flex-1">
              <input
                id="stock-quantity-input"
                type="text"
                inputMode="numeric"
                value={stockInput}
                onChange={(e) => {
                  setStockInput(e.target.value);
                  setErrorMessage(null);
                }}
                disabled={isSaving}
                className="h-12 w-full rounded-control border border-line bg-surface px-3 text-center font-mono text-2xl font-bold text-ink focus:border-accent focus:bg-surface focus:outline-none shadow-xs"
                required
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-2">
                pcs
              </span>
            </div>

            <button
              type="button"
              aria-label="Tambah stok"
              onClick={() => handleDelta(1)}
              disabled={isSaving}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control border border-line bg-surface text-ink transition-all hover:bg-paper active:scale-95 disabled:opacity-40 shadow-xs"
            >
              <Plus size={18} weight="bold" />
            </button>
          </div>
        </div>

        {/* Quick Delta Chips */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold text-ink-2 uppercase tracking-wider">
            Aksi Cepat Restock
          </span>
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: '+5', delta: 5 },
              { label: '+10', delta: 10 },
              { label: '+50', delta: 50 },
              { label: '+100', delta: 100 },
              { label: 'Set 0', delta: -(isValidNumber ? numericValue : 0) },
            ].map((btn, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleDelta(btn.delta)}
                disabled={isSaving}
                className="rounded-control border border-line bg-surface py-2 text-xs font-semibold text-ink transition-all hover:bg-accent/10 hover:text-accent-deep hover:border-accent/40 active:scale-95 disabled:opacity-40 shadow-2xs"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Real-time Summary Box */}
        <div className="flex items-center justify-between rounded-control border border-line bg-paper/60 px-3.5 py-2.5 text-xs text-ink-2">
          <div className="flex items-center gap-1.5">
            <Cube size={15} weight="duotone" className="text-accent-deep" />
            <span>Hasil Penyesuaian:</span>
          </div>
          <div className="flex items-center gap-2 font-mono font-medium text-ink">
            <span>{item.stockQuantity} pcs</span>
            <ArrowRight size={13} weight="bold" className="text-ink-2" />
            <span className="font-bold text-accent-deep text-sm">
              {isValidNumber ? `${numericValue} pcs` : '—'}
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSaving || (isValidNumber && numericValue === item.stockQuantity)}
          >
            {isSaving ? 'Menyimpan…' : 'Simpan Stok Baru'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
