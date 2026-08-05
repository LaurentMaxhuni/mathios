"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "default" | "success" | "error";

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastRecord extends ToastInput {
  id: number;
}

interface ToastContextValue {
  toast(input: ToastInput): void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([]);

  const dismiss = React.useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = React.useCallback(
    (input: ToastInput) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { ...input, id }].slice(-3));
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cn(
              "rounded-lg border bg-card p-4 shadow-lg",
              item.variant === "success" && "border-accent/40",
              item.variant === "error" && "border-destructive/50",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                {item.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label={`Dismiss ${item.title}`}
                onClick={() => dismiss(item.id)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = React.useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider");
  return value;
}
