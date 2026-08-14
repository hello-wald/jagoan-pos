import { API_BASE_URL } from "./constants";
import { getStoredToken, removeStoredToken } from "./auth";

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export class ApiError extends Error {
  statusCode: number;
  error?: string;

  constructor(message: string, statusCode: number, error?: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.error = error;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      removeStoredToken();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message = Array.isArray(data?.message)
        ? data.message.join(", ")
        : data?.message || "Terjadi kesalahan pada server.";
      throw new ApiError(message, response.status, data?.error);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Koneksi ke server terputus.",
      500
    );
  }
}
