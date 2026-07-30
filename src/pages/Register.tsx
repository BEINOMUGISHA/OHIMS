/**
 * src/pages/Register.tsx
 * Independent Registration & Onboarding Page — /register
 * Creates a Supabase Auth user + profiles, policies, and initial premium invoice.
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, User as UserIcon, Mail, Lock, Phone, CreditCard, Calendar, MapPin, CheckCircle, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { InsurancePlan } from '../types';
import { authApi } from '../lib/api';

interface RegisterPageProps {
  plans: InsurancePlan[];
  onLoginSuccess: (userId: string) => Promise<void>;
}

export default function Register({ plans, onLoginSuccess }: RegisterPageProps) {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [dob, setDob] = useState('1998-05-15');
  const [gender, setGender] = useState('female');
  const [address, setAddress] = useState('');
  const [planId, setPlanId] = useState(plans[0]?.id || 'plan-basic');
  const [freq, setFreq] = useState('monthly');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !email || !password || !phone || !nationalId || !address) {
      setError('All registration fields are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const data = await authApi.register({
        name,
        email,
        password,
        phone,
        national_id: nationalId,
        dob,
        gender,
        address,
        selected_plan_id: planId,
        premium_frequency: freq,
      });

      if (data.emailConfirmationRequired) {
        setSuccess(data.message || 'Registration successful! If required, please check your inbox to confirm your account.');
        return;
      }

      setSuccess('Account created successfully! Forwarding to Member Dashboard...');
      await onLoginSuccess(data.user.id);
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1200);
    } catch (err: any) {
      // Self-heal: If account exists or network hiccup occurs, attempt direct login
      try {
        const loginRes = await authApi.login(email, password);
        setSuccess('Account verified! Forwarding to Member Dashboard...');
        await onLoginSuccess(loginRes.user.id);
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1000);
        return;
      } catch (loginErr) {
        let msg = err?.message || 'Registration failed. Please check your internet connection.';
        if (typeof msg === 'string' && (msg.includes('already registered') || msg.includes('already exists'))) {
          msg = 'An account with this email is already registered. Please click Sign In below.';
        } else if (typeof msg === 'string' && (msg.includes('Failed to fetch') || msg.includes('Unexpected token') || msg.includes('<html>'))) {
          msg = 'Network connection refreshed. Click Sign In or try submitting again.';
        }
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="max-w-2xl mx-auto space-y-8 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 bg-[#0D9488]/10 text-[#0D9488] rounded-2xl mb-4">
            <Shield className="h-10 w-10" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Register for OHIMS Coverage
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Complete digital health insurance lifecycle onboarding for Uganda citizens
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-rose-700 dark:text-rose-300 font-medium">
              <span>{error}</span>
              <div className="mt-2">
                <Link to="/login" className="inline-flex items-center gap-1 font-bold text-[#0D9488] hover:underline">
                  <span>Go to Sign In Page</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-[#0D9488] shrink-0" />
            <div className="text-xs text-teal-800 dark:text-teal-200 font-medium">
              {success}
            </div>
          </div>
        )}

        <form onSubmit={handleRegisterSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Innocent Beinomugisha"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@ohims.gov.ug"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none"
                />
              </div>
            </div>

            {/* Phone Contact */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Phone Contact
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+256786834364"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none"
                />
              </div>
            </div>

            {/* National ID (NIN) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                National ID (NIN)
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="CM0103710AGV2G"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none"
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Date of Birth
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none"
                />
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Physical Home Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Physical Home Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Kampala, Uganda"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Plan & Billing Cycle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Choose Health Plan
              </label>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none"
              >
                {plans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — UGX {p.premium_amount.toLocaleString()} / mo
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Billing Cycle
              </label>
              <select
                value={freq}
                onChange={(e) => setFreq(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0D9488] outline-none"
              >
                <option value="monthly">Monthly Cycle</option>
                <option value="quarterly">Quarterly Cycle</option>
                <option value="annually">Annual Cycle (10% Discount)</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0D9488] hover:bg-[#0b7e74] text-white font-bold py-3 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Processing Onboarding &amp; Policy Card...</span>
              </>
            ) : (
              <>
                <span>Complete Onboarding &amp; Issue Card</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-4 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Already have an active policy?{' '}
            <Link to="/login" className="font-bold text-[#0D9488] hover:underline">
              Sign In to Policyholder Dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
