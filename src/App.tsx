/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OHIMS Uganda — App Root
 * All auth + data operations now go through src/lib/api.ts (Supabase-native).
 * No Express server required — works fully on GitHub Pages.
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
import { supabase } from './lib/supabase';
import {
  plansApi,
  usersApi,
  notificationsApi,
  authApi,
} from './lib/api';

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

  // Load general platform lookup values
  const loadPlatformData = async () => {
    try {
      const [plansData, usersData] = await Promise.all([
        plansApi.list(),
        usersApi.list(),
      ]);
      setPlans(plansData as unknown as InsurancePlan[]);
      setAllUsers(usersData as unknown as User[]);
    } catch (e) {
      console.error('Error fetching baseline platform data:', e);
    }
  };

  // Fetch notifications for the current user
  const fetchNotifications = async (userId: string) => {
    try {
      const data = await notificationsApi.list(userId);
      setNotifications(data as unknown as Notification[]);
    } catch (e) {
      console.error('Failed to sync in-app notifications:', e);
    }
  };

  // Restore session from Supabase Auth session
  const restoreSession = async () => {
    try {
      const profile = await authApi.getMe();
      if (profile) {
        setCurrentUser(profile as unknown as User);
        fetchNotifications(profile.id);
      }
    } catch (e) {
      console.error('Failed to restore session:', e);
    }
  };

  // Called after login success — userId is the Supabase user id
  const handleLoginSuccess = async (userId: string) => {
    setLoading(true);
    await restoreSession();
    setLoading(false);
  };

  // Handle sandbox user switcher
  const handleUserSwap = async (userId: string) => {
    setLoading(true);
    // Sign in as that user is not possible without password from client-side.
    // Instead, just load profile directly for demo sandbox display.
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (profile) {
        setCurrentUser(profile as unknown as User);
        fetchNotifications(profile.id);
      }
    } catch (e) {
      console.error('User swap failed:', e);
    }
    setLoading(false);
  };

  // Mark single notification as read
  const handleMarkNotificationRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) {
      console.error('Failed to dismiss notification:', e);
    }
  };

  // Clear all notifications
  const handleClearAllNotifications = async () => {
    if (!currentUser) return;
    try {
      await notificationsApi.clearAll(currentUser.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error('Failed to empty notification drawer:', e);
    }
  };

  // Logout
  const handleLogout = async () => {
    await authApi.logout();
    setCurrentUser(null);
    setNotifications([]);
  };

  // Refresh data after actions
  const handleRefreshAllData = () => {
    if (currentUser) {
      fetchNotifications(currentUser.id);
      loadPlatformData();
    }
  };

  // Bootstrap on load — check Supabase session
  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      await loadPlatformData();
      await restoreSession();
      setLoading(false);
    };

    initApp();

    // Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await restoreSession();
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setNotifications([]);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Realtime notification subscription — instant delivery instead of polling
  useEffect(() => {
    if (!currentUser) return;
    // Fetch immediately on login
    fetchNotifications(currentUser.id);

    // Subscribe to new rows on the notifications table for this user
    const channel = supabase
      .channel(`notifications:${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => fetchNotifications(currentUser.id)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id]);

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
          <span>Synchronizing baseline registry datasets &amp; policyholder sessions...</span>
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

      {/* Auth Modal */}
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
