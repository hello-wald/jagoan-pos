"use client";

import { useState } from "react";
import { loginSchema, type LoginInput } from "@app-k/shared";
import { apiClient, ApiError } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/ui/toast";

interface LoginApiResponse {
  accessToken: string;
}

export function useAuthLogin() {
  const [formData, setFormData] = useState<LoginInput>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginInput, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const { success, error: toastError } = useToast();

  const handleChange = (field: keyof LoginInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field-specific error on change
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
    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof LoginInput, string>> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof LoginInput;
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
      const data = await apiClient<LoginApiResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      if (!data.accessToken) {
        throw new Error("Token otentikasi tidak ditemukan pada respons server.");
      }

      success("Login berhasil! Mengalihkan ke dashboard...", "Selamat Datang");
      login(data.accessToken);
    } catch (err) {
      let message = "Email atau password yang Anda masukkan salah.";
      if (err instanceof ApiError) {
        message = err.message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setServerError(message);
      toastError(message, "Login Gagal");
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
