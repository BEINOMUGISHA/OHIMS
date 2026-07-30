/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OHIMS Uganda — App Root with Page-Based Routing
 * Configured with HashRouter for zero-config GitHub Pages sub-route support.
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

  // Called after login/register success
  const handleLoginSuccess = async (userId: string) => {
    setLoading(true);
    await restoreSession();
    setLoading(false);
  };

  // Handle sandbox user switcher with full authentications
  const handleUserSwap = async (accountKey: string) => {
    setLoading(true);
    try {
      const demoMap: Record<string, { email: string; pass: string }> = {
        admin: { email: 'admin@ohims.gov.ug', pass: 'admin123' },
        staff: { email: 'staff@ohims.gov.ug', pass: 'staff123' },
        provider: { email: 'mulago@ohims.gov.ug', pass: 'provider123' },
        member: { email: 'beinomugishainnocent2001@gmail.com', pass: 'member123' },
      };

      const target = demoMap[accountKey] || { email: accountKey, pass: 'member123' };
      const { user } = await authApi.login(target.email, target.pass);
      setCurrentUser(user as unknown as User);
      fetchNotifications(user.id);
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
    <Router>
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
                  />
                </ProtectedRoute>
              }
            />

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
