'use client';

import { useMemo, useState } from 'react';
import type { MerchantStockItem, Sale } from '@jagoan-pos/contracts';
import { AppErrorCode } from '@jagoan-pos/contracts';
import { useCashierCatalog, useCashierCategoryList, useCashierCheckout } from '@/lib/api/cashier';
import { useDebounce } from '@/hooks/use-debounce';
import { parseRupiahInput } from '@/lib/format/currency';
import { messageFor } from '@/lib/i18n/messages';
import { CheckoutReceipt } from './checkout-receipt';
import { CatalogProductCard } from './catalog-product-card';
import { CategoryFilterCards } from './category-filter-cards';
import { CheckoutCartPanel, type CartItem } from './checkout-cart-panel';
import {
  ArrowLeft,
  ArrowRight,
  MagnifyingGlass,
  Package,
  WarningCircle,
} from '@phosphor-icons/react';

const CATALOG_PAGE_SIZE = 12;

const DEFINITIVE_DOMAIN_ERRORS = new Set<AppErrorCode>([
  AppErrorCode.INSUFFICIENT_CASH,
  AppErrorCode.INSUFFICIENT_STOCK,
  AppErrorCode.PRODUCT_INACTIVE,
  AppErrorCode.PRODUCT_NOT_FOUND,
]);

