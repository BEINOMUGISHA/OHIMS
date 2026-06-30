/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OHIMS — Auth Modal
 * Uses Supabase Auth (signUp / signInWithPassword) instead of Express API.
 */

import React, { useState } from 'react';
import { Shield, X } from 'lucide-react';
import { InsurancePlan } from '../types';
import { authApi } from '../lib/api';

interface AuthModalProps {
  onDismiss: () => void;
  onLoginSuccess: (token: string) => void;
  plans: InsurancePlan[];
}

export default function AuthModal({ onDismiss, onLoginSuccess, plans }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Reset
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  // Register
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regNationalId, setRegNationalId] = useState('');
  const [regDob, setRegDob] = useState('1998-05-15');
  const [regGender, setRegGender] = useState('female');
  const [regAddress, setRegAddress] = useState('');
  const [regPlanId, setRegPlanId] = useState(plans[0]?.id || 'plan-basic');
  const [regFreq, setRegFreq] = useState('monthly');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // ── HANDLERS ──────────────────────────────────────────────────────────

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const data = await authApi.login(loginEmail, loginPassword);
      onLoginSuccess(data.token);
      onDismiss();
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed. Check credentials and try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!regName || !regEmail || !regPassword || !regPhone || !regNationalId || !regAddress) {
      setRegError('All registration fields are required.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters.');
      return;
    }

    setRegLoading(true);
    try {
      const data = await authApi.register({
        name: regName,
        email: regEmail,
        password: regPassword,
        phone: regPhone,
        national_id: regNationalId,
        dob: regDob,
        gender: regGender,
        address: regAddress,
        selected_plan_id: regPlanId,
        premium_frequency: regFreq,
      });
      setRegSuccess('Account created successfully! Forwarding to Member Dashboard...');
      setTimeout(() => {
        onLoginSuccess(data.user.id);
        onDismiss();
      }, 1500);
    } catch (err: any) {
      setRegError(err.message || 'Registration failed. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    try {
      const data = await authApi.resetPassword(resetEmail, resetPassword);
      setResetSuccess(data.message || 'Password reset successful!');
      setTimeout(() => {
        setActiveTab('login');
        setLoginEmail(resetEmail);
        setResetEmail('');
        setResetPassword('');
        setResetSuccess('');
      }, 2000);
    } catch (err: any) {
      setResetError(err.message || 'Password reset failed.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col md:flex-row overflow-hidden max-h-[90vh]">

        {/* Left Side Info Panel */}
        <div className="bg-[#0A1628] text-white p-6 md:w-5/12 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="bg-[#0D9488]/20 p-2.5 rounded-xl text-[#0D9488] w-fit">
              <Shield className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold tracking-tight">Uganda Healthcare Coverage</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Complete digital health insurance lifecycle for policy planning, instant clinics claims, automated tracking, and premium transparent audits.
            </p>
          </div>

          {/* Sandbox quick credentials */}
          <div className="mt-8 pt-4 border-t border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">Sandbox Quick Credentials:</span>
            <div className="text-[10px] text-gray-300 space-y-1 font-mono">
              <div className="flex justify-between"><span>Admin:</span><span className="text-amber-300">admin@ohims.gov.ug / admin123</span></div>
              <div className="flex justify-between"><span>Staff:</span><span className="text-amber-300">staff@ohims.gov.ug / staff123</span></div>
              <div className="flex justify-between"><span>Clinic:</span><span className="text-amber-300">mulago@ohims.gov.ug / provider123</span></div>
              <div className="flex justify-between"><span>Member:</span><span className="text-amber-300">member@ohims.gov.ug / member123</span></div>
            </div>
          </div>
        </div>

        {/* Right Side Forms */}
        <div className="p-6 md:w-7/12 flex flex-col overflow-y-auto max-h-full">
          <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-4 border-b border-gray-100 flex-1">
              <button
                onClick={() => setActiveTab('login')}
                className={`pb-2.5 text-sm font-bold transition-all relative ${activeTab === 'login' ? 'text-[#0A1628] border-b-2 border-[#0D9488]' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => setActiveTab('register')}
                className={`pb-2.5 text-sm font-bold transition-all relative ${activeTab === 'register' ? 'text-[#0A1628] border-b-2 border-[#0D9488]' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Register &amp; Onboard
              </button>
            </div>
            <button onClick={onDismiss} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-slate-50 transition-colors ml-4">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* LOGIN TAB */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 flex-1 flex flex-col justify-center">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Email address</label>
                <input
                  type="email" required placeholder="e.g. member@ohims.gov.ug"
                  value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#0D9488] focus:outline-none focus:ring-1 focus:ring-[#0D9488]"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Password</label>
                  <button type="button" onClick={() => setActiveTab('forgot')} className="text-xs font-semibold text-[#0D9488] hover:text-[#0b7e74] transition-colors focus:outline-none">
                    Forgot Password?
                  </button>
                </div>
                <input
                  type="password" required placeholder="••••••••"
                  value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#0D9488] focus:outline-none focus:ring-1 focus:ring-[#0D9488]"
                />
              </div>
              {loginError && (
                <div id="login-error-alert" className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-medium">{loginError}</div>
              )}
              <button
                id="login-auth-btn" type="submit" disabled={loginLoading}
                className="w-full bg-[#0A1628] hover:bg-[#14233a] text-white text-xs font-bold py-2.5 rounded-lg shadow-sm transition-all focus:outline-none disabled:opacity-60"
              >
                {loginLoading ? 'Authenticating...' : 'Authenticate Credentials'}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD TAB */}
          {activeTab === 'forgot' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 flex-1 flex flex-col justify-center">
              <div>
                <h4 className="text-sm font-bold text-[#0A1628] uppercase mb-1">Reset Password</h4>
                <p className="text-[11px] text-gray-400">Enter your registered email and set a new password.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Email address</label>
                <input type="email" required placeholder="name@gmail.com" value={resetEmail} onChange={e => setResetEmail(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#0D9488] focus:outline-none focus:ring-1 focus:ring-[#0D9488]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">New Password</label>
                <input type="password" required placeholder="••••••••" value={resetPassword} onChange={e => setResetPassword(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#0D9488] focus:outline-none focus:ring-1 focus:ring-[#0D9488]" />
              </div>
              {resetError && <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-medium">{resetError}</div>}
              {resetSuccess && <div className="p-3 bg-teal-50 text-teal-700 border border-teal-100 rounded-lg text-xs font-bold">{resetSuccess}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setActiveTab('login')} className="w-1/3 border border-gray-200 text-gray-500 hover:bg-slate-50 text-xs font-bold py-2.5 rounded-lg transition-all">Back</button>
                <button type="submit" className="w-2/3 bg-[#0D9488] hover:bg-[#0b7e74] text-white text-xs font-bold py-2.5 rounded-lg shadow-sm transition-all">Save New Password</button>
              </div>
            </form>
          )}

          {/* REGISTER TAB */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3 max-h-full overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Full Name</label>
                  <input type="text" required placeholder="E.g. Florence Alis" value={regName} onChange={e => setRegName(e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#0D9488] outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Email</label>
                  <input type="email" required placeholder="name@gmail.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#0D9488] outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Password</label>
                  <input type="password" required placeholder="Min 6 chars" value={regPassword} onChange={e => setRegPassword(e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#0D9488] outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Phone Contact</label>
                  <input type="text" required placeholder="+256 700 000" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#0D9488] outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">National ID</label>
                  <input type="text" required placeholder="CF95..." value={regNationalId} onChange={e => setRegNationalId(e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#0D9488] outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">DOB Date</label>
                  <input type="date" required value={regDob} onChange={e => setRegDob(e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#0D9488] outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Gender</label>
                  <select value={regGender} onChange={e => setRegGender(e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#0D9488] bg-white outline-none">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Physical Home Address</label>
                <input type="text" required placeholder="Kireka Ward B, Kira road, Kampala" value={regAddress} onChange={e => setRegAddress(e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#0D9488] outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-teal-800 uppercase mb-0.5">Choose Health Plan</label>
                  <select value={regPlanId} onChange={e => setRegPlanId(e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-[#0D9488] bg-white outline-none">
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name.split(' (')[0]} - UGX {p.premium_amount.toLocaleString()}/mo</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-teal-800 uppercase mb-0.5">Billing Cycle</label>
                  <select value={regFreq} onChange={e => setRegFreq(e.target.value)} className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-[#0D9488] bg-white outline-none">
                    <option value="monthly">Monthly Cycle</option>
                    <option value="quarterly">Quarterly Cycle</option>
                    <option value="annually">Annual Clearance</option>
                  </select>
                </div>
              </div>
              {regError && <div id="register-error-alert" className="p-2.5 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs leading-relaxed">{regError}</div>}
              {regSuccess && <div id="register-success-alert" className="p-2.5 bg-teal-50 text-teal-700 border border-teal-100 rounded-lg text-xs font-bold leading-relaxed">{regSuccess}</div>}
              <button
                id="register-auth-btn" type="submit" disabled={regLoading}
                className="w-full bg-[#0D9488] hover:bg-[#0c8277] text-white text-xs font-bold py-2 rounded-lg shadow-sm transition-all focus:outline-none disabled:opacity-60"
              >
                {regLoading ? 'Creating account...' : 'Complete Onboarding & Issue Card'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
