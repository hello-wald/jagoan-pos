"use client";

import React from "react";
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  Banknote,
  Printer,
  CheckCircle2,
  Store,
  Package,
  ArrowRight,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { CashierLayout } from "@/components/layouts/cashier-layout";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { useCashierCheckout } from "@/hooks/use-cashier-checkout";

export default function CashierCheckoutPage() {
  const {
    products,
    isLoading,
    searchQuery,
    setSearchQuery,
    cart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    totalAmount,
    totalQuantity,
    cashPaid,
    setCashPaid,
    cashChange,
    isCashSufficient,
    setExactCash,
    resetCashPaid,
    addQuickCash,
    isProcessing,
    handleCheckout,
    completedTransaction,
    isReceiptOpen,
    closeReceiptModal,
  } = useCashierCheckout();

  return (
    <CashierLayout>
      <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row overflow-hidden bg-slate-100">
        {/* Left Side: Product Catalog Grid */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 bg-slate-50/50">
          {/* Search Header */}
          <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between gap-4 flex-shrink-0">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari SKU atau nama produk untuk checkout..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>
            <div className="text-xs text-slate-500 font-semibold">
              Tersedia: <strong>{products.length}</strong> Produk
            </div>
          </div>

          {/* Product Cards Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {products.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400">
                <Package className="w-12 h-12 mb-2 text-slate-300" />
                <p className="font-bold text-sm text-slate-600">
                  Tidak ada produk ditemukan
                </p>
                <p className="text-xs text-slate-400">
                  Coba kata kunci pencarian SKU atau nama produk lainnya
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((prod) => {
                  const isOutOfStock = prod.stockQuantity <= 0;
                  const inCartItem = cart.find((c) => c.product.id === prod.id);

                  return (
                    <div
                      key={prod.id}
                      onClick={() => !isOutOfStock && addToCart(prod)}
                      className={`p-4 rounded-2xl bg-white border transition duration-150 flex flex-col justify-between select-none ${
                        isOutOfStock
                          ? "opacity-50 border-slate-200 cursor-not-allowed"
                          : inCartItem
                          ? "border-emerald-500 shadow-md shadow-emerald-600/10 cursor-pointer hover:border-emerald-600"
                          : "border-slate-200/90 shadow-card hover:shadow-elevated hover:border-emerald-300 cursor-pointer active:scale-[0.98]"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {prod.sku}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              isOutOfStock
                                ? "bg-rose-100 text-rose-800"
                                : prod.stockQuantity <= 5
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {isOutOfStock ? "Habis" : `${prod.stockQuantity} pcs`}
                          </span>
                        </div>

                        <h4 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-2">
                          {prod.productName}
                        </h4>
                      </div>

                      <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="font-extrabold text-emerald-700 text-sm">
                          {formatRupiah(prod.price)}
                        </span>

                        {inCartItem ? (
                          <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                            {inCartItem.quantity}
                          </span>
                        ) : (
                          <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-700 transition">
                            <Plus className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: POS Register & Cart Panel */}
        <div className="w-full md:w-[420px] lg:w-[480px] bg-white flex flex-col justify-between flex-shrink-0 shadow-lg border-l border-border z-20">
          {/* Cart Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50 flex-shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-slate-900 text-sm">
                Keranjang Belanja ({totalQuantity} Item)
              </h3>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan</span>
              </button>
            )}
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300">
                  <ShoppingCart className="w-7 h-7" />
                </div>
                <p className="font-bold text-sm text-slate-600">
                  Keranjang Masih Kosong
                </p>
                <p className="text-xs text-slate-400 max-w-[200px]">
                  Pilih produk dari katalog di sebelah kiri untuk memulai transaksi kasir
                </p>
              </div>
            ) : (
              cart.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <h5 className="font-extrabold text-slate-900 text-xs truncate">
                      {product.productName}
                    </h5>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {formatRupiah(product.price)} &times; {quantity}
                    </p>
                    <p className="font-extrabold text-emerald-700 text-xs font-mono">
                      {formatRupiah(product.price * quantity)}
                    </p>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(product.id, quantity - 1)}
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 transition"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    <span className="w-8 text-center font-bold text-xs text-slate-900 font-mono">
                      {quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => updateCartQuantity(product.id, quantity + 1)}
                      disabled={quantity >= product.stockQuantity}
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 disabled:opacity-40 transition"
                    >
                      <Plus className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => removeFromCart(product.id)}
                      className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center ml-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Payment Calculator Section */}
          <div className="p-5 bg-white border-t border-border space-y-4 flex-shrink-0 shadow-inner">
            {/* Total Tagihan */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Total Tagihan Tunai
                </span>
                <p className="text-2xl font-extrabold text-emerald-800 tracking-tight font-mono">
                  {formatRupiah(totalAmount)}
                </p>
              </div>
              <Banknote className="w-8 h-8 text-emerald-600 opacity-60" />
            </div>

            {/* Cash Input & Quick Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <label className="text-slate-700">Uang Tunai Diterima (Rp)</label>
                <div className="flex items-center gap-2.5">
                  {totalAmount > 0 && (
                    <button
                      type="button"
                      onClick={setExactCash}
                      className="text-emerald-700 hover:underline text-[11px] font-bold"
                    >
                      Uang Pas
                    </button>
                  )}
                  {cashPaid > 0 && (
                    <button
                      type="button"
                      onClick={resetCashPaid}
                      className="text-rose-600 hover:underline text-[11px] font-bold flex items-center gap-0.5"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="0"
                  value={cashPaid || ""}
                  onChange={(e) => setCashPaid(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-300 text-lg font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
                {cashPaid > 0 && (
                  <button
                    type="button"
                    onClick={resetCashPaid}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Kosongkan Nilai Tunai"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Cash Presets (Including +2k and +5k) */}
              <div className="space-y-1 pt-0.5">
                <div className="grid grid-cols-6 gap-1">
                  {[
                    { label: "+2k", amt: 2000 },
                    { label: "+5k", amt: 5000 },
                    { label: "+10k", amt: 10000 },
                    { label: "+20k", amt: 20000 },
                    { label: "+50k", amt: 50000 },
                    { label: "+100k", amt: 100000 },
                  ].map((btn) => (
                    <button
                      key={btn.amt}
                      type="button"
                      onClick={() => addQuickCash(btn.amt)}
                      className="py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 text-xs font-bold text-slate-700 transition active:scale-95 shadow-2xs"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Kembalian Banner */}
            <div className="flex items-center justify-between text-sm py-1 border-t border-slate-100">
              <span className="font-semibold text-slate-600">Kembalian:</span>
              <span
                className={`font-mono font-extrabold text-base ${
                  isCashSufficient
                    ? "text-emerald-700"
                    : cashPaid > 0
                    ? "text-rose-600"
                    : "text-slate-400"
                }`}
              >
                {formatRupiah(cashChange)}
              </span>
            </div>

            {/* Checkout Button */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={!isCashSufficient || isProcessing || cart.length === 0}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md shadow-emerald-600/25 transition duration-150 disabled:opacity-40 flex items-center justify-center gap-2 active:scale-98"
            >
              {isProcessing ? (
                "Memproses Transaksi..."
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Proses Bayar Tunai & Cetak Struk</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Struk Transaksi Selesai */}
      <Modal
        isOpen={isReceiptOpen}
        onClose={closeReceiptModal}
        title="Pembayaran Berhasil!"
        description="Transaksi telah berhasil diverifikasi dan disimpan ke basis data"
        maxWidth="md"
      >
        {completedTransaction && (
          <div className="space-y-5 pt-2">
            {/* Paper Receipt Look */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 font-sans space-y-4">
              {/* Receipt Header */}
              <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-slate-900 font-extrabold text-base">
                  <Store className="w-4 h-4 text-emerald-600" />
                  <span>{completedTransaction.merchantName || "Toko Berkah Maju"}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Struk Transaksi Pembayaran Tunai Sah
                </p>
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>{completedTransaction.orderNumber}</span>
                  <span>{formatDateIndo(completedTransaction.createdAt)}</span>
                </div>
                <div className="text-left text-[11px] text-slate-500 font-medium">
                  Kasir PIC: <strong>{completedTransaction.cashierName}</strong>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 py-1 max-h-48 overflow-y-auto">
                {completedTransaction.items.map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{item.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {item.quantity} x {formatRupiah(item.price)}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      {formatRupiah(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total & Payment Details */}
              <div className="pt-3 border-t border-dashed border-slate-300 space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between font-bold text-sm text-slate-900">
                  <span>TOTAL TAGIHAN:</span>
                  <span className="text-emerald-700">
                    {formatRupiah(completedTransaction.totalAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>UANG TUNAI:</span>
                  <span>{formatRupiah(completedTransaction.cashPaid)}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>KEMBALIAN:</span>
                  <span>{formatRupiah(completedTransaction.cashChange)}</span>
                </div>
              </div>

              {/* Footer Note */}
              <div className="pt-3 text-center text-[10px] text-slate-400 border-t border-dashed border-slate-300">
                Terima kasih atas kunjungan Anda!
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={closeReceiptModal}
                className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-semibold text-sm shadow-xs transition"
              >
                Transaksi Baru
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Struk</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </CashierLayout>
  );
}
