/**
 * src/pages/DashboardPage.tsx
 * Independent Dashboard Page — /dashboard
 * Renders the appropriate role-based dashboard for Member, Staff/Admin, or Provider
 * with an interactive Three.js 3D medical background canvas.
 */

import React from 'react';
import MemberDashboard from '../components/MemberDashboard';
import StaffDashboard from '../components/StaffDashboard';
import ProviderDashboard from '../components/ProviderDashboard';
import ThreeBackground from '../components/ThreeBackground';
import { User } from '../types';

interface DashboardPageProps {
  currentUser: User;
  onRefreshData: () => void;
  theme?: 'light' | 'dark';
}

export default function DashboardPage({ currentUser, onRefreshData, theme = 'dark' }: DashboardPageProps) {
  return (
    <div className="relative min-h-screen">
      {/* Interactive Three.js 3D Medical Background */}
      <ThreeBackground theme={theme} />

      {/* Role Dashboard Views */}
      <div className="relative z-10">
        {currentUser.role === 'admin' || currentUser.role === 'staff' ? (
          <StaffDashboard currentUser={currentUser} onRefreshData={onRefreshData} />
        ) : currentUser.role === 'provider' ? (
          <ProviderDashboard currentUser={currentUser} onRefreshData={onRefreshData} />
        ) : (
          <MemberDashboard currentUser={currentUser} onRefreshData={onRefreshData} />
        )}
      </div>
    </div>
  );
}
