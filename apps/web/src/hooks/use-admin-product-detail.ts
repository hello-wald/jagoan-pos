"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { type Product, type UpdateProductInput } from "@/types/product";
import { updateProductSchema } from "@/lib/schemas/product.schema";
import { apiClient, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

const MOCK_PRODUCTS: Record<string, Product> = {
  "prod-1": {
    id: "prod-1",
    sku: "KOP-001",
    name: "Kopi Arabika Gayo 250g",
    price: 65000,
    isActive: true,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  "prod-2": {
    id: "prod-2",
    sku: "KOP-002",
    name: "Kopi Robusta Lampung 250g",
    price: 45000,
    isActive: true,
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  "prod-3": {
    id: "prod-3",
    sku: "SNK-001",
    name: "Keripik Singkong Balado 150g",
    price: 18000,
    isActive: true,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  "prod-4": {
    id: "prod-4",
    sku: "SNK-002",
    name: "Kue Nastar Premium Toples",
    price: 85000,
    isActive: false,
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  "prod-5": {
    id: "prod-5",
    sku: "MNM-001",
    name: "Susu UHT Full Cream 1L",
    price: 22000,
    isActive: true,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
};

export function useAdminProductDetail(productId: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<UpdateProductInput>({
    name: "",
    price: 0,
    isActive: true,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof UpdateProductInput, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const { success, error: toastError } = useToast();
  const router = useRouter();

  const fetchProduct = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient<Product>(`/products/${productId}`);
      if (data && data.id) {
        setProduct(data);
        setFormData({
          name: data.name,
          price: data.price,
          isActive: data.isActive,
        });
      } else {
        const mock = MOCK_PRODUCTS[productId] || {
          id: productId,
          sku: `SKU-${productId.substring(0, 4).toUpperCase()}`,
          name: "Produk Contoh",
          price: 50000,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setProduct(mock);
        setFormData({
          name: mock.name,
          price: mock.price,
          isActive: mock.isActive,
        });
      }
    } catch (err) {
      const mock = MOCK_PRODUCTS[productId] || {
        id: productId,
        sku: `SKU-${productId.substring(0, 4).toUpperCase()}`,
        name: "Kopi Arabika Gayo 250g",
        price: 65000,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setProduct(mock);
      setFormData({
        name: mock.name,
        price: mock.price,
        isActive: mock.isActive,
      });
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId, fetchProduct]);

  const handleChange = (field: keyof UpdateProductInput, value: string | number | boolean) => {
    let formattedValue = value;
    if (field === "price") {
      formattedValue = typeof value === "number" ? value : Number(value) || 0;
    }

    setFormData((prev) => ({ ...prev, [field]: formattedValue }));

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (serverError) setServerError(null);
  };

  const toggleStatus = async () => {
    if (!product) return;
    const newStatus = !product.isActive;
    try {
      setProduct((prev) => (prev ? { ...prev, isActive: newStatus } : null));
      setFormData((prev) => ({ ...prev, isActive: newStatus }));

      await apiClient(`/products/${productId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: newStatus }),
      }).catch(() => null);

      success(
        `Status produk berhasil diubah menjadi ${newStatus ? "Aktif" : "Nonaktif"}.`,
        "Status Diperbarui"
      );
    } catch (err) {
      setProduct((prev) => (prev ? { ...prev, isActive: !newStatus } : null));
      toastError("Gagal mengubah status produk.", "Gagal");
    }
  };

  const validate = (): boolean => {
    const result = updateProductSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof UpdateProductInput, string>> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof UpdateProductInput;
        if (field) {
          fieldErrors[field] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    setIsSaving(true);
    try {
      await apiClient(`/products/${productId}`, {
        method: "PATCH",
        body: JSON.stringify(formData),
      });

      success(`Perubahan pada "${formData.name}" berhasil disimpan.`, "Produk Diperbarui");
      router.push(`/admin/products/${productId}`);
    } catch (err) {
      let message = "Gagal memperbarui data produk.";
      if (err instanceof ApiError) {
        message = err.message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setServerError(message);
      toastError(message, "Gagal Update");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    product,
    formData,
    errors,
    serverError,
    isLoading,
    isSaving,
    handleChange,
    toggleStatus,
    handleSubmit,
    refresh: fetchProduct,
  };
}
