/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  LogOut,
  User as UserIcon,
  RefreshCw,
  Clock,
  Menu,
  Sun,
  Moon
} from 'lucide-react';
import { User, Notification } from '../types';

interface NavbarProps {
  currentUser: User | null;
  onLoginRequest: () => void;
  onLogout: () => void;
  onUserSelected: (userTokenId: string) => void;
  allUsers: User[];
  notifications: Notification[];
  onMarkNotificationRead: (id: string) => void;
  onClearAllNotifications: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function Navbar({
  currentUser,
  onLoginRequest,
  onLogout,
  onUserSelected,
  allUsers,
  notifications,
  onMarkNotificationRead,
  onClearAllNotifications,
  theme,
  onToggleTheme
}: NavbarProps) {
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showSandboxDropdown, setShowSandboxDropdown] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="bg-[#0A1628] text-white sticky top-0 z-40 shadow-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center space-x-3 cursor-pointer">
            <div className="bg-[#0D9488] p-2 rounded-lg text-white">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-white block text-sm sm:text-base">Online Health Insurance Management System (OHIMS)</span>
              <span className="text-[10px] text-teal-400 font-mono uppercase tracking-wider block font-bold">Uganda Coverage Hub</span>
            </div>
          </div>

          {/* Sandbox Role Quick Changer */}
          <div className="hidden md:flex items-center bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 space-x-2">
            <span className="text-xs text-amber-500 font-bold flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" /> Sandbox Swap:
            </span>
            <select
              value={currentUser ? currentUser.id : 'guest'}
              onChange={(e) => {
                if (e.target.value === 'guest') {
                  onLogout();
                } else {
                  onUserSelected(e.target.value);
                }
              }}
              className="bg-transparent text-xs text-gray-200 outline-none border-none font-medium cursor-pointer max-w-[200px]"
            >
              <option value="guest" className="bg-gray-950 text-gray-400">🌐 Public / Guest Mode</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id} className="bg-gray-950 text-white">
                  {u.role.toUpperCase()}: {u.name.split(' ')[0]}
                </option>
              ))}
            </select>
          </div>

          {/* Main User Actions & Notification Panel Component */}
          <div className="flex items-center space-x-4">
            
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
            
            {/* Notification Bell with Dropdown (Transparency requirements) */}
            {currentUser && (
              <div className="relative">
                <button
                  id="navbar-notification-btn"
                  onClick={() => {
                    setShowNotificationDropdown(!showNotificationDropdown);
                    setShowSandboxDropdown(false);
                  }}
                  className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full transition-colors relative"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-[#0D9488] text-[9px] text-white font-black h-4 w-4 rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotificationDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-white text-gray-900 rounded-xl shadow-2xl border border-gray-100 py-2 z-50 animate-fade-in-down">
                    <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                      <span className="font-bold text-sm text-gray-900">Notifications ({unreadCount} unread)</span>
                      {notifications.length > 0 && (
                        <button
                          onClick={() => {
                            onClearAllNotifications();
                            setShowNotificationDropdown(false);
                          }}
                          className="text-xs text-[#0D9488] hover:underline font-semibold"
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
                            className={`px-4 py-3 border-b border-gray-50 flex items-start space-x-3 transition-colors ${not.read ? 'opacity-60 bg-white' : 'bg-teal-50/40'}`}
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
                              <p className="text-xs font-medium text-gray-800 leading-relaxed">{not.message}</p>
                              <div className="flex items-center space-x-1 mt-1 text-[9px] text-gray-400">
                                <Clock className="h-2.5 w-2.5" />
                                <span>{new Date(not.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                            {!not.read && (
                              <button
                                onClick={() => onMarkNotificationRead(not.id)}
                                className="text-[9px] text-[#0D9488] hover:underline font-bold mt-0.5"
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

            {/* Profile Avatar & Login/Logout Action Trigger */}
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
                  onClick={onLogout}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-full transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                id="navbar-login-btn"
                onClick={onLoginRequest}
                className="bg-[#0D9488] hover:bg-[#0b7e74] text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
