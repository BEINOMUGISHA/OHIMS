/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OHIMS Uganda — App Root with Page-Based Routing (v2)
 * Configured with HashRouter for zero-config GitHub Pages sub-route support.
 * Wraps entire app in ToastProvider for global notifications.
 * Session watcher is integrated via useSession (inside Router context).
 */

import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import ToastContainer from './components/ui/Toast';
import { ToastProvider, useToast } from './hooks/useToast';
import { useSession, flagIntentionalLogout } from './hooks/useSession';
import { User, Notification, InsurancePlan } from './types';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from './lib/supabase';
import {
  plansApi,
  usersApi,
  notificationsApi,
  authApi,
} from './lib/api';

// ── Session-aware inner app (must be inside <Router>) ──────────────────

function AppInner() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('ohims_theme');
    if (saved === 'dark') return 'dark';
    return 'light';
  });

  const { showToast } = useToast();

  // Integrate session expiry watcher
  useSession({
    onExpired: () => {
      setCurrentUser(null);
      setNotifications([]);
    },
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
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Load general platform lookup values
  const loadPlatformData = async () => {
    try {
      const [plansResult, usersResult] = await Promise.all([
        plansApi.list(),
        usersApi.list(),
      ]);
      if (plansResult.data) setPlans(plansResult.data as unknown as InsurancePlan[]);
      if (usersResult.data) setAllUsers(usersResult.data as unknown as User[]);
    } catch (e) {
      console.error('Error fetching baseline platform data:', e);
    }
  };

  // Fetch notifications for the current user
  const fetchNotifications = async (userId: string) => {
    const result = await notificationsApi.list(userId);
    if (result.data) setNotifications(result.data as unknown as Notification[]);
  };

  // Restore session from Supabase Auth session
  const restoreSession = async () => {
    const result = await authApi.getMe();
    if (result.data) {
      setCurrentUser(result.data as unknown as User);
      fetchNotifications((result.data as any).id);
    }
  };

  // Called after login/register success
  const handleLoginSuccess = async (_userId: string) => {
    setLoading(true);
    await restoreSession();
    setLoading(false);
  };

  // Handle sandbox user switcher
  const handleUserSwap = async (accountKey: string) => {
    setLoading(true);
    try {
      const demoMap: Record<string, { email: string; pass: string }> = {
        admin:    { email: 'admin@ohims.gov.ug',               pass: 'admin123' },
        staff:    { email: 'staff@ohims.gov.ug',               pass: 'staff123' },
        provider: { email: 'mulago@ohims.gov.ug',              pass: 'provider123' },
        member:   { email: 'member@ohims.gov.ug',               pass: 'member123' },
      };

      const target = demoMap[accountKey] || { email: accountKey, pass: 'member123' };
      const result = await authApi.login(target.email, target.pass);
      if (result.error) {
        showToast(result.error, 'error');
      } else if (result.data) {
        setCurrentUser((result.data as any).user as unknown as User);
        fetchNotifications((result.data as any).user.id);
        showToast(`Switched to ${accountKey.toUpperCase()} role`, 'info');
      }
    } catch (e: any) {
      console.error('User swap failed:', e);
      showToast(e?.message || 'User swap failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Mark single notification as read
  const handleMarkNotificationRead = async (id: string) => {
    const result = await notificationsApi.markRead(id);
    if (!result.error) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    }
  };

  // Clear all notifications
  const handleClearAllNotifications = async () => {
    if (!currentUser) return;
    const result = await notificationsApi.clearAll(currentUser.id);
    if (!result.error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  // Logout — flag intentional so session watcher doesn't show expiry toast
  const handleLogout = async () => {
    flagIntentionalLogout();
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime notification subscription
  useEffect(() => {
    if (!currentUser) return;
    fetchNotifications(currentUser.id);

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
        (payload) => {
          // Push new notification into state + show toast
          const n = payload.new as Notification;
          setNotifications((prev) => [n, ...prev.slice(0, 49)]);
          showToast(n.message, n.type === 'alert' ? 'warning' : n.type as any);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onUserSelected={handleUserSwap}
        allUsers={allUsers}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        onClearAllNotifications={handleClearAllNotifications}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <main className="flex-1 pb-16">
        <Routes>
          <Route path="/" element={<LandingPage plans={plans} />} />

          <Route
            path="/login"
            element={
              currentUser ? <Navigate to="/dashboard" replace /> : <Login onLoginSuccess={handleLoginSuccess} />
            }
          />

          <Route
            path="/register"
            element={
              currentUser ? <Navigate to="/dashboard" replace /> : <Register plans={plans} onLoginSuccess={handleLoginSuccess} />
            }
          />

          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute currentUser={currentUser}>
                <DashboardPage
                  currentUser={currentUser!}
                  onRefreshData={handleRefreshAllData}
                  theme={theme}
                />
              </ProtectedRoute>
            }
          />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Global toast overlay */}
      <ToastContainer />
    </div>
  );
}

// ── Root export — wraps in providers ──────────────────────────────────

export default function App() {
  return (
    <ToastProvider>
      <Router>
        <AppInner />
      </Router>
    </ToastProvider>
  );
}
