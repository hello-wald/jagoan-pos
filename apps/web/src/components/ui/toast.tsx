"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Info, XCircle, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (options: {
    message: string;
    title?: string;
    type?: ToastType;
    duration?: number;
  }) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({
      message,
      title,
      type = "info",
      duration = 4000,
    }: {
      message: string;
      title?: string;
      type?: ToastType;
      duration?: number;
    }) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, title, message, type, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title?: string) => toast({ message, title, type: "success" }),
    [toast]
  );
  const error = useCallback(
    (message: string, title?: string) => toast({ message, title, type: "error" }),
    [toast]
  );
  const warning = useCallback(
    (message: string, title?: string) => toast({ message, title, type: "warning" }),
    [toast]
  );
  const info = useCallback(
    (message: string, title?: string) => toast({ message, title, type: "info" }),
    [toast]
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-elevated bg-white transition-all duration-300 animate-slide-up",
              t.type === "success" && "border-success/30 bg-emerald-50/50 text-slate-800",
              t.type === "error" && "border-danger/30 bg-rose-50/50 text-slate-800",
              t.type === "warning" && "border-warning/30 bg-amber-50/50 text-slate-800",
              t.type === "info" && "border-indigo-200 bg-indigo-50/50 text-slate-800"
            )}
          >
            <div className="mt-0.5 flex-shrink-0">
              {t.type === "success" && (
                <CheckCircle2 className="w-5 h-5 text-success" />
              )}
              {t.type === "error" && <XCircle className="w-5 h-5 text-danger" />}
              {t.type === "warning" && (
                <AlertCircle className="w-5 h-5 text-warning" />
              )}
              {t.type === "info" && (
                <Info className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1 text-sm">
              {t.title && <p className="font-bold text-slate-900">{t.title}</p>}
              <p className="text-slate-600 leading-relaxed">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-600 rounded p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
