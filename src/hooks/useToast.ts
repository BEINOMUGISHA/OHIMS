/**
 * src/hooks/useToast.ts
 * ─────────────────────────────────────────────────────────────
 * OHIMS Uganda — Single global toast notification system.
 * Replaces all ad-hoc setXxxError / setXxxSuccess string states
 * scattered across the 3 dashboards.
 * ─────────────────────────────────────────────────────────────
 */

import React, { createContext, useContext, useCallback, useState, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number; // ms
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    if (timers.current.has(id)) {
      clearTimeout(timers.current.get(id)!);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 4500) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const toast: Toast = { id, message, type, duration };
      setToasts((prev) => [...prev.slice(-4), toast]); // max 5 visible
      const timer = setTimeout(() => dismissToast(id), duration);
      timers.current.set(id, timer);
    },
    [dismissToast]
  );

  return React.createElement(
    ToastContext.Provider,
    { value: { toasts, showToast, dismissToast } },
    children
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback so hooks used outside provider don't crash
    return {
      toasts: [],
      showToast: (msg, type) => console.warn('[useToast]', type, msg),
      dismissToast: () => {},
    };
  }
  return ctx;
}
