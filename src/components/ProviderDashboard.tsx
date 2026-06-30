/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  FileText,
  DollarSign,
  Plus,
  Compass,
  Building2,
  CheckCircle,
  AlertTriangle,
  Users,
  Calendar,
  Clock,
  Briefcase
} from 'lucide-react';
import { User, Provider, Claim, Member } from '../types';
import { providersApi, claimsApi, membersApi } from '../lib/api';

interface ProviderDashboardProps {
  currentUser: User;
  onRefreshData: () => void;
}

export default function ProviderDashboard({ currentUser, onRefreshData }: ProviderDashboardProps) {
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);
  const [providerClaims, setProviderClaims] = useState<Claim[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [claimDiagnosis, setClaimDiagnosis] = useState('');
  const [claimTreatment, setClaimTreatment] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Patient search and file upload mockup states
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileSize, setSelectedFileSize] = useState('');

  const fetchProviderData = async () => {
    try {
      setLoading(true);

      // Fetch all providers and find matching one
      const allProvs = await providersApi.list();
      const match = allProvs.find((p: any) =>
        p.contact?.includes(currentUser.phone) ||
        p.name?.toLowerCase().includes(currentUser.name.split(' ')[0].toLowerCase())
      );
      const activeProv = (match || allProvs[0]) as unknown as Provider;
      setActiveProvider(activeProv);

      if (activeProv) {
        // Fetch claims for this provider
        const claimsData = await claimsApi.list({ provider_id: activeProv.id });
        setProviderClaims(claimsData as unknown as Claim[]);
      }

      // Fetch all members for patient assignment
      const subData = await membersApi.list();
      setPatients(subData);
      if (subData.length > 0 && !selectedPolicyId) {
        const firstPol = (subData[0] as any)?.policies?.[0]?.id;
        if (firstPol) setSelectedPolicyId(firstPol);
      }
    } catch (err) {
      console.error('Error fetching clinician credentials', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviderData();
  }, [currentUser]);

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!selectedPolicyId || !claimDiagnosis || !claimTreatment || !claimAmount) {
      setFormError('Patient policy ID, Diagnosis, Treatment services, and Invoiced amount are required.');
      return;
    }

    try {
      await claimsApi.submit({
        policy_id: selectedPolicyId,
        provider_id: activeProvider?.id,
        diagnosis: claimDiagnosis,
        treatment: claimTreatment,
        amount_claimed: Number(claimAmount),
        actorId: currentUser.id,
        actorName: currentUser.name,
      });
      setFormSuccess('Claim filed successfully for reviewer audit!');
      setTimeout(() => {
        setShowClaimForm(false);
        setClaimDiagnosis('');
        setClaimTreatment('');
        setClaimAmount('');
        setSelectedFileName('');
        setSelectedFileSize('');
        setPatientSearch('');
        setFormSuccess('');
        onRefreshData();
        fetchProviderData();
      }, 2000);
    } catch (err: any) {
      setFormError('Failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center text-sm font-mono text-[#0D9488]">
        <Clock className="h-5 w-5 animate-spin mx-auto mb-2" />
        Syncing Healthcare practitioner logs & credential registers...
      </div>
    );
  }

  // Aggregate stats
  const pendingCount = providerClaims.filter(c => c.status === 'submitted' || c.status === 'under_review').length;
  const approvedTotal = providerClaims.filter(c => c.status === 'approved' || c.status === 'paid').reduce((sum, c) => sum + c.amount_approved, 0);
  const totalSubCount = providerClaims.length;

  const filteredPatients = patients.filter(p => {
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
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-4">
            <div className="bg-[#0D9488]/10 p-3.5 rounded-2xl text-[#0D9488] shrink-0">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-[#0A1628]">{activeProvider.name}</h2>
                <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                  activeProvider.accreditation_status === 'accredited' ? 'bg-[#0D9488]/15 text-[#0D9488]' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  ✓ {activeProvider.accreditation_status}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono mt-1">Location Contact: {activeProvider.location} | Tel: {activeProvider.contact}</p>
            </div>
          </div>

          {activeProvider.accreditation_status === 'accredited' && (
            <button
              id="clinic-file-claim-btn"
              onClick={() => setShowClaimForm(true)}
              className="bg-[#0D9488] hover:bg-[#0b7e74] text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> File Patient medical Claim
            </button>
          )}
        </div>
      )}

      {/* Numerical Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="bg-teal-50 p-3 rounded-xl text-[#0D9488]">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block">Total Claims Submitted</span>
            <span className="text-xl font-extrabold text-[#0A1628]">{totalSubCount} clinical claims</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
            <Clock className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block">Evaluation Queue</span>
            <span className="text-xl font-extrabold text-[#0A1628]">{pendingCount} claims pending</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="bg-green-50 p-3 rounded-xl text-emerald-600">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block">Reimbursements Disbursed</span>
            <span className="text-xl font-extrabold text-emerald-700">UGX {approvedTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Patient Claim Transmission Form */}
      {showClaimForm && (
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl max-w-2xl mx-auto space-y-4">
          <div className="border-b border-gray-100 pb-2.5">
            <h3 className="font-bold text-sm text-[#0A1628] uppercase tracking-wide">File Patient clinical claim (Provider portal)</h3>
            <p className="text-[11px] text-gray-400">Claims automatically undergo rule-based duplicate assessments and low-value SLA triages.</p>
          </div>

          <form onSubmit={handleSubmitClaim} className="space-y-4 font-sans text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Select Patient / Member Profile</label>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="Search name, ID, or policy..."
                    value={patientSearch}
                    onChange={e => setPatientSearch(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white outline-none focus:border-[#0D9488]"
                  />
                  <select
                    value={selectedPolicyId}
                    onChange={e => setSelectedPolicyId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:outline-[#0D9488]"
                  >
                    <option value="">-- Choose Patient ({filteredPatients.length} matched) --</option>
                    {filteredPatients.map(p => (
                      p.active_policy ? (
                        <option key={p.id} value={p.active_policy.id}>
                          {p.name} (Policy: {p.active_policy.id} - {p.active_policy.plan_name})
                        </option>
                      ) : null
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Invoiced Medical Fees (UGX)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold font-mono text-[10px] text-gray-400">UGX</span>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 150000"
                    value={claimAmount}
                    onChange={e => setClaimAmount(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg pl-12 pr-3 py-2 text-xs bg-white font-mono outline-none focus:outline-[#0D9488]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Diagnosis (ICD Codes / Clinical Terms)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Outpatient Acute Gastroenteritis"
                  value={claimDiagnosis}
                  onChange={e => setClaimDiagnosis(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs uppercase bg-white outline-none focus:outline-[#0D9488]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Treatment administered / Procedures</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IV Rehydration therapy, generic prescription antibiotics"
                  value={claimTreatment}
                  onChange={e => setClaimTreatment(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:outline-[#0D9488]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Supporting Medical Documentation (Receipts/Diagnostics)</label>
              <div className="border border-dashed border-gray-300 rounded-lg p-3 flex flex-col items-center justify-center bg-white hover:bg-slate-50 transition-colors">
                <input
                  type="file"
                  id="claim-file-upload"
                  className="hidden"
                  onChange={e => {
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

            {formError && (
              <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg font-medium leading-relaxed">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="p-3 bg-teal-50 text-teal-700 border border-teal-100 rounded-lg font-bold leading-relaxed">
                {formSuccess}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
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
                className="bg-[#0A1628] hover:bg-slate-900 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-sm"
              >
                Transmit Invoiced Claim to review
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Claims submitted list */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-400 font-mono uppercase tracking-wider block">Submitted Clinic Claims History</h3>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left font-sans text-xs">
              <thead className="bg-[#0A1628] text-white font-mono uppercase tracking-wider">
                <tr>
                  <th className="p-4">Claim reference</th>
                  <th className="p-4">Patient Name</th>
                  <th className="p-4">Diagnosis</th>
                  <th className="p-4">Treatment administered</th>
                  <th className="p-4 text-center">Amount claimed</th>
                  <th className="p-4 text-center">Approved compensation</th>
                  <th className="p-4">Status State</th>
                  <th className="p-4">Clinical Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {providerClaims.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400">
                      No clinical claims recorded for this clinic.
                    </td>
                  </tr>
                ) : (
                  providerClaims.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono font-bold text-[#0A1628]">{c.id}</td>
                      <td className="p-4 font-bold text-gray-800">{c.holder_name}</td>
                      <td className="p-4 font-medium text-gray-700">{c.diagnosis}</td>
                      <td className="p-4 text-gray-500 font-mono text-[11px]">{c.treatment}</td>
                      <td className="p-4 text-center font-mono font-bold text-gray-900">UGX {c.amount_claimed.toLocaleString()}</td>
                      <td className="p-4 text-center font-mono font-bold text-[#0D9488]">
                        {c.amount_approved > 0 ? `UGX ${c.amount_approved.toLocaleString()}` : '--'}
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded leading-none ${
                          c.status === 'paid' ? 'bg-teal-100 text-teal-800 border border-teal-200' :
                          c.status === 'approved' ? 'bg-emerald-100 text-teal-800' :
                          c.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400 font-mono text-[10px]" title={c.notes}>
                        {c.notes || 'In review queue.'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
