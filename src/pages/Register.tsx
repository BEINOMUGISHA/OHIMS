/**
 * src/pages/Register.tsx
 * OHIMS Uganda — Role-Based Registration & Onboarding Page
 * Each role requires a secret access code to prevent impersonation.
 * Member → open registration | Staff/Admin/Clinic → access code required
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield, User as UserIcon, Mail, Lock, Phone, CreditCard, Calendar,
  MapPin, CheckCircle, AlertCircle, RefreshCw, ArrowRight, KeyRound,
  Building2, Users, Stethoscope, BadgeCheck
} from 'lucide-react';
import { InsurancePlan } from '../types';
import { authApi } from '../lib/api';

interface RegisterPageProps {
  plans: InsurancePlan[];
  onLoginSuccess: (userId: string) => Promise<void>;
}

const ROLE_OPTIONS = [
  {
    key: 'member',
    label: 'Policyholder / Member',
    icon: '👤',
    color: 'teal',
    description: 'Ugandan citizen applying for health insurance coverage',
    requiresCode: false,
  },
  {
    key: 'staff',
    label: 'OHIMS Staff Officer',
    icon: '💼',
    color: 'blue',
    description: 'Authorized OHIMS system staff with claims review access',
    requiresCode: true,
  },
  {
    key: 'provider',
    label: 'Healthcare Provider / Clinic',
    icon: '🏥',
    color: 'emerald',
    description: 'Accredited hospital or clinic submitting patient claims',
    requiresCode: true,
  },
  {
    key: 'admin',
    label: 'System Administrator',
    icon: '👑',
    color: 'purple',
    description: 'OHIMS platform administrator with full system access',
    requiresCode: true,
  },
];

export default function Register({ plans, onLoginSuccess }: RegisterPageProps) {
  const navigate = useNavigate();

  // Step tracking
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [selectedRole, setSelectedRole] = useState('member');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('male');
  const [address, setAddress] = useState('');
  const [planId, setPlanId] = useState(plans[0]?.id || 'plan-basic');
  const [freq, setFreq] = useState('monthly');
  const [accessCode, setAccessCode] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const currentRoleOption = ROLE_OPTIONS.find(r => r.key === selectedRole)!;

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !email || !password || !phone || !address) {
      setError('All fields marked are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (currentRoleOption.requiresCode && !accessCode.trim()) {
      setError(`An access code is required to register as ${currentRoleOption.label}. Contact your OHIMS administrator.`);
      return;
    }

    setLoading(true);
    try {
      const { data, error: regError } = await authApi.register({
        name,
        email,
        password,
        phone,
        national_id: nationalId || 'N/A',
        dob,
        gender,
        address,
        selected_plan_id: planId,
        premium_frequency: freq,
        role: selectedRole,
        access_code: accessCode,
      });

      if (regError) throw new Error(regError);

      const regData = data as any;
      if (regData?.emailConfirmationRequired) {
        setSuccess(regData.message || 'Registration successful! Please check your inbox.');
        return;
      }

      setSuccess(`${currentRoleOption.label} account created! Forwarding to your dashboard...`);
      await onLoginSuccess(regData?.user?.id ?? regData?.id);
      setTimeout(() => navigate('/dashboard', { replace: true }), 1200);
    } catch (err: any) {
      // Self-heal: If account exists, attempt login
      try {
        const { data: loginData, error: loginError } = await authApi.login(email, password);
        if (loginError) throw new Error(loginError);
        setSuccess('Account verified! Forwarding to your dashboard...');
        await onLoginSuccess((loginData as any)?.user?.id);
        setTimeout(() => navigate('/dashboard', { replace: true }), 1000);
        return;
      } catch (_) {
        let msg = err?.message || 'Registration failed. Please try again.';
        if (msg.includes('already registered') || msg.includes('already exists')) {
          msg = 'An account with this email already exists. Please Sign In below.';
        } else if (msg.includes('Invalid access code')) {
          msg = err.message; // Show exact access code error
        } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
          msg = 'Network error. Please check your connection and try again.';
        }
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 1: Role Selection ──────────────────────────────────────────
  if (step === 'role') {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center p-3 bg-[#0D9488]/10 text-[#0D9488] rounded-2xl mb-4">
              <Shield className="h-10 w-10" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Create Your OHIMS Account
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Select your role to get started. Each role has its own sandbox and access level.
            </p>
          </div>

          {/* Role Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role.key}
                type="button"
                onClick={() => setSelectedRole(role.key)}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all cursor-pointer group ${
                  selectedRole === role.key
                    ? 'border-[#0D9488] bg-teal-50 dark:bg-teal-950/30 shadow-lg shadow-teal-500/10'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {selectedRole === role.key && (
                  <BadgeCheck className="absolute top-3 right-3 h-5 w-5 text-[#0D9488]" />
                )}
                <div className="text-2xl mb-2">{role.icon}</div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">{role.label}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{role.description}</div>
                {role.requiresCode && (
                  <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                    <KeyRound className="h-2.5 w-2.5" />
                    Requires Access Code
                  </div>
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setStep('details')}
            className="w-full bg-[#0D9488] hover:bg-[#0b7e74] text-white font-bold py-3 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Continue as {currentRoleOption.icon} {currentRoleOption.label}</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-[#0D9488] hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 2: Registration Details Form ──────────────────────────────
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="max-w-2xl mx-auto space-y-8 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div>
          <button
            type="button"
            onClick={() => { setStep('role'); setError(''); }}
            className="text-xs text-slate-400 hover:text-[#0D9488] flex items-center gap-1 mb-4 cursor-pointer transition-colors"
          >
            ← Change Role
          </button>
          <div className="flex items-center gap-3">
            <div className="text-3xl">{currentRoleOption.icon}</div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Register as {currentRoleOption.label}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{currentRoleOption.description}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-rose-700 dark:text-rose-300 font-medium">
              {error}
              <div className="mt-2">
                <Link to="/login" className="inline-flex items-center gap-1 font-bold text-[#0D9488] hover:underline">
                  <span>Go to Sign In</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-[#0D9488] shrink-0" />
            <div className="text-xs text-teal-800 dark:text-teal-200 font-medium">{success}</div>
          </div>
        )}

        {/* Access Code Banner for privileged roles */}
        {currentRoleOption.requiresCode && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
            <KeyRound className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              <span className="font-bold">Access code required</span> — you need a valid OHIMS system access code to register as {currentRoleOption.label}. Contact your system administrator if you don't have one.
            </p>
          </div>
        )}

        <form onSubmit={handleRegisterSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Innocent Beinomugisha"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@example.com"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none" />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input type="text" required value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="+256786834364"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none" />
              </div>
            </div>

            {/* National ID — only for members */}
            {selectedRole === 'member' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">National ID (NIN)</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input type="text" value={nationalId} onChange={(e) => setNationalId(e.target.value)}
                    placeholder="CM0103710AGV2G"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none" />
                </div>
              </div>
            )}

            {/* DOB — only for members */}
            {selectedRole === 'member' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Date of Birth</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none" />
                </div>
              </div>
            )}

            {/* Gender */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Address / Location *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)}
                  placeholder="Kampala, Uganda"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none" />
              </div>
            </div>
          </div>

          {/* Health Plan — only for members */}
          {selectedRole === 'member' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Choose Health Plan</label>
                <select value={planId} onChange={(e) => setPlanId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none">
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — UGX {p.premium_amount.toLocaleString()} / mo
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Billing Cycle</label>
                <select value={freq} onChange={(e) => setFreq(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none">
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annual (10% Discount)</option>
                </select>
              </div>
            </div>
          )}

          {/* Access Code — for privileged roles */}
          {currentRoleOption.requiresCode && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                System Access Code *
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-amber-500" />
                <input
                  type="password"
                  required
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Enter your OHIMS role access code"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Contact your OHIMS system administrator if you don't have this code.</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0D9488] hover:bg-[#0b7e74] text-white font-bold py-3 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Creating {currentRoleOption.label} Account...</span>
              </>
            ) : (
              <>
                <span>{currentRoleOption.icon} Complete Registration & Access Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[#0D9488] hover:underline">
              Sign In to your Dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
