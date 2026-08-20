'use client';

import type { MerchantStockItem } from '@jagoan-pos/contracts';
import { formatIdr } from '@/lib/format/currency';
import {
  ArrowClockwise,
  Check,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Trash,
  WarningCircle,
} from '@phosphor-icons/react';

export interface CartItem {
  product: MerchantStockItem;
  quantity: number;
}

const QUICK_CASH_AMOUNTS = [10_000, 20_000, 50_000, 100_000] as const;

interface CheckoutCartPanelProps {
  cart: CartItem[];
  totalAmount: number;
  totalQuantity: number;
  cashReceivedInput: string;
  onCashInputChange: (value: string) => void;
  parsedCashReceived: number;
  changeAmount: number;
  isCashSufficient: boolean;
  errorMessage: string | null;
  isPending: boolean;
  isControlsLocked?: boolean;
  isAmbiguousError?: boolean;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  onExactCash: () => void;
  onQuickCashAdd: (amount: number) => void;
}

export function CheckoutCartPanel({
  cart,
  totalAmount,
  totalQuantity,
  cashReceivedInput,
  onCashInputChange,
  parsedCashReceived,
  changeAmount,
  isCashSufficient,
  errorMessage,
  isPending,
  isControlsLocked = false,
  isAmbiguousError = false,
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
  onCheckout,
  onExactCash,
  onQuickCashAdd,
}: CheckoutCartPanelProps) {
  const isLocked = isPending || isControlsLocked;
  return (
    <aside
      aria-label="Keranjang dan pembayaran"
      className="flex w-full flex-col border-t border-line bg-surface xl:sticky xl:top-16 xl:h-[calc(100dvh-4rem)] xl:border-t-0"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-panel bg-accent text-ink">
            <ShoppingCart size={20} weight="bold" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-ink">Keranjang</h2>
            <p className="text-[11px] text-ink-3" aria-live="polite">
              <span>{cart.length} produk</span>
              <span aria-hidden>, </span>
              <span>{totalQuantity} pcs</span>
            </p>
          </div>
        </div>

        {cart.length > 0 ? (
          <button
            type="button"
            disabled={isLocked}
            onClick={onClearCart}
            className="flex h-9 items-center gap-1.5 rounded-control px-2.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/5 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
          >
            <Trash size={14} weight="bold" aria-hidden />
            <span>Kosongkan</span>
          </button>
        ) : null}
      </div>

      {/* Error Alert */}
      {errorMessage ? (
        <div
          role="alert"
          className="mx-4 mt-4 flex items-start gap-2.5 rounded-panel border border-danger/25 bg-danger/5 p-3 text-xs text-danger sm:mx-6"
        >
          <WarningCircle size={17} weight="fill" className="mt-px shrink-0" aria-hidden />
          <span className="flex-1 font-medium leading-relaxed">{errorMessage}</span>
        </div>
      ) : null}

      {/* Cart Content: Scrollable Items List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-6">
        {cart.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-control border border-dashed border-line bg-paper/60 p-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-control bg-surface text-ink-3 shadow-2xs">
              <ShoppingCart size={24} weight="duotone" aria-hidden />
            </div>
            <p className="text-sm font-semibold text-ink">Keranjang masih kosong</p>
            <p className="mt-1 max-w-[28ch] text-xs leading-relaxed text-ink-2">
              Pilih produk di sebelah kiri untuk memulai pesanan kasir.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {cart.map((item) => (
              <div
                key={item.product.productId}
                className="flex items-center gap-3 rounded-control border border-line/80 bg-surface p-3 shadow-2xs transition-colors"
              >
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-control bg-paper">
                  {item.product.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package size={20} weight="duotone" className="text-ink-3" aria-hidden />
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-ink">
                        {item.product.name}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-ink-3">{item.product.sku}</p>
                    </div>
                    <span
                      aria-label={`Subtotal ${item.product.name}`}
                      className="tabular shrink-0 text-[13px] font-bold text-ink"
                    >
                      {formatIdr(item.product.currentPrice * item.quantity)}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-3">
                    <span className="tabular text-[11px] text-ink-3">
                      {formatIdr(item.product.currentPrice)} per item
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center rounded-control border border-line bg-paper">
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => onUpdateQuantity(item.product.productId, -1)}
                          aria-label={`Kurangi ${item.product.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-l-control text-ink-2 transition-colors hover:bg-surface hover:text-ink active:scale-[0.96] disabled:opacity-35 disabled:pointer-events-none"
                        >
                          <Minus size={12} weight="bold" aria-hidden />
                        </button>
                        <span className="tabular w-8 text-center text-xs font-bold text-ink">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={isLocked || item.quantity >= item.product.stockQuantity}
                          onClick={() => onUpdateQuantity(item.product.productId, 1)}
                          aria-label={`Tambah ${item.product.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-r-control text-ink-2 transition-colors hover:bg-surface hover:text-ink active:scale-[0.96] disabled:opacity-35 disabled:pointer-events-none"
                        >
                          <Plus size={12} weight="bold" aria-hidden />
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={() => onRemoveFromCart(item.product.productId)}
                        aria-label={`Hapus ${item.product.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-control text-ink-3 transition-colors hover:bg-danger/5 hover:text-danger active:scale-[0.96] disabled:opacity-35 disabled:pointer-events-none"
                      >
                        <Trash size={14} aria-hidden />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment & Cash Register Bottom Section */}
      <div className="border-t border-line bg-paper/60 px-4 py-4 sm:px-6">
        <div className="mb-4 flex items-center justify-between rounded-panel bg-accent px-4 py-3 text-ink shadow-[0_12px_28px_rgba(160,98,7,0.12)]">
          <div>
            <p className="text-[11px] font-semibold">Total Tagihan</p>
            <p className="mt-0.5 text-[10px] text-ink/70">{totalQuantity} item siap dibayar</p>
          </div>
          <span className="tabular text-xl font-bold tracking-[-0.035em]">
            {formatIdr(totalAmount)}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="cash-input" className="text-xs font-semibold text-ink">
            Nominal Tunai Diterima (Rp)
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-3">
              Rp
            </span>
            <input
              id="cash-input"
              type="text"
              disabled={isLocked}
              inputMode="numeric"
              value={cashReceivedInput}
              onChange={(event) => {
                const cleaned = event.target.value.replace(/\D/g, '');
                onCashInputChange(cleaned);
              }}
              placeholder="0"
              className="tabular h-12 w-full rounded-control border border-line bg-surface pl-11 pr-4 text-base font-bold text-ink shadow-[0_8px_20px_rgba(23,23,26,0.03)] outline-none transition-[border-color,box-shadow] placeholder:text-ink-3 focus:border-accent-deep focus:ring-2 focus:ring-accent-deep/15 disabled:opacity-60 disabled:pointer-events-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={cart.length === 0 || isLocked}
              onClick={onExactCash}
              className="col-span-2 flex h-9 items-center justify-center rounded-control border border-accent-deep/30 bg-accent/15 text-xs font-bold text-ink transition-colors hover:bg-accent/25 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
            >
              Pas
            </button>
            {QUICK_CASH_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                disabled={cart.length === 0 || isLocked}
                onClick={() => onQuickCashAdd(amount)}
                className="flex h-9 items-center justify-center rounded-control border border-line bg-surface text-[11px] font-semibold text-ink-2 transition-colors hover:border-accent-deep/30 hover:bg-paper hover:text-ink active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
              >
                +{amount / 1000}k
              </button>
            ))}
          </div>
        </div>

        <div
          className={`mt-3 flex items-center justify-between rounded-control border px-3 py-2.5 text-xs ${
            isCashSufficient
              ? 'border-success/25 bg-success/5'
              : parsedCashReceived > 0 && parsedCashReceived < totalAmount
                ? 'border-danger/25 bg-danger/5'
                : 'border-line bg-surface'
          }`}
        >
          <span className="font-semibold text-ink-2">Kembalian</span>
          <span
            aria-live="polite"
            className={`tabular font-bold ${
              isCashSufficient
                ? 'text-sm text-success'
                : parsedCashReceived > 0 && parsedCashReceived < totalAmount
                  ? 'text-danger'
                  : 'text-ink-3'
            }`}
          >
            {parsedCashReceived > 0 && parsedCashReceived < totalAmount
              ? `Kurang ${formatIdr(totalAmount - parsedCashReceived)}`
              : formatIdr(changeAmount)}
          </span>
        </div>

        <button
          type="button"
          disabled={!isCashSufficient || isPending}
          onClick={onCheckout}
          className="mt-3 flex h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-control bg-accent text-sm font-bold text-ink shadow-[0_12px_26px_rgba(160,98,7,0.18)] transition-[filter,transform] hover:brightness-[0.97] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {isPending ? (
            <span>Memproses Pembayaran...</span>
          ) : isAmbiguousError ? (
            <>
              <ArrowClockwise size={18} weight="bold" aria-hidden />
              <span>Coba Lagi Transaksi Ini</span>
            </>
          ) : (
            <>
              <Check size={18} weight="bold" aria-hidden />
              <span>Proses Bayar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
