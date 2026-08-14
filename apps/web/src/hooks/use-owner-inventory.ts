"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  type InventoryItem,
  type InventorySummary,
  type GetInventoryApiResponse,
  type InventoryApiItem,
} from "@/types/inventory";
import { apiClient, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

const MOCK_INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: "prod-1",
    productId: "prod-1",
    sku: "KOP-001",
    productName: "Kopi Arabika Gayo 250g",
    price: 65000,
    stockQuantity: 45,
    isActive: true,
    lastUpdated: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "prod-2",
    productId: "prod-2",
    sku: "KOP-002",
    productName: "Kopi Robusta Lampung 250g",
    price: 45000,
    stockQuantity: 8,
    isActive: true,
    lastUpdated: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "prod-3",
    productId: "prod-3",
    sku: "SNK-001",
    productName: "Keripik Singkong Balado 150g",
    price: 18000,
    stockQuantity: 120,
    isActive: true,
    lastUpdated: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: "prod-4",
    productId: "prod-4",
    sku: "SNK-002",
    productName: "Kue Nastar Premium Toples",
    price: 85000,
    stockQuantity: 0,
    isActive: false,
    lastUpdated: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: "prod-5",
    productId: "prod-5",
    sku: "MNM-001",
    productName: "Susu UHT Full Cream 1L",
    price: 22000,
    stockQuantity: 5,
    isActive: true,
    lastUpdated: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

const DEFAULT_SUMMARY: InventorySummary = {
  totalProducts: 5,
  totalStockUnits: 178,
  lowStockCount: 2,
  outOfStockCount: 1,
};

export function useOwnerInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary>(DEFAULT_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"ALL" | "SAFE" | "LOW" | "OUT">("ALL");

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal State
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [newStockValue, setNewStockValue] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const { success, error: toastError } = useToast();

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const mapApiItemToInventoryItem = (apiItem: InventoryApiItem): InventoryItem => ({
    id: apiItem.productId,
    productId: apiItem.productId,
    sku: apiItem.sku,
    productName: apiItem.name,
    price: Number(apiItem.currentPrice) || 0,
    stockQuantity: apiItem.stockQuantity,
    isActive: true,
    lastUpdated: apiItem.updatedAt || new Date().toISOString(),
  });

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      });

      const response = await apiClient<GetInventoryApiResponse>(
        `/owner/inventory?${queryParams.toString()}`
      );

      if (response && Array.isArray(response.data)) {
        const mapped = response.data.map(mapApiItemToInventoryItem);
        setItems(mapped);

        if (response.meta) {
          setTotalCount(response.meta.total);
          setTotalPages(response.meta.totalPages || 1);
        }

        if (response.summary) {
          setSummary(response.summary);
        }
      } else {
        setItems(MOCK_INVENTORY_ITEMS);
        setSummary(DEFAULT_SUMMARY);
        setTotalCount(MOCK_INVENTORY_ITEMS.length);
        setTotalPages(1);
      }
    } catch {
      // Fallback mock data for offline/unconnected dev mode
      setItems(MOCK_INVENTORY_ITEMS);
      setSummary(DEFAULT_SUMMARY);
      setTotalCount(MOCK_INVENTORY_ITEMS.length);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const openAdjustModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setNewStockValue(item.stockQuantity);
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeAdjustModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
    setModalError(null);
  };

  const handleStockDelta = (delta: number) => {
    setNewStockValue((prev) => Math.max(0, prev + delta));
  };

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    if (newStockValue < 0 || !Number.isInteger(newStockValue)) {
      setModalError("Jumlah stok harus berupa bilangan bulat tidak negatif (>= 0).");
      return;
    }

    setIsSaving(true);
    setModalError(null);

    try {
      // Optimistic update
      setItems((prev) =>
        prev.map((it) =>
          it.productId === selectedItem.productId
            ? {
                ...it,
                stockQuantity: newStockValue,
                lastUpdated: new Date().toISOString(),
              }
            : it
        )
      );

      // Call Backend API Gateway endpoint: PATCH /owner/inventory/:productId
      await apiClient(`/owner/inventory/${selectedItem.productId}`, {
        method: "PATCH",
        body: JSON.stringify({ stockQuantity: newStockValue }),
      });

      success(
        `Stok "${selectedItem.productName}" berhasil disesuaikan menjadi ${newStockValue} pcs.`,
        "Stok Diperbarui"
      );
      closeAdjustModal();
      fetchInventory();
    } catch (err) {
      toastError("Gagal memperbarui jumlah stok.", "Gagal");
      setModalError("Terjadi kesalahan saat menyimpan stok.");
    } finally {
      setIsSaving(false);
    }
  };

  // Client-side quick filter for status badge tabs
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (stockFilter === "ALL") return true;
      if (stockFilter === "SAFE") return item.stockQuantity > 10;
      if (stockFilter === "LOW") return item.stockQuantity > 0 && item.stockQuantity <= 10;
      if (stockFilter === "OUT") return item.stockQuantity === 0;
      return true;
    });
  }, [items, stockFilter]);

  return {
    items: filteredItems,
    summary,
    isLoading,
    searchQuery,
    setSearchQuery,
    stockFilter,
    setStockFilter,
    page,
    setPage,
    limit,
    setLimit,
    totalPages,
    totalCount,
    selectedItem,
    newStockValue,
    setNewStockValue,
    isModalOpen,
    isSaving,
    modalError,
    openAdjustModal,
    closeAdjustModal,
    handleStockDelta,
    handleSaveStock,
    refresh: fetchInventory,
  };
}

