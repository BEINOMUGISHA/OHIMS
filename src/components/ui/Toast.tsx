/**
 * src/components/ui/Toast.tsx
 * ─────────────────────────────────────────────────────────────
 * OHIMS Uganda — Toast notification container + individual toast.
 * Reads from useToast context. Auto-dismisses with progress bar.
 * Place <ToastContainer /> once at the app root (in App.tsx).
 * ─────────────────────────────────────────────────────────────
 */

import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast, Toast, ToastType } from '../../hooks/useToast';

const TOAST_CONFIG: Record<
  ToastType,
  { icon: React.ElementType; classes: string; bar: string }
> = {
  success: {
    icon: CheckCircle,
    classes:
      'bg-white dark:bg-slate-800 border-l-4 border-emerald-500 text-slate-800 dark:text-slate-100',
    bar: 'bg-emerald-500',
  },
  error: {
    icon: XCircle,
    classes:
      'bg-white dark:bg-slate-800 border-l-4 border-red-500 text-slate-800 dark:text-slate-100',
    bar: 'bg-red-500',
  },
  warning: {
    icon: AlertTriangle,
    classes:
      'bg-white dark:bg-slate-800 border-l-4 border-amber-500 text-slate-800 dark:text-slate-100',
    bar: 'bg-amber-500',
  },
  info: {
    icon: Info,
    classes:
      'bg-white dark:bg-slate-800 border-l-4 border-blue-500 text-slate-800 dark:text-slate-100',
    bar: 'bg-blue-500',
  },
};

function SingleToast({ toast }: { toast: Toast }) {
  const { dismissToast } = useToast();
  const config = TOAST_CONFIG[toast.type];
  const { icon: Icon } = config;

  return (
    <div
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      className={[
        'relative flex items-start gap-3 w-80 rounded-xl shadow-xl px-4 py-3.5 overflow-hidden',
        'animate-in slide-in-from-right-full fade-in duration-300',
        config.classes,
      ].join(' ')}
    >
      {/* Icon */}
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5 text-current opacity-80" />

      {/* Message */}
      <p className="flex-1 text-sm leading-snug pr-1">{toast.message}</p>

      {/* Dismiss button */}
      <button
        onClick={() => dismissToast(toast.id)}
        className="flex-shrink-0 p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Progress bar */}
      <div
        className={['absolute bottom-0 left-0 h-0.5 rounded-b-xl', config.bar].join(' ')}
        style={{
          animation: `toastProgress ${toast.duration}ms linear forwards`,
        }}
      />

      <style>{`
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}

/**
 * Place this component once in App.tsx (or the root layout).
 * It renders all active toasts in a fixed overlay.
 */
export default function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <SingleToast toast={t} />
        </div>
      ))}
    </div>
  );
}
