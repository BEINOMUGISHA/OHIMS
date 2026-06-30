/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, X, HelpCircle, UserCheck, Heart } from 'lucide-react';
import { InsurancePlan } from '../types';

interface AuthModalProps {
  onDismiss: () => void;
  onLoginSuccess: (token: string) => void;
  plans: InsurancePlan[];
}

export default function AuthModal({ onDismiss, onLoginSuccess, plans }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Reset Password States
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, newPassword: resetPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setResetError(data.error || 'Password reset failed');
        return;
      }
      setResetSuccess(data.message || 'Password reset successful! Redirecting to sign in...');
      setTimeout(() => {
        setActiveTab('login');
        setLoginEmail(resetEmail);
        setLoginPassword('');
        setResetEmail('');
        setResetPassword('');
        setResetSuccess('');
      }, 2000);
    } catch (err: any) {
      setResetError('Failed to communicate with auth service: ' + err.message);
    }
  };
  
  // Registration Form States
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
  
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Authentication failed');
        return;
      }
      onLoginSuccess(data.token);
      onDismiss();
    } catch (err: any) {
      setLoginError('Could not link to API server: ' + err.message);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!regName || !regEmail || !regPassword || !regPhone || !regNationalId || !regAddress) {
      setRegError('All registration fields are required');
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          phone: regPhone,
          national_id: regNationalId,
          dob: regDob,
          gender: regGender,
          address: regAddress,
          selected_plan_id: regPlanId,
          premium_frequency: regFreq
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || 'Registration failed');
        return;
      }
      setRegSuccess('Account created successfully! Forwarding to Member Dashboard...');
      setTimeout(() => {
        onLoginSuccess(data.user.id);
        onDismiss();
      }, 1500);
    } catch (err: any) {
      setRegError('Network connection failed: ' + err.message);
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

          {/* Seed accounts for testing */}
          <div className="mt-8 pt-4 border-t border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">Sandbox Quick Credentials:</span>
            <div className="text-[10px] text-gray-300 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Admin:</span>
                <span className="text-amber-300">admin@ohims.gov.ug / admin123</span>
              </div>
              <div className="flex justify-between">
                <span>Staff:</span>
                <span className="text-amber-300">staff@ohims.gov.ug / staff123</span>
              </div>
              <div className="flex justify-between">
                <span>Clinic:</span>
                <span className="text-amber-300">mulago@ohims.gov.ug / provider123</span>
              </div>
              <div className="flex justify-between">
                <span>Policyholder:</span>
                <span className="text-amber-300">beinomugishainnocent2001@gmail.com / member123</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Action Forms */}
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
                Register & Onboard
              </button>
            </div>
            <button
              onClick={onDismiss}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-slate-50 transition-colors ml-4"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* TAB 1: LOGIN */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 flex-1 flex flex-col justify-center">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Email address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. member@ohims.gov.ug"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#0D9488] focus:outline-none focus:ring-1 focus:ring-[#0D9488]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Password</label>
                  <button
                    type="button"
                    onClick={() => setActiveTab('forgot')}
                    className="text-xs font-semibold text-[#0D9488] hover:text-[#0b7e74] transition-colors focus:outline-none"
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#0D9488] focus:outline-none focus:ring-1 focus:ring-[#0D9488]"
                />
              </div>

              {loginError && (
                <div id="login-error-alert" className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-medium">
                  {loginError}
                </div>
              )}

              <button
                id="login-auth-btn"
                type="submit"
                className="w-full bg-[#0A1628] hover:bg-[#14233a] text-white text-xs font-bold py-2.5 rounded-lg shadow-sm transition-all focus:outline-none"
              >
                Authenticate Credentials
              </button>
            </form>
          )}

          {/* TAB 3: FORGOT PASSWORD */}
          {activeTab === 'forgot' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 flex-1 flex flex-col justify-center">
              <div>
                <h4 className="text-sm font-bold text-[#0A1628] uppercase mb-1">Reset Password Simulator</h4>
                <p className="text-[11px] text-gray-400">Specify your registered email and a new password. The backend simulation will record the change and issue an audit entry.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Email address</label>
                <input
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#0D9488] focus:outline-none focus:ring-1 focus:ring-[#0D9488]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#0D9488] focus:outline-none focus:ring-1 focus:ring-[#0D9488]"
                />
              </div>

              {resetError && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-medium">
                  {resetError}
                </div>
              )}

              {resetSuccess && (
                <div className="p-3 bg-teal-50 text-teal-700 border border-teal-100 rounded-lg text-xs font-bold">
                  {resetSuccess}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="w-1/3 border border-gray-200 text-gray-500 hover:bg-slate-50 text-xs font-bold py-2.5 rounded-lg transition-all focus:outline-none"
                >
                  Back to Sign In
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-[#0D9488] hover:bg-[#0b7e74] text-white text-xs font-bold py-2.5 rounded-lg shadow-sm transition-all focus:outline-none"
                >
                  Save New Password
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: REGISTER */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3 max-h-full overflow-y-auto pr-1">
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Florence Alis"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#0D9488] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Email Email</label>
                  <input
                    type="email"
                    required
                    placeholder="name@gmail.com"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#0D9488] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Choose pass"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#0D9488] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Phone Contact</label>
                  <input
                    type="text"
                    required
                    placeholder="+256 700 000"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#0D9488] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">National ID</label>
                  <input
                    type="text"
                    required
                    placeholder="CF95..."
                    value={regNationalId}
                    onChange={e => setRegNationalId(e.target.value)}
                    className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#0D9488] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">DOB Date</label>
                  <input
                    type="date"
                    required
                    value={regDob}
                    onChange={e => setRegDob(e.target.value)}
                    className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#0D9488] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Gender</label>
                  <select
                    value={regGender}
                    onChange={e => setRegGender(e.target.value)}
                    className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#0D9488] bg-white outline-none"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">Physical Home Address</label>
                <input
                  type="text"
                  required
                  placeholder="Kireka Ward B, Kira road, Kampala"
                  value={regAddress}
                  onChange={e => setRegAddress(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#0D9488] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-teal-800 uppercase mb-0.5">Choose Health Plan</label>
                  <select
                    value={regPlanId}
                    onChange={e => setRegPlanId(e.target.value)}
                    className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-[#0D9488] bg-white outline-none"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name.split(' (')[0]} - UGX {p.premium_amount.toLocaleString()}/mo
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-teal-800 uppercase mb-0.5">Billing Cycle</label>
                  <select
                    value={regFreq}
                    onChange={e => setRegFreq(e.target.value)}
                    className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-[#0D9488] bg-white outline-none"
                  >
                    <option value="monthly">Monthly Cycle</option>
                    <option value="quarterly">Quarterly Cycle</option>
                    <option value="annually">Annual Clearance</option>
                  </select>
                </div>
              </div>

              {regError && (
                <div id="register-error-alert" className="p-2.5 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs leading-relaxed">
                  {regError}
                </div>
              )}

              {regSuccess && (
                <div id="register-success-alert" className="p-2.5 bg-teal-50 text-teal-700 border border-teal-100 rounded-lg text-xs font-bold leading-relaxed">
                  {regSuccess}
                </div>
              )}

              <button
                id="register-auth-btn"
                type="submit"
                className="w-full bg-[#0D9488] hover:bg-[#0c8277] text-white text-xs font-bold py-2 rounded-lg shadow-sm transition-all focus:outline-none"
              >
                Complete Onboarding & Issue Card
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
