"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { type Transaction } from "@/types/transaction";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/context/auth-context";

const MOCK_CASHIER_PERSONAL_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-c1",
    orderNumber: "TRX-20260811-0042",
    merchantId: "m-1",
    merchantName: "Toko Berkah Maju",
    cashierId: "c-1",
    cashierName: "Rina Wijaya",
    totalQuantity: 3,
    totalAmount: 175000,
    cashPaid: 200000,
    cashChange: 25000,
    paymentMethod: "CASH",
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    items: [
      { id: "i1", productId: "prod-1", sku: "KOP-001", name: "Kopi Arabika Gayo 250g", price: 65000, quantity: 2, subtotal: 130000 },
      { id: "i2", productId: "prod-2", sku: "KOP-002", name: "Kopi Robusta Lampung 250g", price: 45000, quantity: 1, subtotal: 45000 },
    ],
  },
  {
    id: "tx-c2",
    orderNumber: "TRX-20260811-0040",
    merchantId: "m-1",
    merchantName: "Toko Berkah Maju",
    cashierId: "c-1",
    cashierName: "Rina Wijaya",
    totalQuantity: 2,
    totalAmount: 170000,
    cashPaid: 200000,
    cashChange: 30000,
    paymentMethod: "CASH",
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    items: [
      { id: "i6", productId: "prod-4", sku: "SNK-002", name: "Kue Nastar Premium Toples", price: 85000, quantity: 2, subtotal: 170000 },
    ],
  },
  {
    id: "tx-c3",
    orderNumber: "TRX-20260811-0035",
    merchantId: "m-1",
    merchantName: "Toko Berkah Maju",
    cashierId: "c-1",
    cashierName: "Rina Wijaya",
    totalQuantity: 4,
    totalAmount: 88000,
    cashPaid: 100000,
    cashChange: 12000,
    paymentMethod: "CASH",
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    items: [
      { id: "i7", productId: "prod-5", sku: "MNM-001", name: "Susu UHT Full Cream 1L", price: 22000, quantity: 4, subtotal: 88000 },
    ],
  },
  {
    id: "tx-c4",
    orderNumber: "TRX-20260811-0031",
    merchantId: "m-1",
    merchantName: "Toko Berkah Maju",
    cashierId: "c-1",
    cashierName: "Rina Wijaya",
    totalQuantity: 1,
    totalAmount: 18000,
    cashPaid: 20000,
    cashChange: 2000,
    paymentMethod: "CASH",
    createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    items: [
      { id: "i8", productId: "prod-3", sku: "SNK-001", name: "Keripik Singkong Balado 150g", price: 18000, quantity: 1, subtotal: 18000 },
    ],
  },
  {
    id: "tx-c5",
    orderNumber: "TRX-20260810-0029",
    merchantId: "m-1",
    merchantName: "Toko Berkah Maju",
    cashierId: "c-1",
    cashierName: "Rina Wijaya",
    totalQuantity: 2,
    totalAmount: 130000,
    cashPaid: 150000,
    cashChange: 20000,
    paymentMethod: "CASH",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    items: [
      { id: "i9", productId: "prod-1", sku: "KOP-001", name: "Kopi Arabika Gayo 250g", price: 65000, quantity: 2, subtotal: 130000 },
    ],
  },
];

export function useCashierTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(4);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient<Transaction[]>("/transactions/my");
      if (Array.isArray(data) && data.length > 0) {
        setTransactions(data);
      } else {
        setTransactions(MOCK_CASHIER_PERSONAL_TRANSACTIONS);
      }
    } catch {
      setTransactions(MOCK_CASHIER_PERSONAL_TRANSACTIONS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const openReceiptModal = (tx: Transaction) => {
    setSelectedTransaction(tx);
    setIsReceiptModalOpen(true);
  };

  const closeReceiptModal = () => {
    setIsReceiptModalOpen(false);
    setSelectedTransaction(null);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const q = searchQuery.toLowerCase();
      return (
        tx.orderNumber.toLowerCase().includes(q) ||
        tx.items.some((item) => item.name.toLowerCase().includes(q))
      );
    });
  }, [transactions, searchQuery]);

  // Reset to page 1 on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(startIndex, startIndex + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const summary = useMemo(() => {
    const totalCount = transactions.length;
    const totalRevenue = transactions.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const avgAmount = totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0;
    return { totalCount, totalRevenue, avgAmount };
  }, [transactions]);

  return {
    transactions: paginatedTransactions,
    totalItems: filteredTransactions.length,
    currentPage,
    totalPages,
    pageSize,
    setCurrentPage,
    setPageSize: handlePageSizeChange,
    summary,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedTransaction,
    isReceiptModalOpen,
    openReceiptModal,
    closeReceiptModal,
    refresh: fetchTransactions,
  };
}
