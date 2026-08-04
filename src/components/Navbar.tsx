/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
  RefreshCw,
  Clock,
  Sun,
  Moon,
  UserPlus
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

  const currentRoleKey = currentUser
    ? currentUser.role === 'admin'
      ? 'admin'
      : currentUser.role === 'staff'
      ? 'staff'
      : currentUser.role === 'provider'
      ? 'provider'
      : 'member'
    : 'guest';

  return (
    <header className="bg-[#0A1628] text-white sticky top-0 z-40 shadow-md border-b border-gray-800">
      {/* Top Banner — Demo Sandbox Accounts */}
      <div className="bg-slate-950 border-b border-slate-800/80 px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">

          {/* Left: Label */}
          <div className="flex items-center gap-1.5 font-mono">
            <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-amber-400 font-bold">Demo Accounts:</span>
            <span className="text-slate-500 text-[10px] hidden sm:inline">Quick switch for testing — or</span>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="hidden sm:inline-flex items-center gap-1 text-[#0D9488] font-bold hover:text-teal-300 transition-colors cursor-pointer"
            >
              <UserPlus className="h-3 w-3" />
              <span>Register your own account →</span>
            </button>
          </div>

          {/* Right: Demo Role Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => { onLogout(); navigate('/'); }}
              className={`px-2.5 py-1 rounded-md transition-all font-semibold cursor-pointer ${
                currentRoleKey === 'guest'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >🌐 Guest</button>

            <button
              type="button"
              onClick={() => { onUserSelected('member'); navigate('/dashboard'); }}
              className={`px-2.5 py-1 rounded-md transition-all font-semibold cursor-pointer ${
                currentRoleKey === 'member'
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-900 text-teal-400 hover:bg-teal-950/40 border border-slate-800'
              }`}
            >👤 Member</button>

            <button
              type="button"
              onClick={() => { onUserSelected('admin'); navigate('/dashboard'); }}
              className={`px-2.5 py-1 rounded-md transition-all font-semibold cursor-pointer ${
                currentRoleKey === 'admin'
                  ? 'bg-purple-500 text-white font-bold shadow-sm'
                  : 'bg-slate-900 text-purple-400 hover:bg-purple-950/40 border border-slate-800'
              }`}
            >👑 Admin</button>

            <button
              type="button"
              onClick={() => { onUserSelected('staff'); navigate('/dashboard'); }}
              className={`px-2.5 py-1 rounded-md transition-all font-semibold cursor-pointer ${
                currentRoleKey === 'staff'
                  ? 'bg-blue-500 text-white font-bold shadow-sm'
                  : 'bg-slate-900 text-blue-400 hover:bg-blue-950/40 border border-slate-800'
              }`}
            >💼 Staff</button>

            <button
              type="button"
              onClick={() => { onUserSelected('provider'); navigate('/dashboard'); }}
              className={`px-2.5 py-1 rounded-md transition-all font-semibold cursor-pointer ${
                currentRoleKey === 'provider'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-900 text-emerald-400 hover:bg-emerald-950/40 border border-slate-800'
              }`}
            >🏥 Clinic</button>

            {/* Divider + Personal Account Button */}
            <span className="text-slate-700 px-1">|</span>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="px-2.5 py-1 rounded-md bg-[#0D9488] text-white font-bold hover:bg-teal-600 transition-all cursor-pointer flex items-center gap-1"
            >
              <UserPlus className="h-3 w-3" />
              Your Own Account
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Platform Name */}
          <Link
            to={currentUser ? "/dashboard" : "/"}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="bg-[#0D9488] p-2 rounded-lg text-white group-hover:bg-[#0b7e74] transition-all">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-white block text-sm sm:text-base">
                Online Health Insurance Management System (OHIMS)
              </span>
              <span className="text-[10px] text-teal-400 font-mono uppercase tracking-wider block font-bold">
                Uganda Coverage Hub
              </span>
            </div>
          </Link>

          {/* Main User Actions & Notification Panel Component */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            
            {/* Global Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              id="theme-toggle-btn"
              className="p-2 text-gray-300 hover:text-amber-400 dark:hover:text-amber-300 hover:bg-gray-800 rounded-full transition-colors font-mono cursor-pointer"
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
                  className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full transition-colors relative cursor-pointer"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-[#0D9488] text-[9px] text-white font-black h-4 w-4 rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotificationDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-xl shadow-2xl border border-gray-100 dark:border-slate-800 py-2 z-50 animate-fade-in-down">
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="font-bold text-sm text-gray-900 dark:text-white">Notifications ({unreadCount} unread)</span>
                      {notifications.length > 0 && (
                        <button
                          onClick={() => {
                            onClearAllNotifications();
                            setShowNotificationDropdown(false);
                          }}
                          className="text-xs text-[#0D9488] hover:underline font-semibold cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-8 px-4 text-center text-sm text-gray-400">
                          No current notifications.
                        </div>
                      ) : (
                        notifications.map((not) => (
                          <div
                            key={not.id}
                            className={`px-4 py-3 border-b border-gray-50 dark:border-slate-800 flex items-start space-x-3 transition-colors ${not.read ? 'opacity-60 bg-white dark:bg-slate-900' : 'bg-teal-50/40 dark:bg-teal-950/20'}`}
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
                              <div className="flex items-center space-x-1 mt-1 text-[9px] text-gray-400">
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

            {/* Profile Avatar & Navigation Links */}
            {currentUser ? (
              <div className="flex items-center space-x-3 pl-2 border-l border-gray-800">
                <div className="hidden lg:block text-right">
                  <span className="text-xs font-semibold text-white block">{currentUser.name}</span>
                  <span className="text-[10px] font-bold text-[#0D9488] bg-[#0d9488]/10 px-1.5 py-0.5 rounded-md uppercase font-sans tracking-wide">
                    {currentUser.role}
                  </span>
                </div>
                <div className="h-9 w-9 bg-teal-800 border-2 border-teal-500 text-white rounded-full flex items-center justify-center font-bold font-mono">
                  {currentUser.name.split(' ').map(n=>n[0]).join('')}
                </div>
                <button
                  id="navbar-logout-btn"
                  onClick={handleLogoutClick}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-full transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/register"
                  className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white font-medium px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5 text-[#0D9488]" />
                  <span>Register</span>
                </Link>
                <Link
                  to="/login"
                  id="navbar-login-btn"
                  className="bg-[#0D9488] hover:bg-[#0b7e74] text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
