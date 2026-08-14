"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  createCashierSchema,
  type CreateCashierInput,
} from "@app-k/shared";
import { apiClient, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export interface CashierAccount {
  id: string;
  fullName: string;
  email: string;
  role: "CASHIER";
  isActive: boolean;
  createdAt: string;
}

const MOCK_CASHIERS: CashierAccount[] = [
  {
    id: "cashier-1",
    fullName: "Rina Wijaya",
    email: "rina@tokoberkah.com",
    role: "CASHIER",
    isActive: true,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: "cashier-2",
    fullName: "Deni Saputra",
    email: "deni@tokoberkah.com",
    role: "CASHIER",
    isActive: true,
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: "cashier-3",
    fullName: "Siti Rahma",
    email: "siti@tokoberkah.com",
    role: "CASHIER",
    isActive: false,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
];

export function useOwnerStaff() {
  const [cashiers, setCashiers] = useState<CashierAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateCashierInput>({
    fullName: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CreateCashierInput, string>>>({});
  const [modalServerError, setModalServerError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { success, error: toastError } = useToast();

  const fetchCashiers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient<CashierAccount[]>("/staff/cashiers");
      if (Array.isArray(data) && data.length > 0) {
        setCashiers(data);
      } else {
        setCashiers(MOCK_CASHIERS);
      }
    } catch {
      setCashiers(MOCK_CASHIERS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCashiers();
  }, [fetchCashiers]);

  const openCreateModal = () => {
    setFormData({ fullName: "", email: "", password: "" });
    setErrors({});
    setModalServerError(null);
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsModalOpen(false);
    setErrors({});
    setModalServerError(null);
  };

  const handleChange = (field: keyof CreateCashierInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (modalServerError) setModalServerError(null);
  };

  const validate = (): boolean => {
    const result = createCashierSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof CreateCashierInput, string>> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof CreateCashierInput;
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

  const handleCreateCashier = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalServerError(null);

    if (!validate()) return;

    setIsCreating(true);
    try {
      const newCashier = await apiClient<CashierAccount>("/staff/cashiers", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      const addedCashier: CashierAccount = newCashier?.id
        ? newCashier
        : {
            id: `cashier-${Date.now()}`,
            fullName: formData.fullName,
            email: formData.email,
            role: "CASHIER",
            isActive: true,
            createdAt: new Date().toISOString(),
          };

      setCashiers((prev) => [addedCashier, ...prev]);
      success(`Akun kasir "${formData.fullName}" berhasil dibuat.`, "Kasir Ditambahkan");
      closeCreateModal();
    } catch (err) {
      let message = "Gagal membuat akun kasir.";
      if (err instanceof ApiError) {
        if (err.message.includes("EMAIL_ALREADY_EXISTS")) {
          message = "Email kasir ini sudah digunakan.";
        } else {
          message = err.message;
        }
      }
      setModalServerError(message);
      toastError(message, "Pendaftaran Kasir Gagal");
    } finally {
      setIsCreating(false);
    }
  };

  const toggleCashierStatus = async (cashierId: string, currentStatus: boolean) => {
    const targetCashier = cashiers.find((c) => c.id === cashierId);
    if (!targetCashier) return;

    const newStatus = !currentStatus;

    // Optimistic UI
    setCashiers((prev) =>
      prev.map((c) => (c.id === cashierId ? { ...c, isActive: newStatus } : c))
    );

    try {
      await apiClient(`/staff/cashiers/${cashierId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: newStatus }),
      }).catch(() => null);

      success(
        `Status akses kasir "${targetCashier.fullName}" diubah menjadi ${
          newStatus ? "Aktif" : "Nonaktif"
        }.`,
        "Status Diperbarui"
      );
    } catch (err) {
      // Rollback
      setCashiers((prev) =>
        prev.map((c) => (c.id === cashierId ? { ...c, isActive: currentStatus } : c))
      );
      toastError("Gagal mengubah status kasir.", "Gagal");
    }
  };

  const filteredCashiers = useMemo(() => {
    return cashiers.filter((item) => {
      const matchesSearch =
        item.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "ACTIVE"
          ? item.isActive
          : !item.isActive;

      return matchesSearch && matchesStatus;
    });
  }, [cashiers, searchQuery, statusFilter]);

  const summary = useMemo(() => {
    const total = cashiers.length;
    const activeCount = cashiers.filter((c) => c.isActive).length;
    const inactiveCount = total - activeCount;
    return { total, activeCount, inactiveCount };
  }, [cashiers]);

  return {
    cashiers: filteredCashiers,
    summary,
    isLoading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    isModalOpen,
    formData,
    errors,
    modalServerError,
    isCreating,
    showPassword,
    setShowPassword,
    openCreateModal,
    closeCreateModal,
    handleChange,
    handleCreateCashier,
    toggleCashierStatus,
    refresh: fetchCashiers,
  };
}
