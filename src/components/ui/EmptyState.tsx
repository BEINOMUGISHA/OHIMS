/**
 * src/components/ui/EmptyState.tsx
 * ─────────────────────────────────────────────────────────────
 * OHIMS Uganda — Consistent empty-state card.
 * Used in every list/table section when data is absent.
 * Prevents sections from rendering blank or spinning forever.
 * ─────────────────────────────────────────────────────────────
 */

import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  /** Lucide icon component to display */
  icon?: LucideIcon;
  title: string;
  message?: string;
  /** Optional call-to-action button config */
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  /** Secondary action (e.g. "Learn more") */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  /** Compact variant for use inside smaller containers */
  compact?: boolean;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  action,
  secondaryAction,
  className = '',
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-14 px-6',
        className,
      ].join(' ')}
    >
      {/* Icon container */}
      <div
        className={[
          'rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4',
          compact ? 'h-12 w-12' : 'h-16 w-16',
        ].join(' ')}
      >
        <Icon
          className={[
            'text-slate-400 dark:text-slate-500',
            compact ? 'h-6 w-6' : 'h-8 w-8',
          ].join(' ')}
          strokeWidth={1.5}
        />
      </div>

      {/* Title */}
      <h3
        className={[
          'font-semibold text-slate-700 dark:text-slate-300',
          compact ? 'text-sm' : 'text-base',
        ].join(' ')}
      >
        {title}
      </h3>

      {/* Message */}
      {message && (
        <p
          className={[
            'mt-1 text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed',
            compact ? 'text-xs' : 'text-sm',
          ].join(' ')}
        >
          {message}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className={[
                'inline-flex items-center gap-2 rounded-xl font-medium transition-all',
                'bg-teal-600 hover:bg-teal-700 text-white shadow-sm active:scale-95',
                compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
              ].join(' ')}
            >
              {action.icon && <action.icon className="h-4 w-4" />}
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className={[
                'inline-flex items-center gap-2 rounded-xl font-medium transition-all',
                'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200',
                compact ? 'text-xs' : 'text-sm',
              ].join(' ')}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
