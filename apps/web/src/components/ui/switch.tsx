import React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  id,
  className,
}: SwitchProps) {
  const switchId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <label
              htmlFor={switchId}
              className={cn(
                "text-sm font-medium text-slate-800 select-none",
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              )}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-slate-500">{description}</p>
          )}
        </div>
      )}

      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-emerald-600" : "bg-slate-300"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}
