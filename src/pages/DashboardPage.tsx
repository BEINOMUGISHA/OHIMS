/**
 * src/pages/DashboardPage.tsx
 * Independent Dashboard Page — /dashboard
 * Renders the appropriate role-based dashboard for Member, Staff/Admin, or Provider.
 */

import React from 'react';
import MemberDashboard from '../components/MemberDashboard';
import StaffDashboard from '../components/StaffDashboard';
import ProviderDashboard from '../components/ProviderDashboard';
import { User } from '../types';

interface DashboardPageProps {
  currentUser: User;
  onRefreshData: () => void;
}

export default function DashboardPage({ currentUser, onRefreshData }: DashboardPageProps) {
  if (currentUser.role === 'admin' || currentUser.role === 'staff') {
    return (
      <StaffDashboard
        currentUser={currentUser}
        onRefreshData={onRefreshData}
      />
    );
  }

  if (currentUser.role === 'provider') {
    return (
      <ProviderDashboard
        currentUser={currentUser}
        onRefreshData={onRefreshData}
      />
    );
  }

  return (
    <MemberDashboard
      currentUser={currentUser}
      onRefreshData={onRefreshData}
    />
  );
}
