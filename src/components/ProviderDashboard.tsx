/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ProviderDashboard v2 — hardened with ErrorBoundary, tri-state loading/empty/error,
 * Zod NIN validation, rate limiting, audit-logged eligibility checks,
 * normalized { data, error } API responses, and useToast notifications.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  FileText,
  DollarSign,
  Plus,
  Building2,
  CheckCircle,
  AlertTriangle,
  Users,
  Clock,
  RefreshCw,
  Search,
} from 'lucide-react';
import { User, Provider, Claim } from '../types';
import { providersApi, claimsApi, membersApi } from '../lib/api';
import { ninLookupSchema, claimSubmitSchema, validateForm } from '../lib/validation';
import ErrorBoundary from './ui/ErrorBoundary';
import LoadingSkeleton from './ui/LoadingSkeleton';
import EmptyState from './ui/EmptyState';
import StatusBadge from './ui/StatusBadge';
import { useToast } from '../hooks/useToast';

interface ProviderDashboardProps {
  currentUser: User;
  onRefreshData: () => void;
}

function ProviderDashboardInner({ currentUser, onRefreshData }: ProviderDashboardProps) {
  const { showToast } = useToast();

  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);
  const [providerClaims, setProviderClaims] = useState<Claim[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form states
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [claimDiagnosis, setClaimDiagnosis] = useState('');
  const [claimTreatment, setClaimTreatment] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [claimFieldErrors, setClaimFieldErrors] = useState<Record<string, string>>({});
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Tab & Eligibility state
  const [activeTab, setActiveTab] = useState<'claims' | 'eligibility'>('claims');
  const [eligibilityNIN, setEligibilityNIN] = useState('');
  const [eligibilityResult, setEligibilityResult] = useState<any | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [eligibilityError, setEligibilityError] = useState('');
  const [eligibilityNINError, setEligibilityNINError] = useState('');

  // Patient search and file upload states
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileSize, setSelectedFileSize] = useState('');

  // Rate-limiting: max 1 NIN lookup per 2 seconds
  const lastLookupTime = useRef<number>(0);
  const RATE_LIMIT_MS = 2000;

  const fetchProviderData = async () => {
    setLoading(true);
    setLoadError(null);

    const { data: allProvs, error: provsError } = await providersApi.list();

    if (provsError || !allProvs) {
      setLoadError(provsError ?? 'Failed to load provider data.');
      setLoading(false);
      return;
    }

    const match = (allProvs as any[]).find((p: any) =>
      p.contact?.includes(currentUser.phone) ||
      p.name?.toLowerCase().includes(currentUser.name.split(' ')[0].toLowerCase())
    );
    const activeProv = (match || allProvs[0]) as unknown as Provider;
    setActiveProvider(activeProv);

    if (activeProv) {
      const { data: claimsData } = await claimsApi.list({ provider_id: (activeProv as any).id });
      setProviderClaims((claimsData as unknown as Claim[]) ?? []);
    }

    const { data: subData } = await membersApi.list();
    const memberList = (subData as any[]) ?? [];
    setPatients(memberList);
    if (memberList.length > 0 && !selectedPolicyId) {
      const firstPol = memberList[0]?.policies?.[0]?.id;
      if (firstPol) setSelectedPolicyId(firstPol);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchProviderData();
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCheckEligibility = async (e: React.FormEvent) => {
    e.preventDefault();
    setEligibilityNINError('');
    setEligibilityError('');
    setEligibilityResult(null);

    // Rate limiting
    const now = Date.now();
    if (now - lastLookupTime.current < RATE_LIMIT_MS) {
      setEligibilityError('Please wait a moment before checking again.');
      return;
    }

    // Zod NIN validation
    const validation = validateForm(ninLookupSchema, { national_id: eligibilityNIN.trim().toUpperCase() });
    if (validation.errors) {
      setEligibilityNINError(validation.errors['national_id'] ?? 'Invalid National ID format.');
      return;
    }

    setCheckingEligibility(true);
    lastLookupTime.current = now;

    const { data: res, error } = await providersApi.checkEligibility(
      eligibilityNIN.trim().toUpperCase(),
      currentUser.id,
      currentUser.name
    );

    setCheckingEligibility(false);

    if (error) {
      setEligibilityError(`Eligibility check failed: ${error}`);
      return;
    }

    if (!res) {
      // Valid NIN but no member found
      setEligibilityError(
        `No member found with National ID "${eligibilityNIN.toUpperCase()}". ` +
        'Please verify the ID or confirm the member is registered with OHIMS.'
      );
      return;
    }

    const result = res as any;
    if (!result.is_eligible) {
      // Member found but no active policy
      setEligibilityResult(result);
      // Don't set an error — show the result card with "NOT COVERED" state
    } else {
      setEligibilityResult(result);
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimFieldErrors({});

    // Zod validation
    const validation = validateForm(claimSubmitSchema, {
      diagnosis: claimDiagnosis,
      treatment: claimTreatment,
      amount_claimed: Number(claimAmount),
    });
    if (validation.errors) {
      setClaimFieldErrors(validation.errors);
      showToast('Please fix the form errors before submitting.', 'error');
      return;
    }

    if (!selectedPolicyId) {
      showToast('Please select a patient / policy before submitting.', 'error');
      return;
    }

    setSubmittingClaim(true);

    const { data: newClaim, error } = await claimsApi.submit({
      policy_id: selectedPolicyId,
      provider_id: (activeProvider as any)?.id,
      diagnosis: claimDiagnosis,
      treatment: claimTreatment,
      amount_claimed: Number(claimAmount),
      actorId: currentUser.id,
      actorName: currentUser.name,
    });

    setSubmittingClaim(false);

    if (error) {
      showToast(`Claim submission failed: ${error}`, 'error');
      return;
    }

    showToast('Claim filed successfully and queued for reviewer audit!', 'success');
    setShowClaimForm(false);
    setClaimDiagnosis('');
    setClaimTreatment('');
    setClaimAmount('');
    setSelectedFileName('');
    setSelectedFileSize('');
    setPatientSearch('');
    onRefreshData();
    fetchProviderData();
  };

  // ── Loading State ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <LoadingSkeleton variant="card" count={1} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LoadingSkeleton variant="stat" count={3} />
        </div>
        <LoadingSkeleton variant="table" rows={5} cols={7} />
      </div>
    );
  }

  // ── Error State ────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-red-50 mb-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Failed to load provider data</h3>
        <p className="text-sm text-slate-500 mb-6">{loadError}</p>
        <button
          onClick={fetchProviderData}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  // ── Aggregate stats ───────────────────────────────────────

  const pendingCount = providerClaims.filter((c: any) => c.status === 'submitted' || c.status === 'under_review').length;
  const approvedTotal = providerClaims.filter((c: any) => c.status === 'approved' || c.status === 'paid').reduce((sum, c: any) => sum + (c.amount_approved || 0), 0);
  const totalSubCount = providerClaims.length;

  const filteredPatients = patients.filter((p) => {
    const search = patientSearch.toLowerCase();
    const nameMatch = p.name ? p.name.toLowerCase().includes(search) : false;
    const nidMatch = p.national_id ? p.national_id.toLowerCase().includes(search) : false;
    const policyMatch = p.active_policy ? p.active_policy.id.toLowerCase().includes(search) : false;
    return nameMatch || nidMatch || policyMatch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* Clinic Header */}
      {activeProvider && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-4">
            <div className="bg-[#0D9488]/10 p-3.5 rounded-2xl text-[#0D9488] shrink-0">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-[#0A1628] dark:text-white">{activeProvider.name}</h2>
                <StatusBadge status={(activeProvider as any).accreditation_status ?? 'pending'} size="xs" />
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-mono mt-1">
                Location: {activeProvider.location} | Tel: {activeProvider.contact}
              </p>
            </div>
          </div>

          {(activeProvider as any).accreditation_status === 'accredited' && (
            <button
              id="clinic-file-claim-btn"
              onClick={() => setShowClaimForm(true)}
              className="bg-[#0D9488] hover:bg-[#0b7e74] text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> File Patient Medical Claim
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center space-x-4">
          <div className="bg-teal-50 dark:bg-teal-900/30 p-3 rounded-xl text-[#0D9488]">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block">Total Claims Submitted</span>
            <span className="text-xl font-extrabold text-[#0A1628] dark:text-white">{totalSubCount} clinical claims</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center space-x-4">
          <div className="bg-amber-50 dark:bg-amber-900/30 p-3 rounded-xl text-amber-600">
            <Clock className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block">Evaluation Queue</span>
            <span className="text-xl font-extrabold text-[#0A1628] dark:text-white">{pendingCount} claims pending</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center space-x-4">
          <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-xl text-emerald-600">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block">Reimbursements Disbursed</span>
            <span className="text-xl font-extrabold text-emerald-700">UGX {approvedTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Claim Form */}
      {showClaimForm && (
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl max-w-2xl mx-auto space-y-4">
          <div className="border-b border-gray-100 dark:border-slate-700 pb-2.5">
            <h3 className="font-bold text-sm text-[#0A1628] dark:text-white uppercase tracking-wide">File Patient Clinical Claim (Provider Portal)</h3>
            <p className="text-[11px] text-gray-400">Claims automatically undergo rule-based duplicate assessments and low-value SLA triages.</p>
          </div>

          <form onSubmit={handleSubmitClaim} className="space-y-4 font-sans text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 dark:text-slate-400 uppercase mb-1">Select Patient / Member Profile</label>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="Search name, ID, or policy..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-xs bg-white dark:bg-slate-700 dark:text-white outline-none focus:border-[#0D9488]"
                  />
                  <select
                    value={selectedPolicyId}
                    onChange={(e) => setSelectedPolicyId(e.target.value)}
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs bg-white dark:bg-slate-700 dark:text-white outline-none focus:outline-[#0D9488]"
                  >
                    <option value="">-- Choose Patient ({filteredPatients.length} matched) --</option>
                    {filteredPatients.map((p) =>
                      p.active_policy ? (
                        <option key={p.id} value={p.active_policy.id}>
                          {p.name} (Policy: {p.active_policy.id} - {p.active_policy.plan_name})
                        </option>
                      ) : null
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 dark:text-slate-400 uppercase mb-1">Invoiced Medical Fees (UGX)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold font-mono text-[10px] text-gray-400">UGX</span>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 150000"
                    value={claimAmount}
                    onChange={(e) => setClaimAmount(e.target.value)}
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-lg pl-12 pr-3 py-2 text-xs bg-white dark:bg-slate-700 dark:text-white font-mono outline-none focus:outline-[#0D9488]"
                  />
                </div>
                {claimFieldErrors['amount_claimed'] && (
                  <p className="text-red-500 text-[10px] mt-1">{claimFieldErrors['amount_claimed']}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 dark:text-slate-400 uppercase mb-1">Diagnosis (ICD Codes / Clinical Terms)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Outpatient Acute Gastroenteritis"
                  value={claimDiagnosis}
                  onChange={(e) => setClaimDiagnosis(e.target.value)}
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs uppercase bg-white dark:bg-slate-700 dark:text-white outline-none focus:outline-[#0D9488]"
                />
                {claimFieldErrors['diagnosis'] && (
                  <p className="text-red-500 text-[10px] mt-1">{claimFieldErrors['diagnosis']}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 dark:text-slate-400 uppercase mb-1">Treatment Administered / Procedures</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IV Rehydration therapy, generic prescription antibiotics"
                  value={claimTreatment}
                  onChange={(e) => setClaimTreatment(e.target.value)}
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs bg-white dark:bg-slate-700 dark:text-white outline-none focus:outline-[#0D9488]"
                />
                {claimFieldErrors['treatment'] && (
                  <p className="text-red-500 text-[10px] mt-1">{claimFieldErrors['treatment']}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 dark:text-slate-400 uppercase mb-1">Supporting Medical Documentation (Receipts/Diagnostics)</label>
              <div className="border border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-3 flex flex-col items-center justify-center bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                <input
                  type="file"
                  id="claim-file-upload"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFileName(file.name);
                      setSelectedFileSize((file.size / 1024).toFixed(1) + ' KB');
                    }
                  }}
                />
                <label htmlFor="claim-file-upload" className="cursor-pointer flex flex-col items-center gap-1 w-full text-center">
                  <span className="text-[10px] font-bold text-[#0D9488] hover:underline">
                    {selectedFileName ? 'Change Document File' : 'Click to Upload Support PDF/Image'}
                  </span>
                  {selectedFileName && (
                    <span className="text-[9px] text-slate-500 font-mono">
                      Selected: <strong>{selectedFileName}</strong> ({selectedFileSize})
                    </span>
                  )}
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowClaimForm(false)}
                className="text-xs text-gray-400 hover:text-gray-600 px-3 py-2"
              >
                Cancel
              </button>
              <button
                id="submit-claims-provider-btn"
                type="submit"
                disabled={submittingClaim}
                className="bg-[#0A1628] hover:bg-slate-900 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-sm disabled:opacity-60"
              >
                {submittingClaim ? 'Submitting...' : 'Transmit Invoiced Claim to Review'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Nav Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-700 overflow-x-auto scrollbar-thin whitespace-nowrap">
        <button
          onClick={() => setActiveTab('claims')}
          className={`py-3 px-4 font-bold text-xs border-b-2 transition-colors flex-shrink-0 cursor-pointer ${activeTab === 'claims' ? 'border-[#0D9488] text-[#0D9488]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          Clinical Claims Queue ({providerClaims.length})
        </button>
        <button
          onClick={() => setActiveTab('eligibility')}
          className={`py-3 px-4 font-bold text-xs border-b-2 transition-colors flex-shrink-0 cursor-pointer ${activeTab === 'eligibility' ? 'border-[#0D9488] text-[#0D9488]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          🔍 Patient Eligibility &amp; Coverage Verification
        </button>
      </div>

      {/* Claims Tab */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-400 font-mono uppercase tracking-wider block">Submitted Clinic Claims History</h3>

          {providerClaims.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No claims filed yet"
              message="Claims submitted for this facility will appear here."
              action={{ label: 'File a Claim', onClick: () => setShowClaimForm(true) }}
            />
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left font-sans text-xs">
                  <thead className="bg-[#0A1628] text-white font-mono uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Claim Reference</th>
                      <th className="p-4">Patient Name</th>
                      <th className="p-4">Diagnosis</th>
                      <th className="p-4">Treatment Administered</th>
                      <th className="p-4 text-center">Amount Claimed</th>
                      <th className="p-4 text-center">Approved Compensation</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Clinical Response</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {providerClaims.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                        <td className="p-4 font-mono font-bold text-[#0A1628] dark:text-white text-[10px]">{c.id}</td>
                        <td className="p-4 font-bold text-gray-800 dark:text-slate-200">{c.policies?.profiles?.name ?? '—'}</td>
                        <td className="p-4 font-medium text-gray-700 dark:text-slate-300">{c.diagnosis}</td>
                        <td className="p-4 text-gray-500 dark:text-slate-400 font-mono text-[11px]">{c.treatment}</td>
                        <td className="p-4 text-center font-mono font-bold text-gray-900 dark:text-slate-200">UGX {c.amount_claimed?.toLocaleString()}</td>
                        <td className="p-4 text-center font-mono font-bold text-[#0D9488]">
                          {c.amount_approved > 0 ? `UGX ${c.amount_approved.toLocaleString()}` : '—'}
                        </td>
                        <td className="p-4">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="p-4 text-gray-400 dark:text-slate-500 font-mono text-[10px]" title={c.review_notes}>
                          {c.review_notes || 'In review queue.'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Eligibility Tab */}
      {activeTab === 'eligibility' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-black text-[#0A1628] dark:text-white">Verify Patient Health Coverage Eligibility</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Enter National ID (NIN) to verify active insurance status, remaining balance, and dependants before clinical service rendering.
                Every lookup is audit-logged.
              </p>
            </div>

            <form onSubmit={handleCheckEligibility} className="space-y-2">
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    required
                    placeholder="Enter Uganda National ID — 14 chars (e.g. CM01037AGV2G12)"
                    value={eligibilityNIN}
                    onChange={(e) => { setEligibilityNIN(e.target.value); setEligibilityNINError(''); }}
                    className={`w-full border rounded-xl px-4 py-2.5 text-xs font-mono bg-white dark:bg-slate-700 dark:text-white outline-none focus:ring-1 uppercase ${eligibilityNINError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-slate-600 focus:ring-[#0D9488]'}`}
                  />
                  {eligibilityNINError && (
                    <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> {eligibilityNINError}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={checkingEligibility}
                  className="bg-[#0D9488] hover:bg-[#0b7e74] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {checkingEligibility ? (
                    <span className="flex items-center gap-1.5"><RefreshCw className="h-3 w-3 animate-spin" /> Verifying...</span>
                  ) : (
                    'Check Coverage'
                  )}
                </button>
              </div>
            </form>

            {eligibilityError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 rounded-xl text-xs font-medium flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{eligibilityError}</span>
              </div>
            )}
          </div>

          {/* Eligibility Result Card */}
          {eligibilityResult && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-md p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-teal-800 text-white font-mono font-bold flex items-center justify-center text-sm">
                    {eligibilityResult.member?.name?.[0]}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-[#0A1628] dark:text-white">{eligibilityResult.member?.name}</h4>
                    <span className="text-xs text-gray-400 dark:text-slate-400 font-mono">NIN: {eligibilityResult.member?.national_id} | Phone: {eligibilityResult.member?.phone}</span>
                  </div>
                </div>

                <div className="text-right">
                  {eligibilityResult.is_eligible ? (
                    <span className="inline-flex items-center gap-1.5 text-xs uppercase font-mono font-black px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle className="h-3.5 w-3.5" /> Coverage Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs uppercase font-mono font-black px-3 py-1 rounded-xl bg-red-100 text-red-800 border border-red-300">
                      <AlertTriangle className="h-3.5 w-3.5" /> No Active Policy
                    </span>
                  )}
                </div>
              </div>

              {eligibilityResult.is_eligible && eligibilityResult.policy && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                  <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl border border-slate-100 dark:border-slate-600 space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Assigned Plan Tier</span>
                    <span className="font-extrabold text-[#0D9488] text-sm">{eligibilityResult.policy.plans?.name || 'Standard Plan'}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl border border-slate-100 dark:border-slate-600 space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Annual Limit</span>
                    <span className="font-extrabold text-[#0A1628] dark:text-white text-sm">UGX {(eligibilityResult.policy.coverage_limit || 5000000).toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl border border-slate-100 dark:border-slate-600 space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Remaining Balance</span>
                    <span className="font-extrabold text-emerald-600 text-sm">UGX {(eligibilityResult.policy.remaining_coverage || 5000000).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {!eligibilityResult.is_eligible && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                  <strong>Member has no active policy.</strong> They may have a suspended or expired policy. Please advise them to contact OHIMS Uganda to reinstate coverage before receiving services.
                </div>
              )}

              {eligibilityResult.beneficiaries?.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                  <h5 className="font-bold text-xs text-gray-700 dark:text-slate-300 uppercase tracking-wider font-mono">Eligible Covered Dependants</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {eligibilityResult.beneficiaries.map((b: any) => (
                      <div key={b.id} className="p-2.5 bg-teal-50/50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800/40 rounded-xl flex justify-between items-center text-xs">
                        <span className="font-bold text-gray-800 dark:text-slate-200">{b.name}</span>
                        <span className="text-[10px] font-mono text-[#0D9488] bg-teal-100 dark:bg-teal-800/40 px-2 py-0.5 rounded uppercase font-bold">{b.relationship}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {eligibilityResult.is_eligible && (
                <button
                  onClick={() => {
                    setSelectedPolicyId(eligibilityResult.policy?.id);
                    setShowClaimForm(true);
                    setActiveTab('claims');
                  }}
                  className="w-full bg-[#0D9488] hover:bg-[#0b7e74] text-white font-bold text-xs py-2.5 rounded-xl shadow-sm cursor-pointer transition-colors"
                >
                  Proceed to File Claim for this Member
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProviderDashboard(props: ProviderDashboardProps) {
  return (
    <ErrorBoundary section="Provider Dashboard">
      <ProviderDashboardInner {...props} />
    </ErrorBoundary>
  );
}
