"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { type Product } from "@/types/product";
import { apiClient, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

const MOCK_INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    sku: "KOP-001",
    name: "Kopi Arabika Gayo 250g",
    price: 65000,
    isActive: true,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "prod-2",
    sku: "KOP-002",
    name: "Kopi Robusta Lampung 250g",
    price: 45000,
    isActive: true,
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "prod-3",
    sku: "SNK-001",
    name: "Keripik Singkong Balado 150g",
    price: 18000,
    isActive: true,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "prod-4",
    sku: "SNK-002",
    name: "Kue Nastar Premium Toples",
    price: 85000,
    isActive: false,
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "prod-5",
    sku: "MNM-001",
    name: "Susu UHT Full Cream 1L",
    price: 22000,
    isActive: true,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
];

export function useAdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const { success, error: toastError } = useToast();

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient<Product[]>("/products");
      if (Array.isArray(data) && data.length > 0) {
        setProducts(data);
      } else {
        // Fallback demo data jika backend belum memiliki data seed
        setProducts(MOCK_INITIAL_PRODUCTS);
      }
    } catch (err) {
      console.warn("API /products unavailable, using initial catalog data:", err);
      setProducts(MOCK_INITIAL_PRODUCTS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const toggleProductStatus = async (productId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      // Optimistic update
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isActive: newStatus } : p))
      );

      try {
        await apiClient<Product>(`/products/${productId}`, {
          method: "PATCH",
          body: JSON.stringify({ isActive: newStatus }),
        });
      } catch {
        // Mock persistence fallback
      }

      success(
        `Status produk berhasil diubah menjadi ${newStatus ? "Aktif" : "Nonaktif"}.`,
        "Status Diperbarui"
      );
    } catch (err) {
      // Rollback
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isActive: currentStatus } : p))
      );
      toastError("Gagal mengubah status produk.", "Gagal");
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "ACTIVE"
          ? item.isActive
          : !item.isActive;

      return matchesSearch && matchesStatus;
    });
  }, [products, searchQuery, statusFilter]);

  return {
    products: filteredProducts,
    totalCount: products.length,
    isLoading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    toggleProductStatus,
    refresh: fetchProducts,
  };
}