export function CheckoutView() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const { data: categories = [] } = useCashierCategoryList();

  const handleCategoryChange = (nextCategoryId?: string) => {
    setCategoryId(nextCategoryId);
    setPage(1);
  };

  const {
    data: catalogData,
    isLoading: isCatalogLoading,
    error: catalogError,
  } = useCashierCatalog({
    page,
    limit: CATALOG_PAGE_SIZE,
    search: debouncedSearch,
    categoryId,
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cashReceivedInput, setCashReceivedInput] = useState<string>('');
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [checkoutError, setCheckoutError] = useState<{
    isDefinitive: boolean;
    message: string;
  } | null>(null);

  const checkoutMutation = useCashierCheckout();

  // Financial calculations
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.currentPrice * item.quantity, 0);
  }, [cart]);

  const totalQuantity = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const parsedCashReceived = useMemo(() => {
    return parseRupiahInput(cashReceivedInput) ?? 0;
  }, [cashReceivedInput]);

  const changeAmount = Math.max(0, parsedCashReceived - totalAmount);
  const isCashSufficient = cart.length > 0 && parsedCashReceived >= totalAmount;

  const isAmbiguousError = Boolean(checkoutError && !checkoutError.isDefinitive);
  const isControlsLocked = checkoutMutation.isPending || isAmbiguousError;

  // Safe idempotency lifecycle on payload change:
  // Only rotate key if previous rejection was definitive 4xx business error.
  // When an ambiguous error occurs, all mutations are locked.
  const onPayloadChange = () => {
    if (checkoutError && checkoutError.isDefinitive) {
      setIdempotencyKey(crypto.randomUUID());
      setCheckoutError(null);
    }
  };

  // Cart operations
  const addToCart = (product: MerchantStockItem) => {
    if (isControlsLocked || product.stockQuantity <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.productId === product.productId);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) return prev;
        return prev.map((item) =>
          item.product.productId === product.productId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    onPayloadChange();
  };

  const updateQuantity = (productId: string, delta: number) => {
    if (isControlsLocked) return;

    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.productId !== productId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.product.stockQuantity) return item;
          return { ...item, quantity: newQty };
        })
        .filter((item): item is CartItem => item !== null);
    });
    onPayloadChange();
  };

  const removeFromCart = (productId: string) => {
    if (isControlsLocked) return;

    setCart((prev) => prev.filter((item) => item.product.productId !== productId));
    onPayloadChange();
  };

  const clearCart = () => {
    if (isControlsLocked) return;

    setCart([]);
    setCashReceivedInput('');
    setCheckoutError(null);
    setIdempotencyKey(crypto.randomUUID());
  };

  const handleCashChange = (raw: string) => {
    if (isControlsLocked) return;
    setCashReceivedInput(raw);
    onPayloadChange();
  };

  const handleQuickCashAdd = (amount: number) => {
    if (isControlsLocked) return;
    const nextAmount = parsedCashReceived + amount;
    setCashReceivedInput(String(nextAmount));
    onPayloadChange();
  };

  const handleExactCash = () => {
    if (isControlsLocked) return;
    setCashReceivedInput(String(totalAmount));
    onPayloadChange();
  };

  const handleCheckout = async () => {
    if (!isCashSufficient || checkoutMutation.isPending) return;

    setCheckoutError(null);
    try {
      const sale = await checkoutMutation.mutateAsync({
        idempotencyKey,
        cashReceived: parsedCashReceived,
        items: cart.map((item) => ({
          productId: item.product.productId,
          quantity: item.quantity,
        })),
      });

      setCompletedSale(sale);
      setCart([]);
      setCashReceivedInput('');
      setIdempotencyKey(crypto.randomUUID());
    } catch (err) {
      const code = (err as { code?: AppErrorCode }).code;
      const isDefinitive = Boolean(code && DEFINITIVE_DOMAIN_ERRORS.has(code));
      const message = code
        ? messageFor(code)
        : err instanceof Error
          ? err.message
          : messageFor(AppErrorCode.INTERNAL_ERROR);
      setCheckoutError({ isDefinitive, message });
    }
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] w-full bg-paper">
      <div className="grid w-full grid-cols-1 items-start xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_460px]">
        {/* Left Section: Product Catalog */}
        <section
          aria-label="Katalog produk"
          className="flex min-w-0 flex-col px-4 py-5 sm:px-6 sm:py-7 xl:min-h-[calc(100dvh-4rem)] xl:border-r xl:border-line xl:px-8 2xl:px-10"
        >
          {/* Header & Search */}
          <header className="mb-6 flex flex-col gap-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.035em] text-ink sm:text-[28px]">
                  Pilih produk
                </h1>
                <p className="mt-1 max-w-[52ch] text-[13px] leading-relaxed text-ink-2">
                  Ketuk produk untuk menambahkannya ke keranjang.
                </p>
              </div>

              {catalogData ? (
                <div className="flex shrink-0 items-baseline gap-1.5 rounded-control border border-line bg-surface px-3 py-2 shadow-[0_8px_24px_rgba(23,23,26,0.04)]">
                  <span className="tabular text-lg font-semibold text-ink">
                    {catalogData.meta.total}
                  </span>
                  <span className="text-[11px] font-medium text-ink-3">produk aktif</span>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <label htmlFor="catalog-search" className="text-xs font-semibold text-ink">
                  Cari produk
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="group relative w-full max-w-xl">
                    <MagnifyingGlass
                      size={19}
                      weight="bold"
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 transition-colors group-focus-within:text-accent-deep"
                      aria-hidden
                    />
                    <input
                      id="catalog-search"
                      type="search"
                      aria-label="Cari produk"
                      disabled={isControlsLocked}
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                      }}
                      placeholder="Nama produk atau SKU"
                      className="h-12 w-full rounded-control border border-line bg-surface pl-11 pr-4 text-sm text-ink shadow-[0_8px_24px_rgba(23,23,26,0.04)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-ink-3 focus:border-accent-deep focus:ring-2 focus:ring-accent-deep/15 disabled:opacity-60 disabled:pointer-events-none"
                    />
                  </div>

                  {catalogData ? (
                    <span aria-live="polite" className="text-xs text-ink-3 sm:ml-auto">
                      {catalogData.data.length} ditampilkan
                    </span>
                  ) : null}
                </div>
              </div>

              <CategoryFilterCards
                categories={categories}
                value={categoryId}
                disabled={isControlsLocked}
                onChange={handleCategoryChange}
              />
            </div>
          </header>

          {/* Catalog Grid State */}
          {isCatalogLoading ? (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-panel border border-line bg-surface p-2.5"
                >
                  <div className="aspect-[4/3] animate-pulse rounded-control bg-line/60" />
                  <div className="px-1 pb-1 pt-3">
                    <div className="h-4 w-3/4 animate-pulse rounded-badge bg-line/60" />
                    <div className="mt-2 h-3 w-2/5 animate-pulse rounded-badge bg-line/50" />
                    <div className="mt-4 h-5 w-1/2 animate-pulse rounded-badge bg-line/60" />
                  </div>
                </div>
              ))}
            </div>
          ) : catalogError ? (
            <div className="flex min-h-[420px] flex-1 flex-col items-center justify-center rounded-panel border border-danger/20 bg-danger/5 px-6 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-panel bg-surface text-danger shadow-sm">
                <WarningCircle size={26} weight="duotone" aria-hidden />
              </div>
              <p className="text-base font-semibold text-ink">Katalog belum bisa dimuat</p>
              <p className="mt-1 max-w-[38ch] text-sm leading-relaxed text-ink-2">
                Periksa koneksi kasir, lalu muat ulang halaman untuk mencoba kembali.
              </p>
            </div>
          ) : catalogData && catalogData.data.length > 0 ? (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5">
              {catalogData.data.map((product) => {
                const inCartItem = cart.find(
                  (item) => item.product.productId === product.productId,
                );
                return (
                  <CatalogProductCard
                    key={product.productId}
                    product={product}
                    inCartQty={inCartItem?.quantity ?? 0}
                    isPending={isControlsLocked}
                    onAddToCart={addToCart}
                    onUpdateQuantity={updateQuantity}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-1 flex-col items-center justify-center rounded-panel border border-dashed border-line bg-surface px-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-panel bg-paper text-ink-3">
                <Package size={30} weight="duotone" aria-hidden />
              </div>
              <p className="text-base font-semibold text-ink">
                {debouncedSearch || categoryId ? 'Produk tidak ditemukan' : 'Katalog masih kosong'}
              </p>
              <p className="mt-1 max-w-[40ch] text-sm leading-relaxed text-ink-2">
                {debouncedSearch || categoryId
                  ? 'Tidak ada produk yang cocok dengan filter yang dipilih.'
                  : 'Belum ada produk aktif yang bisa dijual dari kasir ini.'}
              </p>
            </div>
          )}

          {/* Interactive Numbered Pagination Navigation */}
          {catalogData && catalogData.meta.totalPages > 1 ? (
            <nav
              aria-label="Navigasi halaman katalog"
              className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"
            >
              <button
                type="button"
                disabled={page <= 1 || isControlsLocked}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="flex h-9 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-xs font-semibold text-ink-2 transition-colors hover:bg-paper hover:text-ink active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
              >
                <ArrowLeft size={14} aria-hidden />
                <span>Sebelumnya</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: catalogData.meta.totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  const isActive = pageNum === catalogData.meta.page;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      disabled={isControlsLocked}
                      onClick={() => setPage(pageNum)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex h-8 w-8 items-center justify-center rounded-control text-xs font-bold transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-40 ${
                        isActive
                          ? 'bg-accent text-ink shadow-xs'
                          : 'border border-line bg-surface text-ink-2 hover:bg-paper hover:text-ink'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={page >= catalogData.meta.totalPages || isControlsLocked}
                onClick={() => setPage((current) => current + 1)}
                className="flex h-9 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-xs font-semibold text-ink-2 transition-colors hover:bg-paper hover:text-ink active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
              >
                <span>Berikutnya</span>
                <ArrowRight size={14} aria-hidden />
              </button>
            </nav>
          ) : null}
        </section>

        {/* Right Section: Cart and Payment Register Panel */}
        <CheckoutCartPanel
          cart={cart}
          totalAmount={totalAmount}
          totalQuantity={totalQuantity}
          cashReceivedInput={cashReceivedInput}
          onCashInputChange={handleCashChange}
          parsedCashReceived={parsedCashReceived}
          changeAmount={changeAmount}
          isCashSufficient={isCashSufficient}
          errorMessage={checkoutError?.message ?? null}
          isPending={checkoutMutation.isPending}
          isControlsLocked={isControlsLocked}
          isAmbiguousError={isAmbiguousError}
          onUpdateQuantity={updateQuantity}
          onRemoveFromCart={removeFromCart}
          onClearCart={clearCart}
          onCheckout={handleCheckout}
          onExactCash={handleExactCash}
          onQuickCashAdd={handleQuickCashAdd}
        />
      </div>

      {/* Completed Sale Receipt Modal */}
      {completedSale ? (
        <CheckoutReceipt
          open={Boolean(completedSale)}
          onClose={() => setCompletedSale(null)}
          sale={completedSale}
        />
      ) : null}
    </div>
  );
}
