/**
 * src/components/ui/StatusBadge.tsx
 * ─────────────────────────────────────────────────────────────
 * OHIMS Uganda — Single source of truth for status coloring.
 * Used identically in Member, Staff, and Provider dashboards.
 * ─────────────────────────────────────────────────────────────
 */

import React from 'react';
import {
  CheckCircle, Clock, XCircle, AlertCircle, DollarSign,
  RefreshCw, Shield, ShieldOff, ShieldAlert,
  Play, Pause, Ban, Archive
} from 'lucide-react';

export type StatusVariant =
  // Claim statuses
  | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid' | 'resubmitted'
  // Policy statuses
  | 'active' | 'suspended' | 'terminated' | 'cancelled' | 'expired'
  // Premium statuses
  | 'unpaid' | 'overdue'
  // Provider accreditation
  | 'accredited' | 'pending'
  // Generic
  | 'success' | 'warning' | 'error' | 'info' | 'neutral';

export type BadgeSize = 'xs' | 'sm' | 'md';

interface StatusConfig {
  label: string;
  classes: string;
  Icon: React.ElementType;
}

const STATUS_MAP: Record<StatusVariant, StatusConfig> = {
  // Claim
  submitted:    { label: 'Submitted',    classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',        Icon: Clock },
  under_review: { label: 'Under Review', classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',    Icon: RefreshCw },
  approved:     { label: 'Approved',     classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300', Icon: CheckCircle },
  rejected:     { label: 'Rejected',     classes: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',            Icon: XCircle },
  paid:         { label: 'Paid',         classes: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',    Icon: DollarSign },
  resubmitted:  { label: 'Resubmitted',  classes: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300', Icon: RefreshCw },
  // Policy
  active:       { label: 'Active',       classes: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',        Icon: Shield },
  suspended:    { label: 'Suspended',    classes: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300', Icon: Pause },
  terminated:   { label: 'Terminated',   classes: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',            Icon: Ban },
  cancelled:    { label: 'Cancelled',    classes: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',       Icon: Archive },
  expired:      { label: 'Expired',      classes: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',       Icon: Clock },
  // Premium
  unpaid:       { label: 'Unpaid',       classes: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',            Icon: AlertCircle },
  overdue:      { label: 'Overdue',      classes: 'bg-red-200 text-red-900 dark:bg-red-800/60 dark:text-red-200',            Icon: AlertCircle },
  // Provider
  accredited:   { label: 'Accredited',   classes: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',        Icon: Shield },
  pending:      { label: 'Pending',      classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',    Icon: Clock },
  // Generic
  success:      { label: 'Success',      classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300', Icon: CheckCircle },
  warning:      { label: 'Warning',      classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',    Icon: AlertCircle },
  error:        { label: 'Error',        classes: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',            Icon: XCircle },
  info:         { label: 'Info',         classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',        Icon: Clock },
  neutral:      { label: 'Neutral',      classes: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',       Icon: Play },
};

const SIZE_CLASSES: Record<BadgeSize, { badge: string; icon: string }> = {
  xs: { badge: 'px-1.5 py-0.5 text-[10px]', icon: 'h-2.5 w-2.5' },
  sm: { badge: 'px-2 py-0.5 text-xs',        icon: 'h-3 w-3'     },
  md: { badge: 'px-2.5 py-1 text-sm',        icon: 'h-3.5 w-3.5' },
};

interface StatusBadgeProps {
  status: string;
  size?: BadgeSize;
  showIcon?: boolean;
  /** Override the display label */
  label?: string;
  className?: string;
}

export default function StatusBadge({
  status,
  size = 'sm',
  showIcon = true,
  label,
  className = '',
}: StatusBadgeProps) {
  const key = status as StatusVariant;
  const config = STATUS_MAP[key] ?? STATUS_MAP.neutral;
  const sizeConfig = SIZE_CLASSES[size];
  const { Icon } = config;

  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap',
        config.classes,
        sizeConfig.badge,
        className,
      ].join(' ')}
    >
      {showIcon && <Icon className={sizeConfig.icon} />}
      {label ?? config.label}
    </span>
  );
}

/** Helper to get the raw color classes for a status (e.g. for custom elements) */
export function getStatusClasses(status: string): string {
  return (STATUS_MAP[status as StatusVariant] ?? STATUS_MAP.neutral).classes;
}
