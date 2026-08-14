import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "danger" | "warning" | "info" | "neutral";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "neutral",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    success: "bg-success-light text-success-dark border-success/30",
    danger: "bg-danger-light text-danger-dark border-danger/30",
    warning: "bg-warning-light text-warning-dark border-warning/30",
    info: "bg-indigo-50 text-indigo-700 border-indigo-200",
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 font-medium",
    md: "text-xs px-2.5 py-1 font-semibold",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          variant === "success" && "bg-success",
          variant === "danger" && "bg-danger",
          variant === "warning" && "bg-warning",
          variant === "info" && "bg-indigo-600",
          variant === "neutral" && "bg-slate-400"
        )}
      />
      {children}
    </span>
  );
}
