export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const STORAGE_KEYS = {
  ACCESS_TOKEN: "app_k_access_token",
  USER_INFO: "app_k_user_info",
} as const;

export const ROLE_REDIRECT_MAP = {
  GLOBAL_ADMIN: "/admin/products",
  OWNER: "/owner/dashboard",
  CASHIER: "/cashier/checkout",
} as const;

export type UserRole = keyof typeof ROLE_REDIRECT_MAP;

export const ROLE_LABELS: Record<UserRole, string> = {
  GLOBAL_ADMIN: "Global Admin",
  OWNER: "Merchant Owner",
  CASHIER: "Kasir",
};
