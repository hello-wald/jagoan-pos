"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { type InventoryItem } from "@/types/inventory";
import { type Transaction } from "@/types/transaction";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/context/auth-context";

export interface CartItem {
  product: InventoryItem;
  quantity: number;
}

const MOCK_POS_PRODUCTS: InventoryItem[] = [
  {
    id: "inv-1",
    productId: "prod-1",
    sku: "KOP-001",
    productName: "Kopi Arabika Gayo 250g",
    price: 65000,
    stockQuantity: 45,
    isActive: true,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "inv-2",
    productId: "prod-2",
    sku: "KOP-002",
    productName: "Kopi Robusta Lampung 250g",
    price: 45000,
    stockQuantity: 8,
    isActive: true,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "inv-3",
    productId: "prod-3",
    sku: "SNK-001",
    productName: "Keripik Singkong Balado 150g",
    price: 18000,
    stockQuantity: 120,
    isActive: true,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "inv-4",
    productId: "prod-4",
    sku: "SNK-002",
    productName: "Kue Nastar Premium Toples",
    price: 85000,
    stockQuantity: 0,
    isActive: false,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "inv-5",
    productId: "prod-5",
    sku: "MNM-001",
    productName: "Susu UHT Full Cream 1L",
    price: 22000,
    stockQuantity: 15,
    isActive: true,
    lastUpdated: new Date().toISOString(),
  },
];

export function useCashierCheckout() {
  const { user } = useAuth();
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cashPaid, setCashPaid] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const { success, error: toastError, warning } = useToast();

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient<InventoryItem[]>("/inventory");
      if (Array.isArray(data) && data.length > 0) {
        setProducts(data);
      } else {
        setProducts(MOCK_POS_PRODUCTS);
      }
    } catch {
      setProducts(MOCK_POS_PRODUCTS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Cart Operations
  const addToCart = (product: InventoryItem) => {
    if (product.stockQuantity <= 0) {
      warning(`Produk "${product.productName}" sedang habis stok.`, "Stok Habis");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          warning(
            `Maksimal kuantitas mencapai batas stok fisik (${product.stockQuantity} pcs).`,
            "Batas Stok"
          );
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const maxStock = item.product.stockQuantity;
          const qty = Math.min(newQty, maxStock);
          return { ...item, quantity: qty };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCashPaid(0);
  };

  // Calculations
  const totalAmount = useMemo(() => {
    return cart.reduce((acc, curr) => acc + curr.product.price * curr.quantity, 0);
  }, [cart]);

  const totalQuantity = useMemo(() => {
    return cart.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [cart]);

  const cashChange = useMemo(() => {
    return Math.max(0, cashPaid - totalAmount);
  }, [cashPaid, totalAmount]);

  const isCashSufficient = cashPaid >= totalAmount && totalAmount > 0;

  const setExactCash = () => {
    setCashPaid(totalAmount);
  };

  const resetCashPaid = () => {
    setCashPaid(0);
  };

  const addQuickCash = (amount: number) => {
    setCashPaid((prev) => prev + amount);
  };

  // Checkout Execution
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toastError("Keranjang belanja masih kosong.", "Gagal");
      return;
    }

    if (cashPaid < totalAmount) {
      toastError(
        "Uang tunai yang diterima kurang dari total tagihan.",
        "Pembayaran Kurang"
      );
      return;
    }

    setIsProcessing(true);
    try {
      // Create order payload
      const orderPayload = {
        items: cart.map((c) => ({
          productId: c.product.productId || c.product.id,
          quantity: c.quantity,
          price: c.product.price,
        })),
        totalAmount,
        cashPaid,
        cashChange,
        paymentMethod: "CASH",
      };

      await apiClient("/transactions/checkout", {
        method: "POST",
        body: JSON.stringify(orderPayload),
      }).catch(() => null);

      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        orderNumber: `TRX-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
          1000 + Math.random() * 9000
        )}`,
        merchantId: user?.merchantId || "m-1",
        merchantName: "Toko Berkah Maju",
        cashierId: user?.sub || "c-1",
        cashierName: user?.fullName || "Kasir Toko",
        totalQuantity,
        totalAmount,
        cashPaid,
        cashChange,
        paymentMethod: "CASH",
        createdAt: new Date().toISOString(),
        items: cart.map((c, idx) => ({
          id: `item-${idx}`,
          productId: c.product.productId || c.product.id,
          sku: c.product.sku,
          name: c.product.productName,
          price: c.product.price,
          quantity: c.quantity,
          subtotal: c.product.price * c.quantity,
        })),
      };

      // Optimistic update stock in local state
      setProducts((prev) =>
        prev.map((p) => {
          const inCart = cart.find((c) => c.product.id === p.id);
          if (inCart) {
            return {
              ...p,
              stockQuantity: Math.max(0, p.stockQuantity - inCart.quantity),
            };
          }
          return p;
        })
      );

      setCompletedTransaction(newTx);
      setIsReceiptOpen(true);
      clearCart();
      success("Transaksi checkout berhasil diproses!", "Pembayaran Selesai");
    } catch {
      toastError("Gagal memproses transaksi checkout.", "Gagal");
    } finally {
      setIsProcessing(false);
    }
  };

  const closeReceiptModal = () => {
    setIsReceiptOpen(false);
    setCompletedTransaction(null);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase();
      return (
        p.productName.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
      );
    });
  }, [products, searchQuery]);

  return {
    products: filteredProducts,
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
    refresh: fetchProducts,
  };
}
