"use client";

import { useState } from "react";
import { registerOwnerSchema, type RegisterOwnerInput } from "@app-k/shared";
import { apiClient, ApiError } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

interface RegisterApiResponse {
  id: string;
  merchantId: string;
  fullName: string;
  email: string;
  role: string;
}

interface LoginApiResponse {
  accessToken: string;
}

export function useAuthRegister() {
  const [formData, setFormData] = useState<RegisterOwnerInput>({
    merchantName: "",
    fullName: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterOwnerInput, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const { success, error: toastError } = useToast();
  const router = useRouter();

  const handleChange = (field: keyof RegisterOwnerInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (serverError) setServerError(null);
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const validate = (): boolean => {
    const result = registerOwnerSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof RegisterOwnerInput, string>> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof RegisterOwnerInput;
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
      // 1. Pendaftaran Atomic Merchant & Owner
      await apiClient<RegisterApiResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      // 2. Otomatis login setelah pendaftaran berhasil
      try {
        const loginRes = await apiClient<LoginApiResponse>("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        });

        if (loginRes.accessToken) {
          success("Registrasi toko berhasil! Selamat datang di App K.", "Pendaftaran Sukses");
          login(loginRes.accessToken);
          return;
        }
      } catch (loginErr) {
        console.warn("Auto-login post registration failed, redirecting to login page:", loginErr);
      }

      // Fallback jika auto-login gagal (redirect ke /login)
      success("Toko dan akun berhasil didaftarkan! Silakan masuk.", "Pendaftaran Sukses");
      router.push("/login");
    } catch (err) {
      let message = "Gagal mendaftarkan merchant. Silakan coba lagi.";
      if (err instanceof ApiError) {
        if (err.message.includes("EMAIL_ALREADY_EXISTS") || err.message.toLowerCase().includes("email already registered")) {
          message = "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.";
        } else {
          message = err.message;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      setServerError(message);
      toastError(message, "Pendaftaran Gagal");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    formData,
    errors,
    serverError,
    isLoading,
    showPassword,
    handleChange,
    togglePasswordVisibility,
    handleSubmit,
  };
}
