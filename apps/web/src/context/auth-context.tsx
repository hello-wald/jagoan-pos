"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  decodeJwt,
  getStoredToken,
  setStoredToken,
  removeStoredToken,
  isTokenExpired,
  type DecodedTokenPayload,
} from "@/lib/auth";
import { type UserRole, ROLE_REDIRECT_MAP } from "@/lib/constants";
import { useRouter } from "next/navigation";

interface AuthContextType {
  token: string | null;
  user: DecodedTokenPayload | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: UserRole | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<DecodedTokenPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = getStoredToken();
    if (stored && !isTokenExpired(stored)) {
      const decoded = decodeJwt(stored);
      if (decoded) {
        setToken(stored);
        setUser(decoded);
      } else {
        removeStoredToken();
      }
    } else if (stored) {
      removeStoredToken();
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string) => {
    const decoded = decodeJwt(newToken);
    if (decoded) {
      setStoredToken(newToken);
      setToken(newToken);
      setUser(decoded);

      const targetRoute = ROLE_REDIRECT_MAP[decoded.role] || "/login";
      router.push(targetRoute);
    }
  };

  const logout = () => {
    removeStoredToken();
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token && !isTokenExpired(token || ""),
        isLoading,
        role: user?.role || null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
