"use client";

import { useState } from "react";

interface Toast {
  id: number;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  action?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (toastData: Omit<Toast, "id" | "open" | "onOpenChange">) => {
    const newToast = {
      ...toastData,
      id: Date.now(),
      open: true,
      onOpenChange: (open: boolean) => {
        if (!open) {
          dismiss(newToast.id);
        }
      },
    };
    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 5000);
  };

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    toast,
    dismiss,
    toasts,
  };
};
