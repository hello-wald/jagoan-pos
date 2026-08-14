"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/ui/toast";

export interface MerchantProfileData {
  merchantId: string;
  merchantName: string;
  ownerName: string;
  ownerEmail: string;
  role: "OWNER";
  status: "ACTIVE";
  joinedDate: string;
  stats: {
    totalProducts: number;
    totalStaff: number;
    totalTransactionsThisMonth: number;
  };
}

const DEFAULT_PROFILE: MerchantProfileData = {
  merchantId: "m-8f7a2d1e-9b3c",
  merchantName: "Toko Berkah Maju",
  ownerName: "Budi Santoso",
  ownerEmail: "owner@tokoberkah.com",
  role: "OWNER",
  status: "ACTIVE",
  joinedDate: "12 Januari 2026",
  stats: {
    totalProducts: 5,
    totalStaff: 3,
    totalTransactionsThisMonth: 128,
  },
};

export function useOwnerProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<MerchantProfileData>(DEFAULT_PROFILE);
  const [isEditing, setIsEditing] = useState(false);
  const [merchantNameInput, setMerchantNameInput] = useState(DEFAULT_PROFILE.merchantName);
  const [isSaving, setIsSaving] = useState(false);

  const { success, error: toastError } = useToast();

  useEffect(() => {
    if (user) {
      setProfile((prev) => ({
        ...prev,
        ownerEmail: user.email || prev.ownerEmail,
        merchantId: user.merchantId || prev.merchantId,
      }));
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantNameInput.trim()) return;

    setIsSaving(true);
    try {
      // Simulate API update
      await new Promise((res) => setTimeout(res, 400));
      setProfile((prev) => ({
        ...prev,
        merchantName: merchantNameInput.trim(),
      }));
      setIsEditing(false);
      success("Nama toko berhasil diperbarui.", "Profil Tersimpan");
    } catch {
      toastError("Gagal memperbarui nama toko.", "Gagal");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    profile,
    isEditing,
    setIsEditing,
    merchantNameInput,
    setMerchantNameInput,
    isSaving,
    handleSaveProfile,
  };
}
