import { STORAGE_KEYS, type UserRole } from "./constants";

export interface DecodedTokenPayload {
  sub: string;
  role: UserRole;
  merchantId: string | null;
  email?: string;
  fullName?: string;
  exp?: number;
  iat?: number;
}

export function decodeJwt(token: string): DecodedTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode JWT token:", error);
    return null;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
}

export function removeStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER_INFO);
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) return true;
  return Date.now() >= payload.exp * 1000;
}
