/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Navbar — Intuitive, Classic & Vibrant UI with Glowing Navigation Buttons,
 * Glassmorphic Header, and Quick Role Portal Links.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  LogOut,
  Clock,
  Sun,
  Moon,
  UserPlus,
  ArrowRight,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { User, Notification } from '../types';

interface NavbarProps {
  currentUser: User | null;
  onLogout: () => void;
  onUserSelected: (accountKey: string) => void;
  allUsers: User[];
  notifications: Notification[];
  onMarkNotificationRead: (id: string) => void;
  onClearAllNotifications: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function Navbar({
  currentUser,
  onLogout,
  onUserSelected,
  allUsers,
  notifications,
  onMarkNotificationRead,
  onClearAllNotifications,
  theme,
  onToggleTheme
}: NavbarProps) {
  const navigate = useNavigate();
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogoutClick = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <header className="bg-[#0A1628]/95 backdrop-blur-xl text-white sticky top-0 z-40 border-b border-teal-500/20 shadow-[0_4px_30px_rgba(13,148,136,0.15)] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Platform Name */}
          <Link
            to={currentUser ? "/dashboard" : "/"}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="bg-gradient-to-br from-[#0D9488] via-[#06B6D4] to-[#10B981] p-2.5 rounded-xl text-white shadow-lg shadow-teal-500/40 group-hover:shadow-teal-400/70 group-hover:scale-105 transition-all">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-white block text-sm sm:text-base group-hover:text-teal-200 transition-colors">
                Online Health Insurance Management System (OHIMS)
              </span>
              <span className="text-[10px] text-teal-300 font-mono uppercase tracking-wider flex items-center gap-1 font-bold">
                <Sparkles className="h-2.5 w-2.5 text-teal-400 animate-pulse" />
                Uganda National Coverage Hub
              </span>
            </div>
          </Link>

          {/* Center: Glowing Role Portal Direct Nav Links (when guest) */}
          {!currentUser && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/80 border border-teal-500/20 backdrop-blur-md shadow-inner">
              <span className="text-[10px] text-teal-400 font-mono uppercase tracking-wider font-extrabold px-1">Portals:</span>
              <Link
                to="/login?role=member"
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-teal-300 bg-teal-950/40 border border-teal-500/30 hover:bg-[#0D9488] hover:text-white hover:border-teal-300 shadow-sm hover:shadow-md hover:shadow-teal-500/40 transition-all transform hover:-translate-y-0.5"
              >
                👤 Member
              </Link>
              <Link
                to="/login?role=staff"
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 hover:bg-cyan-600 hover:text-white hover:border-cyan-300 shadow-sm hover:shadow-md hover:shadow-cyan-500/40 transition-all transform hover:-translate-y-0.5"
              >
                💼 Staff
              </Link>
              <Link
                to="/login?role=provider"
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white hover:border-emerald-300 shadow-sm hover:shadow-md hover:shadow-emerald-500/40 transition-all transform hover:-translate-y-0.5"
              >
                🏥 Clinic
              </Link>
              <Link
                to="/login?role=admin"
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-purple-300 bg-purple-950/40 border border-purple-500/30 hover:bg-purple-600 hover:text-white hover:border-purple-300 shadow-sm hover:shadow-md hover:shadow-purple-500/40 transition-all transform hover:-translate-y-0.5"
              >
                👑 Admin
              </Link>
            </div>
          )}

          {/* Right: Actions, Notifications, User Avatar */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            
            {/* Global Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              id="theme-toggle-btn"
              className="p-2 text-teal-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 hover:border-teal-400 rounded-xl transition-all shadow-sm hover:shadow-md hover:shadow-teal-500/30 font-mono cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 text-amber-400" />
              ) : (
                <Moon className="h-5 w-5 text-teal-400" />
              )}
            </button>
            
            {/* Notification Bell with Dropdown */}
            {currentUser && (
              <div className="relative">
                <button
                  id="navbar-notification-btn"
                  onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                  className="p-2 text-teal-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 hover:border-teal-400 rounded-xl transition-all shadow-sm hover:shadow-md hover:shadow-teal-500/30 relative cursor-pointer"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-teal-500 to-emerald-400 text-[10px] text-white font-black h-4 w-4 rounded-full flex items-center justify-center shadow-lg shadow-teal-500/50 animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotificationDropdown && (
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-2xl shadow-2xl border border-teal-500/30 py-3 z-50 animate-fade-in-down backdrop-blur-xl">
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Bell className="h-4 w-4 text-[#0D9488]" />
                        Notifications ({unreadCount} unread)
                      </span>
                      {notifications.length > 0 && (
                        <button
                          onClick={() => {
                            onClearAllNotifications();
                            setShowNotificationDropdown(false);
                          }}
                          className="text-xs text-[#0D9488] hover:underline font-bold cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-8 px-4 text-center text-xs text-gray-400 font-mono">
                          No current notifications.
                        </div>
                      ) : (
                        notifications.map((not) => (
                          <div
                            key={not.id}
                            className={`px-4 py-3 border-b border-gray-50 dark:border-slate-800 flex items-start space-x-3 transition-colors ${not.read ? 'opacity-60 bg-white dark:bg-slate-900' : 'bg-teal-50/50 dark:bg-teal-950/30'}`}
                          >
                            <div className="mt-0.5">
                              {not.type === 'success' ? (
                                <CheckCircle className="h-4 w-4 text-[#0D9488]" />
                              ) : not.type === 'alert' ? (
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                              ) : (
                                <Info className="h-4 w-4 text-[#0A1628]" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-relaxed">{not.message}</p>
                              <div className="flex items-center space-x-1 mt-1 text-[9px] text-gray-400 font-mono">
                                <Clock className="h-2.5 w-2.5" />
                                <span>{new Date(not.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                            {!not.read && (
                              <button
                                onClick={() => onMarkNotificationRead(not.id)}
                                className="text-[9px] text-[#0D9488] hover:underline font-bold mt-0.5 cursor-pointer"
                              >
                                Dismiss
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Profile or Glowing Action Buttons */}
            {currentUser ? (
              <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
                <div className="hidden lg:block text-right">
                  <span className="text-xs font-bold text-white block">{currentUser.name}</span>
                  <span className="text-[10px] font-extrabold text-teal-300 bg-teal-950/60 border border-teal-500/30 px-2 py-0.5 rounded-md uppercase tracking-wider font-mono">
                    {currentUser.role}
                  </span>
                </div>
                <div className="h-9 w-9 bg-gradient-to-br from-[#0D9488] to-[#06B6D4] text-white rounded-xl flex items-center justify-center font-black font-mono text-sm shadow-md shadow-teal-500/30 ring-2 ring-teal-400/40">
                  {currentUser.name.split(' ').map(n=>n[0]).join('')}
                </div>
                <button
                  id="navbar-logout-btn"
                  onClick={handleLogoutClick}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition-all cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2.5">
                <Link
                  to="/register"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs text-teal-300 border border-teal-500/40 bg-teal-950/40 hover:bg-teal-500/20 hover:border-teal-300 shadow-md shadow-teal-500/20 font-bold px-4 py-2.5 rounded-xl transition-all hover:scale-[1.02]"
                >
                  <UserPlus className="h-4 w-4 text-teal-400" />
                  <span>Register</span>
                </Link>
                <Link
                  to="/login"
                  id="navbar-login-btn"
                  className="bg-gradient-to-r from-[#0D9488] via-[#06B6D4] to-[#10B981] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-teal-500/40 hover:shadow-teal-400/70 hover:scale-[1.03] active:scale-[0.98] transition-all border border-teal-300/30 flex items-center gap-1.5"
                >
                  <span>Sign In</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
