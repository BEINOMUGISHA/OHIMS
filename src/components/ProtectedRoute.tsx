/**
 * src/components/ProtectedRoute.tsx
 * Route guard component for authenticated views (e.g. /dashboard).
 * Redirects unauthenticated visitors to /login.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { User } from '../types';

interface ProtectedRouteProps {
  currentUser: User | null;
  children: React.ReactNode;
  allowedRoles?: Array<'member' | 'staff' | 'admin' | 'provider'>;
}

export default function ProtectedRoute({ currentUser, children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role as any)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
