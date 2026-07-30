/**
 * src/components/ui/LoadingSkeleton.tsx
 * ─────────────────────────────────────────────────────────────
 * OHIMS Uganda — Shimmer skeleton loaders.
 * Variants: 'card', 'table', 'stat', 'list', 'form'.
 * Used in every data-fetching section for the loading state.
 * ─────────────────────────────────────────────────────────────
 */

import React from 'react';

// ── Base shimmer element ───────────────────────────────────────

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={[
        'animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200',
        'dark:from-slate-700 dark:via-slate-600 dark:to-slate-700',
        'bg-[length:200%_100%] rounded-lg',
        className,
      ].join(' ')}
      style={{
        animation: 'shimmer 1.6s ease-in-out infinite',
      }}
    />
  );
}

const shimmerStyle = `
  @keyframes shimmer {
    0%   { background-position: 200% center; }
    100% { background-position: -200% center; }
  }
`;

// ── Stat card skeleton ─────────────────────────────────────────

function StatSkeleton() {
  return (
    <>
      <style>{shimmerStyle}</style>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <Shimmer className="h-4 w-24" />
          <Shimmer className="h-8 w-8 rounded-xl" />
        </div>
        <Shimmer className="h-7 w-20 mb-1" />
        <Shimmer className="h-3 w-32" />
      </div>
    </>
  );
}

// ── Card skeleton ──────────────────────────────────────────────

function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <>
      <style>{shimmerStyle}</style>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex items-center gap-3">
          <Shimmer className="h-10 w-10 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-4 w-3/4" />
            <Shimmer className="h-3 w-1/2" />
          </div>
        </div>
        <div className="pt-1 space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <Shimmer
              key={i}
              className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
            />
          ))}
        </div>
      </div>
    </>
  );
}

// ── Table skeleton ─────────────────────────────────────────────

function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      <style>{shimmerStyle}</style>
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <Shimmer key={i} className="h-3 w-3/4" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="border-t border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800 px-4 py-3.5 grid gap-4"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Shimmer key={c} className={`h-3 ${c === 0 ? 'w-full' : c === cols - 1 ? 'w-1/2' : 'w-4/5'}`} />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

// ── List skeleton ──────────────────────────────────────────────

function ListSkeleton({ items = 4 }: { items?: number }) {
  return (
    <>
      <style>{shimmerStyle}</style>
      <div className="space-y-2">
        {Array.from({ length: items }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700"
          >
            <Shimmer className="h-9 w-9 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Shimmer className="h-3.5 w-2/3" />
              <Shimmer className="h-3 w-1/2" />
            </div>
            <Shimmer className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </>
  );
}

// ── Form skeleton ──────────────────────────────────────────────

function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <>
      <style>{shimmerStyle}</style>
      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Shimmer className="h-3 w-24" />
            <Shimmer className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </>
  );
}

// ── Main export ────────────────────────────────────────────────

export type SkeletonVariant = 'card' | 'table' | 'stat' | 'list' | 'form';

interface LoadingSkeletonProps {
  variant: SkeletonVariant;
  count?: number;
  /** For table: number of rows; for list: number of items; for form: number of fields */
  rows?: number;
  cols?: number;
  className?: string;
}

export default function LoadingSkeleton({
  variant,
  count = 1,
  rows,
  cols,
  className = '',
}: LoadingSkeletonProps) {
  const renderOne = (key: number) => {
    switch (variant) {
      case 'stat':  return <StatSkeleton key={key} />;
      case 'table': return <TableSkeleton key={key} rows={rows} cols={cols} />;
      case 'list':  return <ListSkeleton key={key} items={rows} />;
      case 'form':  return <FormSkeleton key={key} fields={rows} />;
      default:      return <CardSkeleton key={key} lines={rows} />;
    }
  };

  return (
    <div className={['space-y-3', className].join(' ')}>
      {Array.from({ length: count }).map((_, i) => renderOne(i))}
    </div>
  );
}
