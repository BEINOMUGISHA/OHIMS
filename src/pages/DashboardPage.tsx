/**
 * src/pages/DashboardPage.tsx
 * Independent Dashboard Page — /dashboard
 * Renders the appropriate role-based dashboard for Member, Staff/Admin, or Provider
 * with an interactive Three.js 3D medical background canvas.
 * Lazy loaded for instant page performance.
 */

import React, { Suspense, lazy } from 'react';
import { User } from '../types';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

const MemberDashboard = lazy(() => import('../components/MemberDashboard'));
const StaffDashboard = lazy(() => import('../components/StaffDashboard'));
const ProviderDashboard = lazy(() => import('../components/ProviderDashboard'));
const ThreeBackground = lazy(() => import('../components/ThreeBackground'));

interface DashboardPageProps {
  currentUser: User;
  onRefreshData: () => void;
  theme?: 'light' | 'dark';
}

export default function DashboardPage({ currentUser, onRefreshData, theme = 'dark' }: DashboardPageProps) {
  return (
    <div className="relative min-h-screen">
      {/* Interactive Three.js 3D Medical Background */}
      <Suspense fallback={null}>
        <ThreeBackground theme={theme} />
      </Suspense>

      {/* Role Dashboard Views */}
      <div className="relative z-10">
        <Suspense fallback={
          <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
            <LoadingSkeleton variant="card" count={1} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <LoadingSkeleton variant="stat" count={3} />
            </div>
            <LoadingSkeleton variant="table" rows={6} cols={6} />
          </div>
        }>
          {currentUser.role === 'admin' || currentUser.role === 'staff' ? (
            <StaffDashboard currentUser={currentUser} onRefreshData={onRefreshData} />
          ) : currentUser.role === 'provider' ? (
            <ProviderDashboard currentUser={currentUser} onRefreshData={onRefreshData} />
          ) : (
            <MemberDashboard currentUser={currentUser} onRefreshData={onRefreshData} />
          )}
        </Suspense>
      </div>
    </div>
  );
}
