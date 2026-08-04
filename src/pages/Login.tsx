/**
 * src/pages/Login.tsx
 * OHIMS Uganda — Role-Based Secure Authentication Portal
 * Every role (Member, Staff, Clinic Provider, Admin) has an isolated, role-verifying login page.
 * Prevents account forgery & cross-role access impersonation.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Shield, Lock, Mail, ArrowRight, AlertCircle, RefreshCw, KeyRound,
  UserCheck, Building2, Briefcase, Crown, ShieldAlert
} from 'lucide-react';
import { authApi } from '../lib/api';

interface LoginPageProps {
  onLoginSuccess: (userId: string) => Promise<void>;
}

const ROLE_PORTALS = [
  {
    key: 'member',
    label: 'Member / Policyholder',
    icon: '👤',
    color: 'teal',
    demoEmail: 'member@ohims.gov.ug',
    demoPass: 'member123',
    subtitle: 'Access personal policies, claim status, e-card & benefits',
    badge: 'Member Portal',
  },
  {
    key: 'staff',
    label: 'OHIMS Staff Officer',
    icon: '💼',
    color: 'blue',
    demoEmail: 'staff@ohims.gov.ug',
    demoPass: 'staff123',
    subtitle: 'Adjudicate claims, process SLA triages & manage policies',
    badge: 'Staff Portal',
  },
  {
    key: 'provider',
    label: 'Accredited Clinic / Hospital',
    icon: '🏥',
    color: 'emerald',
    demoEmail: 'mulago@ohims.gov.ug',
    demoPass: 'provider123',
    subtitle: 'Check NIN eligibility, file clinical claims & view client roster',
    badge: 'Clinic Portal',
  },
  {
    key: 'admin',
    label: 'System Administrator',
    icon: '👑',
    color: 'purple',
    demoEmail: 'admin@ohims.gov.ug',
    demoPass: 'admin123',
    subtitle: 'System audit logs, user registry management & platform configuration',
    badge: 'Admin Portal',
  },
];

export default function Login({ onLoginSuccess }: LoginPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const roleFromUrl = searchParams.get('role') || 'member';
  const [activeRole, setActiveRole] = useState<string>(roleFromUrl);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const currentPortal = ROLE_PORTALS.find((p) => p.key === activeRole) || ROLE_PORTALS[0];

  useEffect(() => {
    // Sync URL when tab changes
    setSearchParams({ role: activeRole });
    setError('');
  }, [activeRole, setSearchParams]);

  const handleRoleTabChange = (roleKey: string) => {
    setActiveRole(roleKey);
    setError('');
  };

  const handleQuickFillDemo = () => {
    setEmail(currentPortal.demoEmail);
    setPassword(currentPortal.demoPass);
    setError('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Authenticate with Supabase Auth
      const { data: loginData, error: loginErr } = await authApi.login(email.trim(), password);
      if (loginErr || !loginData) {
        throw new Error(loginErr ?? 'Invalid email or password.');
      }

      const userObj = (loginData as any).user;
      const userRole = userObj?.role || 'member';

      // 2. Strict Role Verification to Prevent Impersonation / Forgery
      if (activeRole !== 'member' && userRole !== activeRole) {
        // Sign out immediately if trying to access unauthorized portal
        await authApi.logout();
        throw new Error(
          `Security Alert: Your account is registered as "${userRole.toUpperCase()}", not "${activeRole.toUpperCase()}". Please sign in under the correct ${userRole.toUpperCase()} portal.`
        );
      }

      // 3. Login success
      await onLoginSuccess(userObj.id);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      let msg = err?.message || 'Authentication failed. Please check your credentials.';
      if (typeof msg === 'string' && (msg.includes('Unexpected token') || msg.includes('<html>'))) {
        msg = 'Connection refreshed. Please submit again.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="max-w-xl w-full space-y-6 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800">
        
        {/* Portal Header Branding */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 bg-[#0D9488]/10 text-[#0D9488] rounded-2xl mb-3">
            <Shield className="h-9 w-9" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            OHIMS Uganda Portal Sign In
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Secure, role-verified authentication for all national health coverage stakeholders
          </p>
        </div>

        {/* Role Portal Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
          {ROLE_PORTALS.map((portal) => {
            const isActive = activeRole === portal.key;
            return (
              <button
                key={portal.key}
                type="button"
                onClick={() => handleRoleTabChange(portal.key)}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-[#0D9488] dark:text-teal-400 shadow-md font-extrabold border border-teal-500/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="text-base">{portal.icon}</span>
                <span className="text-[11px] truncate w-full text-center">{portal.label.split('/')[0].trim()}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Portal Banner */}
        <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{currentPortal.icon}</span>
              <h3 className="font-extrabold text-sm text-[#0A1628] dark:text-white">{currentPortal.label} Portal</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{currentPortal.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={handleQuickFillDemo}
            className="shrink-0 text-[10px] font-mono font-bold bg-[#0D9488]/10 hover:bg-[#0D9488]/20 text-[#0D9488] border border-[#0D9488]/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            Fill Demo Credentials
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-4 rounded-2xl flex items-start gap-3 text-xs text-rose-700 dark:text-rose-300">
            <ShieldAlert className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{error}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Registered Email Address ({currentPortal.badge})
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`${currentPortal.key}@ohims.gov.ug`}
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <Link to="/forgot-password" className="text-[11px] text-[#0D9488] hover:underline font-bold">
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
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0D9488] hover:bg-[#0b7e74] text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-teal-500/10 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-white" />
                <span>Verifying Role Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to {currentPortal.label}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="text-center pt-2 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
          Don't have an active account yet?{' '}
          <Link to="/register" className="text-[#0D9488] font-bold hover:underline">
            Register for OHIMS Coverage or Role Access
          </Link>
        </div>
      </div>
    </div>
  );
}
