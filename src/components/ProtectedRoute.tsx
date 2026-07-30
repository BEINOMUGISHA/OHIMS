/**
 * src/components/ProtectedRoute.tsx
 * ─────────────────────────────────────────────────────────────
 * OHIMS Uganda — Route guard for authenticated + role-specific views.
 *
 * Distinguishes:
 *   1. Not logged in  → redirect to /login?reason=unauthenticated
 *   2. Wrong role     → friendly inline message (not a silent redirect)
 * ─────────────────────────────────────────────────────────────
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import { User } from '../types';

interface ProtectedRouteProps {
  currentUser: User | null;
  children: React.ReactNode;
  allowedRoles?: Array<'member' | 'staff' | 'admin' | 'provider'>;
}

const ROLE_LABELS: Record<string, string> = {
  member: 'Policyholder',
  staff: 'Staff / Admin',
  admin: 'Admin',
  provider: 'Healthcare Provider',
};

export default function ProtectedRoute({
  currentUser,
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const location = useLocation();

  // Case 1: Not authenticated
  if (!currentUser) {
    return (
      <Navigate
        to="/login"
        state={{ from: location, reason: 'unauthenticated' }}
        replace
      />
    );
  }

  // Case 2: Authenticated but wrong role
  if (allowedRoles && !allowedRoles.includes(currentUser.role as any)) {
    const allowed = allowedRoles.map((r) => ROLE_LABELS[r] || r).join(' or ');
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-50 dark:bg-amber-900/30 mb-5 mx-auto">
            <ShieldOff className="h-8 w-8 text-amber-500 dark:text-amber-400" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Access Restricted
          </h2>

          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
            This area is only accessible to{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{allowed}</span>{' '}
            accounts.
          </p>

          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            You are signed in as{' '}
            <span className="font-semibold text-teal-600 dark:text-teal-400">
              {currentUser.name}
            </span>{' '}
            ({ROLE_LABELS[currentUser.role] || currentUser.role}).
          </p>

          <a
            href="#/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go to My Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
