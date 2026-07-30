/**
 * src/pages/Login.tsx
 * Independent Login Page — /login
 * Direct login via Supabase Auth + Quick Sandbox Demo accounts switcher.
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, RefreshCw, KeyRound } from 'lucide-react';
import { authApi } from '../lib/api';

interface LoginPageProps {
  onLoginSuccess: (userId: string) => Promise<void>;
}

export default function Login({ onLoginSuccess }: LoginPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await authApi.login(email, password);
      if (error || !data) throw new Error(error ?? 'Authentication failed.');
      await onLoginSuccess((data as any).token ?? (data as any).user?.id);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      let msg = err?.message || 'Authentication failed. Please check credentials and try again.';
      if (typeof msg === 'string' && (msg.includes('Unexpected token') || msg.includes('<html>') || msg.includes('JSON'))) {
        msg = 'Connection refreshed. Please re-enter credentials and click Sign In again.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800">
        {/* Header Branding */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 bg-[#0D9488]/10 text-[#0D9488] rounded-2xl mb-4">
            <Shield className="h-10 w-10" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Sign in to OHIMS
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Uganda National Digital Health Insurance System
          </p>
        </div>

        {/* Quick Demo Sandbox Switcher */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/50">
          <div className="flex items-center gap-1.5 mb-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
            <KeyRound className="h-3.5 w-3.5 text-[#0D9488]" />
            <span>Sandbox Quick Demo Accounts:</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <button
              type="button"
              onClick={() => handleQuickFill('admin@ohims.gov.ug', 'admin123')}
              className="text-left px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-[#0D9488] hover:text-[#0D9488] transition-all"
            >
              <span className="font-bold block text-slate-700 dark:text-slate-200">Admin</span>
              <span className="text-[10px] text-slate-400 block truncate">admin@ohims.gov.ug</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('staff@ohims.gov.ug', 'staff123')}
              className="text-left px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-[#0D9488] hover:text-[#0D9488] transition-all"
            >
              <span className="font-bold block text-slate-700 dark:text-slate-200">Staff</span>
              <span className="text-[10px] text-slate-400 block truncate">staff@ohims.gov.ug</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('mulago@ohims.gov.ug', 'provider123')}
              className="text-left px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-[#0D9488] hover:text-[#0D9488] transition-all"
            >
              <span className="font-bold block text-slate-700 dark:text-slate-200">Clinic</span>
              <span className="text-[10px] text-slate-400 block truncate">mulago@ohims.gov.ug</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('beinomugishainnocent2001@gmail.com', 'member123')}
              className="text-left px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-[#0D9488] hover:text-[#0D9488] transition-all"
            >
              <span className="font-bold block text-slate-700 dark:text-slate-200">Policyholder</span>
              <span className="text-[10px] text-slate-400 block truncate">beinomugisha...</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-[#0D9488] hover:underline font-medium"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0D9488] hover:bg-[#0b7e74] text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-teal-500/10 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-white" />
                <span>Authenticating Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="text-center pt-2 text-xs text-slate-600 dark:text-slate-400">
          Need a new health insurance coverage policy?{' '}
          <Link to="/register" className="text-[#0D9488] font-bold hover:underline">
            Register &amp; Onboard
          </Link>
        </div>
      </div>
    </div>
  );
}
