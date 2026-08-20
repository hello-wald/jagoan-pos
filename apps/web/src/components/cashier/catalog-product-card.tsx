'use client';

import type { MerchantStockItem } from '@jagoan-pos/contracts';
import { formatIdr } from '@/lib/format/currency';
import { Minus, Package, Plus } from '@phosphor-icons/react';

interface CatalogProductCardProps {
  product: MerchantStockItem;
  inCartQty: number;
  isPending?: boolean;
  onAddToCart: (product: MerchantStockItem) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
}

export function CatalogProductCard({
  product,
  inCartQty,
  isPending = false,
  onAddToCart,
  onUpdateQuantity,
}: CatalogProductCardProps) {
  const isOutOfStock = product.stockQuantity <= 0;
  const isMaxInCart = inCartQty >= product.stockQuantity;

  return (
    <article
      className={`group relative flex min-w-0 flex-col overflow-hidden rounded-panel border p-3 transition-[border-color,box-shadow,transform,background-color] duration-150 ${
        inCartQty > 0
          ? 'border-accent-deep/60 bg-accent/5 shadow-xs ring-1 ring-accent-deep/20'
          : 'border-line bg-surface hover:-translate-y-0.5 hover:border-accent-deep/40 hover:shadow-xs'
      } ${isOutOfStock ? 'bg-line/20 opacity-70' : ''}`}
    >
      {/* Product Click Area */}
      <button
        type="button"
        aria-label={`Tambah ${product.name} ke keranjang`}
        aria-pressed={inCartQty > 0}
        disabled={isPending || isOutOfStock || isMaxInCart}
        onClick={() => onAddToCart(product)}
        className="flex min-w-0 flex-1 cursor-pointer flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-accent-deep focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {/* Product Image & Stock Badge Overlay */}
        <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-control bg-paper">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              loading="lazy"
              className={`h-full w-full object-cover transition-transform duration-300 ${
                isOutOfStock ? 'grayscale' : 'group-hover:scale-[1.035]'
              }`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_28%_18%,rgba(232,175,37,0.16),transparent_42%)]">
              <Package size={36} weight="duotone" className="text-ink-3" aria-hidden />
            </div>
          )}

          {/* Prominent Stock Badge */}
          <div
            className={`absolute right-2 top-2 z-10 flex items-center rounded-badge px-2 py-0.5 text-xs font-bold shadow-xs ${
              isOutOfStock
                ? 'bg-danger text-white'
                : product.stockQuantity <= 3
                  ? 'bg-warning/90 text-white'
                  : 'bg-surface/90 text-ink backdrop-blur-xs'
            }`}
          >
            {isOutOfStock ? 'Stok Habis' : `Stok: ${product.stockQuantity}`}
          </div>
        </div>

        {/* Product Title & SKU */}
        <div className="flex min-h-[56px] w-full flex-col px-0.5 pt-2.5">
          <span className="line-clamp-2 text-xs font-semibold leading-snug text-ink sm:text-sm">
            {product.name}
          </span>
          <span className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">
            {product.sku}
          </span>
        </div>
      </button>

      {/* Bottom Bar: Price on Left, Mini Stepper on Bottom Right */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line/60 pt-2.5">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-semibold text-ink-3 tracking-wider">
            Harga
          </span>
          <span className="tabular text-xs font-bold tracking-tight text-ink sm:text-sm">
            {formatIdr(product.currentPrice)}
          </span>
        </div>

        {/* Bottom-Right Mini Stepper */}
        {inCartQty > 0 ? (
          <div className="flex items-center rounded-control border border-accent-deep/40 bg-surface shadow-2xs">
            <button
              type="button"
              disabled={isPending}
              onClick={() => onUpdateQuantity(product.productId, -1)}
              aria-label={`Kurangi ${product.name}`}
              className="flex h-7 w-7 items-center justify-center rounded-l-control text-ink-2 transition-colors hover:bg-paper hover:text-ink active:scale-95 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
            >
              <Minus size={12} weight="bold" aria-hidden />
            </button>
            <span
              className="tabular w-7 text-center text-xs font-bold text-accent-deep"
              aria-live="polite"
            >
              {inCartQty}
            </span>
            <button
              type="button"
              disabled={isPending || isMaxInCart}
              onClick={() => onUpdateQuantity(product.productId, 1)}
              aria-label={`Tambah ${product.name}`}
              className="flex h-7 w-7 items-center justify-center rounded-r-control text-ink-2 transition-colors hover:bg-paper hover:text-ink active:scale-95 disabled:opacity-30 cursor-pointer disabled:pointer-events-none"
            >
              <Plus size={12} weight="bold" aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={isPending || isOutOfStock}
            onClick={() => onAddToCart(product)}
            aria-label={`Pilih ${product.name}`}
            className="flex h-7 items-center gap-1 rounded-control bg-accent/20 px-2.5 text-xs font-semibold text-ink transition-colors hover:bg-accent hover:text-ink active:scale-95 disabled:opacity-30 cursor-pointer disabled:pointer-events-none"
          >
            <Plus size={12} weight="bold" aria-hidden />
            <span>Pilih</span>
          </button>
        )}
      </div>
    </article>
  );
}
