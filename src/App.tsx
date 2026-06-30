/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PublicLanding from './components/PublicLanding';
import AuthModal from './components/AuthModal';
import MemberDashboard from './components/MemberDashboard';
import StaffDashboard from './components/StaffDashboard';
import ProviderDashboard from './components/ProviderDashboard';
import { User, Notification, InsurancePlan } from './types';
import { RefreshCw, ShieldCheck } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('ohims_theme');
    if (saved === 'dark') return 'dark';
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('ohims_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Load general platform lookup values (Plans and Sandbox Swapping users list)
  const loadPlatformData = async () => {
    try {
      const plansRes = await fetch('/api/plans');
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData);
      }

      const usersRes = await fetch('/api/users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setAllUsers(usersData);
      }
    } catch (e) {
      console.error('Error fetching baseline platform data:', e);
    }
  };

  // Fetch the active profile for the currently stored authorization token
  const fetchActiveProfile = async (token: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        
        // Save to localStorage
        localStorage.setItem('ohims_auth_token', token);
        
        // Fetch matching inbox notifications
        fetchNotifications(token);
      } else {
        // Stale or expired token
        handleLogout();
      }
    } catch (e) {
      console.error('Failed to resolve authenticated session:', e);
      handleLogout();
    }
  };

  // Fetch notifications for active logged-in user index
  const fetchNotifications = async (token: string) => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error('Failed to sync in-app notifications:', e);
    }
  };

  // Mark single notification read
  const handleMarkNotificationRead = async (id: string) => {
    const token = localStorage.getItem('ohims_auth_token');
    if (!token) return;

    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        // Simple client side optimization or refetch
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch (e) {
      console.error('Failed to dismiss notification:', e);
    }
  };

  // Clear all inbox alerts
  const handleClearAllNotifications = async () => {
    const token = localStorage.getItem('ohims_auth_token');
    if (!token) return;

    try {
      const res = await fetch('/api/notifications/clear-all', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (e) {
      console.error('Failed to empty notification drawer:', e);
    }
  };

  // Handle manual/sandbox user selection
  const handleUserSwap = async (tokenId: string) => {
    setLoading(true);
    await fetchActiveProfile(tokenId);
    setLoading(false);
  };

  // Direct login success trigger from auth modal
  const handleLoginSuccess = async (token: string) => {
    setLoading(true);
    await fetchActiveProfile(token);
    setLoading(false);
  };

  // Logout cleanups
  const handleLogout = () => {
    localStorage.removeItem('ohims_auth_token');
    setCurrentUser(null);
    setNotifications([]);
  };

  // Central callback to refresh any lists/state modified inside child components
  const handleRefreshAllData = () => {
    const token = localStorage.getItem('ohims_auth_token');
    if (token) {
      fetchNotifications(token);
      // Also potentially reload profiles or users
      loadPlatformData();
    }
  };

  // Bootstrap session checks
  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      await loadPlatformData();
      
      const storedToken = localStorage.getItem('ohims_auth_token');
      if (storedToken) {
        await fetchActiveProfile(storedToken);
      }
      setLoading(false);
    };

    initApp();
  }, []);

  // Poll for notifications if a user session exists (Module 8: real-time feedback alignment)
  useEffect(() => {
    const loggedToken = localStorage.getItem('ohims_auth_token');
    if (!loggedToken) return;

    const interval = setInterval(() => {
      fetchNotifications(loggedToken);
    }, 8000); // Poll every 8 seconds for responsive demo feedback

    return () => clearInterval(interval);
  }, [currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center text-white p-6 font-mono">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-[#0D9488] p-2.5 rounded-xl text-white">
            <ShieldCheck className="h-8 w-8 animate-pulse text-white" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-white block">Online Health Insurance Management System (OHIMS) Uganda</span>
            <span className="text-xs text-teal-400 uppercase tracking-widest block font-sans font-bold">Health Coverage Insurance</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <RefreshCw className="h-4 w-4 animate-spin text-[#0D9488]" />
          <span>Synchronizing baseline registry datasets & policyholder sessions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-[#0D9488]/20 selection:text-[#0D9488] transition-colors duration-200">
      {/* Platform Navigation rail */}
      <Navbar
        currentUser={currentUser}
        onLoginRequest={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        onUserSelected={handleUserSwap}
        allUsers={allUsers}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        onClearAllNotifications={handleClearAllNotifications}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main viewport rendering layout based on User roles */}
      <main className="flex-1 pb-16">
        {!currentUser ? (
          <PublicLanding
            plans={plans}
            onOpenAuth={() => setShowAuthModal(true)}
          />
        ) : currentUser.role === 'admin' || currentUser.role === 'staff' ? (
          <StaffDashboard
            currentUser={currentUser}
            onRefreshData={handleRefreshAllData}
          />
        ) : currentUser.role === 'provider' ? (
          <ProviderDashboard
            currentUser={currentUser}
            onRefreshData={handleRefreshAllData}
          />
        ) : (
          <MemberDashboard
            currentUser={currentUser}
            onRefreshData={handleRefreshAllData}
          />
        )}
      </main>

      {/* Pop-up modal triggers for authentication gating */}
      {showAuthModal && (
        <AuthModal
          plans={plans}
          onDismiss={() => setShowAuthModal(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </div>
  );
}
