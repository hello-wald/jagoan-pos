"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProductSchema } from "@/lib/schemas/product.schema";
import { type CreateProductInput } from "@/types/product";
import { apiClient, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export function useAdminCreateProduct() {
  const [formData, setFormData] = useState<CreateProductInput>({
    sku: "",
    name: "",
    price: 0,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CreateProductInput, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { success, error: toastError } = useToast();
  const router = useRouter();

  const handleChange = (field: keyof CreateProductInput, value: string | number) => {
    let formattedValue = value;
    if (field === "sku" && typeof value === "string") {
      formattedValue = value.toUpperCase().replace(/\s+/g, "-");
    } else if (field === "price") {
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

  const validate = (): boolean => {
    const result = createProductSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof CreateProductInput, string>> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof CreateProductInput;
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

    setIsLoading(true);
    try {
      await apiClient("/products", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      success(`Produk "${formData.name}" berhasil ditambahkan ke katalog global.`, "Produk Dibuat");
      router.push("/admin/products");
    } catch (err) {
      let message = "Gagal menambahkan produk baru.";
      if (err instanceof ApiError) {
        message = err.message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setServerError(message);
      toastError(message, "Gagal Membuat Produk");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    formData,
    errors,
    serverError,
    isLoading,
    handleChange,
    handleSubmit,
  };
}
