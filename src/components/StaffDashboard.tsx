/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  FileCheck,
  AlertTriangle,
  Activity,
  DollarSign,
  Briefcase,
  Users,
  Settings,
  RefreshCw,
  Bell,
  Scale,
  X,
  FileText,
  Calendar,
  Clock,
  Download,
  Search
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { User, Claim, Policy, Premium } from '../types';

interface StaffDashboardProps {
  currentUser: User;
  onRefreshData: () => void;
}

export default function StaffDashboard({ currentUser, onRefreshData }: StaffDashboardProps) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [premiums, setPremiums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'claims' | 'policies' | 'reminders' | 'providers' | 'plans' | 'settings' | 'logs'>('claims');

  // Provider states
  const [providers, setProviders] = useState<any[]>([]);
  const [providerName, setProviderName] = useState('');
  const [providerType, setProviderType] = useState('hospital');
  const [providerLocation, setProviderLocation] = useState('');
  const [providerContact, setProviderContact] = useState('');
  const [providerError, setProviderError] = useState('');
  const [providerSuccess, setProviderSuccess] = useState('');
  const [showProviderForm, setShowProviderForm] = useState(false);

  // Plan states
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planPremium, setPlanPremium] = useState('');
  const [planLimit, setPlanLimit] = useState('');
  const [planBenefits, setPlanBenefits] = useState('');
  const [planExclusions, setPlanExclusions] = useState('');
  const [planError, setPlanError] = useState('');
  const [planSuccess, setPlanSuccess] = useState('');
  const [showPlanForm, setShowPlanForm] = useState(false);

  // Settings states
  const [settingsAllowAuto, setSettingsAllowAuto] = useState(true);
  const [settingsThreshold, setSettingsThreshold] = useState('');
  const [settingsSlaDays, setSettingsSlaDays] = useState('');
  const [settingsRequireAccreditation, setSettingsRequireAccreditation] = useState(true);
  const [settingsAllowSelfSubmit, setSettingsAllowSelfSubmit] = useState(true);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');

  // Audit Logs states
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditSearch, setAuditSearch] = useState('');

  // Adjudication popup state
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewError, setReviewError] = useState('');

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      
      const claimsRes = await fetch('/api/claims', {
        headers: { 'Authorization': `Bearer ${currentUser.id}` }
      });
      const claimsData = await claimsRes.json();
      setClaims(claimsData);

      const polRes = await fetch('/api/policies', {
        headers: { 'Authorization': `Bearer ${currentUser.id}` }
      });
      const polData = await polRes.json();
      setPolicies(polData);

      const premRes = await fetch('/api/premiums', {
        headers: { 'Authorization': `Bearer ${currentUser.id}` }
      });
      const premData = await premRes.json();
      setPremiums(premData);

      const provRes = await fetch('/api/providers', {
        headers: { 'Authorization': `Bearer ${currentUser.id}` }
      });
      if (provRes.ok) {
        setProviders(await provRes.json());
      }

      const plansRes = await fetch('/api/plans', {
        headers: { 'Authorization': `Bearer ${currentUser.id}` }
      });
      if (plansRes.ok) {
        setPlans(await plansRes.json());
      }

      const settingsRes = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${currentUser.id}` }
      });
      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setSettingsAllowAuto(s.allowAutoApprovalOfLowClaims);
        setSettingsThreshold(s.lowClaimThreshold.toString());
        setSettingsSlaDays(s.autoSlaDays.toString());
        setSettingsRequireAccreditation(s.requireProviderAccreditation);
        setSettingsAllowSelfSubmit(s.allowSelfClaimSubmission);
      }

      const logsRes = await fetch('/api/audit-logs', {
        headers: { 'Authorization': `Bearer ${currentUser.id}` }
      });
      if (logsRes.ok) {
        setAuditLogs(await logsRes.json());
      }

    } catch (e) {
      console.error('Error loading adjuster logs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, [currentUser]);

  // Handle adjudication decision
  const handleAdjudicate = async (status: 'approved' | 'rejected') => {
    if (!selectedClaim) return;
    setReviewError('');

    const amt = status === 'approved' ? Number(approvedAmount) : 0;
    if (status === 'approved' && (isNaN(amt) || amt <= 0)) {
      setReviewError('Provide a valid non-zero compensation amount.');
      return;
    }

    try {
      const res = await fetch(`/api/claims/${selectedClaim.id}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          status,
          amount_approved: amt,
          notes: reviewNotes,
          is_flagged: false // clear duplicate or suspicious flag upon manual review
        })
      });

      if (!res.ok) {
        const d = await res.json();
        setReviewError(d.error || 'Review submission refused.');
        return;
      }

      setSelectedClaim(null);
      setApprovedAmount('');
      setReviewNotes('');
      onRefreshData();
      fetchStaffData();
    } catch (err: any) {
      setReviewError('Failed to save assessment: ' + err.message);
    }
  };

  // Dispatch Direct Payout
  const handleDisbursePayout = async (claimId: string) => {
    try {
      const res = await fetch(`/api/claims/${claimId}/pay`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentUser.id}` }
      });
      if (res.ok) {
        onRefreshData();
        fetchStaffData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Policy conditions on-the-fly (Module 3)
  const handleTogglePolicyStatus = async (policyId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/policies/${policyId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        onRefreshData();
        fetchStaffData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Terminate policy forever (Module 3)
  const handleTerminatePolicy = async (policyId: string) => {
    if (!window.confirm('Are you absolutely sure you want to TERMINATE this user policy? This completely revokes healthcare diagnostic coverage.')) return;
    try {
      const res = await fetch(`/api/policies/${policyId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({ status: 'terminated' })
      });
      if (res.ok) {
        onRefreshData();
        fetchStaffData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger Bulk Premium Reminders
  const handleBroadcastReminders = async () => {
    try {
      const res = await fetch('/api/premiums/remind', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentUser.id}` }
      });
      if (res.ok) {
        const d = await res.json();
        alert(`SLA automation successful! Dispatched ${d.count} notification reminders.`);
        onRefreshData();
        fetchStaffData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Provider Accreditation
  const handleToggleProviderAccreditation = async (id: string, status: 'accredited' | 'suspended') => {
    try {
      const res = await fetch(`/api/providers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({ accreditation_status: status })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update accreditation');
        return;
      }
      fetchStaffData();
      onRefreshData();
    } catch (err: any) {
      alert('Failed to connect to server: ' + err.message);
    }
  };

  // Add a Clinic Provider Partner
  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setProviderError('');
    setProviderSuccess('');

    if (!providerName || !providerLocation || !providerContact) {
      setProviderError('Please fill out Name, Location, and Contact details.');
      return;
    }

    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          name: providerName,
          type: providerType,
          location: providerLocation,
          contact: providerContact,
          approved_plans: ['plan-basic', 'plan-standard', 'plan-premium']
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setProviderError(data.error || 'Failed to register provider');
        return;
      }
      setProviderSuccess('Clinic partner registered successfully under review!');
      setProviderName('');
      setProviderLocation('');
      setProviderContact('');
      setShowProviderForm(false);
      fetchStaffData();
      onRefreshData();
      setTimeout(() => setProviderSuccess(''), 3000);
    } catch (err: any) {
      setProviderError('Connection failed: ' + err.message);
    }
  };

  // Save Config Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuccess('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          allowAutoApprovalOfLowClaims: settingsAllowAuto,
          lowClaimThreshold: Number(settingsThreshold),
          autoSlaDays: Number(settingsSlaDays),
          requireProviderAccreditation: settingsRequireAccreditation,
          allowSelfClaimSubmission: settingsAllowSelfSubmit
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setSettingsError(data.error || 'Failed to update settings');
        return;
      }
      setSettingsSuccess('System configuration parameters saved.');
      fetchStaffData();
      onRefreshData();
      setTimeout(() => setSettingsSuccess(''), 3000);
    } catch (err: any) {
      setSettingsError('Connection failed: ' + err.message);
    }
  };

  // Save Plan details (Create or Edit)
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlanError('');
    setPlanSuccess('');

    if (!planName || !planDescription || !planPremium || !planLimit) {
      setPlanError('Please fill out Name, Description, Premium, and Limits.');
      return;
    }

    const payload = {
      name: planName,
      description: planDescription,
      premium_amount: Number(planPremium),
      coverage_limit: Number(planLimit),
      benefits: planBenefits.split(',').map(s => s.trim()).filter(Boolean),
      exclusions: planExclusions.split(',').map(s => s.trim()).filter(Boolean)
    };

    try {
      const url = selectedPlan ? `/api/plans/${selectedPlan.id}` : '/api/plans';
      const method = selectedPlan ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.id}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setPlanError(data.error || 'Failed to save insurance plan');
        return;
      }
      setPlanSuccess(selectedPlan ? 'Insurance plan updated successfully.' : 'New insurance plan created successfully.');
      setPlanName('');
      setPlanDescription('');
      setPlanPremium('');
      setPlanLimit('');
      setPlanBenefits('');
      setPlanExclusions('');
      setSelectedPlan(null);
      setShowPlanForm(false);
      fetchStaffData();
      onRefreshData();
      setTimeout(() => setPlanSuccess(''), 3000);
    } catch (err: any) {
      setPlanError('Connection failed: ' + err.message);
    }
  };

  const exportAllPoliciesToPDF = () => {
    if (policies.length === 0) return;
    const doc = new jsPDF();
    
    // Header block
    doc.setFillColor(10, 22, 40); // #0A1628
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('ONLINE HEALTH INSURANCE MANAGEMENT SYSTEM (OHIMS) UGANDA', 15, 22);
    doc.setFontSize(10);
    doc.text('GLOBAL COVERAGE POLICIES & STATUS AUDIT REGISTER', 15, 31);
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    let y = 55;
    doc.setFont('helvetica', 'bold');
    doc.text('ONLINE SYSTEM POLICY AUDIT LEDGER', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Exported By: Ahumuza Brian | Role: Authorized Underwriter representative`, 15, y + 6);
    doc.text(`Assessment Date: ${new Date().toLocaleDateString()}`, 15, y + 12);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y + 15, 195, y + 15);
    
    y += 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('Policy ID', 15, y);
    doc.text('Policyholder name', 40, y);
    doc.text('Plan Tier', 105, y);
    doc.text('Premium Mode', 135, y);
    doc.text('Status', 168, y);
    doc.line(15, y + 2, 195, y + 2);
    y += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    policies.forEach((p: any) => {
      if (y > 270) {
        doc.addPage();
        y = 30;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(p.id, 15, y);
      doc.setFont('helvetica', 'normal');
      doc.text(p.holder_name || '--', 40, y);
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text(p.holder_email || '', 40, y + 4.5);
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      doc.text(p.plan_name || '--', 105, y);
      doc.text(p.premium_frequency?.toUpperCase() || '--', 135, y);
      doc.text(p.status?.toUpperCase() || '--', 168, y);
      y += 13;
    });

    doc.save(`OHIMS_Policies_Operational_Audit_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportAllClaimsToPDF = () => {
    if (claims.length === 0) return;
    const doc = new jsPDF();
    
    // Header block
    doc.setFillColor(15, 23, 42); // #10172A
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('ONLINE HEALTH INSURANCE MANAGEMENT SYSTEM (OHIMS) UGANDA CLAIMS', 15, 22);
    doc.setFontSize(10);
    doc.text('SYSTEM PORTFOLIO MEDICAL CLAIMS AUDIT LEDGER', 15, 31);
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    let y = 55;
    doc.setFont('helvetica', 'bold');
    doc.text('CLAIMS PIPELINE DIRECTORY REPORT', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Authorized Auditing Staff: Ahumuza Brian`, 15, y + 6);
    doc.text(`Ledger Export Triggered: ${new Date().toLocaleDateString()}`, 15, y + 12);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y + 15, 195, y + 15);
    
    y += 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('ID', 15, y);
    doc.text('Holder Name', 35, y);
    doc.text('Diagnosis', 78, y);
    doc.text('Amount Claimed', 125, y);
    doc.text('Approved', 155, y);
    doc.text('Status', 178, y);
    doc.line(15, y + 2, 195, y + 2);
    y += 8;
    
    doc.setFont('helvetica', 'normal');
    claims.forEach((c: any) => {
      if (y > 270) {
        doc.addPage();
        y = 30;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(c.id, 15, y);
      doc.setFont('helvetica', 'normal');
      doc.text(c.holder_name || '--', 35, y);
      
      const diagVal = c.diagnosis.length > 20 ? c.diagnosis.substring(0, 18) + '...' : c.diagnosis;
      doc.text(diagVal, 78, y);
      doc.setFontSize(7.5);
      doc.setTextColor(110, 110, 110);
      const treatVal = c.treatment.length > 25 ? c.treatment.substring(0, 23) + '...' : c.treatment;
      doc.text(treatVal, 78, y + 4.5);
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);

      doc.text(`UGX ${c.amount_claimed.toLocaleString()}`, 125, y);
      doc.text(c.amount_approved > 0 ? `UGX ${c.amount_approved.toLocaleString()}` : 'UGX 0', 155, y);
      doc.text(c.status?.toUpperCase() || '--', 178, y);
      y += 13;
    });

    doc.save(`OHIMS_Claims_Operational_Audit_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center text-sm font-mono text-[#0D9488]">
        <Clock className="h-5 w-5 animate-spin mx-auto mb-2" />
        Synchronizing Adjuster Review Registers & Claim queues...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#0D9488] uppercase tracking-wider font-mono">Insurance Staff Workspace</span>
          <h2 className="text-2xl font-black text-[#0A1628]">Claims Adjudication Hub</h2>
          <p className="text-xs text-gray-500 mt-1 font-mono">Operator ID: Ahumuza Brian | Role: Authorized Underwriter representative</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeTab === 'policies' && (
            <button
              onClick={exportAllPoliciesToPDF}
              className="bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
            >
              <Download className="h-4 w-4 text-[#0D9488]" /> Export Policies Audit PDF
            </button>
          )}
          {activeTab === 'claims' && (
            <button
              onClick={exportAllClaimsToPDF}
              className="bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
            >
              <Download className="h-4 w-4 text-[#0D9488]" /> Export Claims Ledger PDF
            </button>
          )}
          <button
            onClick={() => setActiveTab('reminders')}
            className="bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold px-4 py-2.5 rounded-lg border border-amber-200 transition-colors flex items-center gap-1.5"
          >
            <Bell className="h-4 w-4" /> Trigger Auto Reminders
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'claims', label: `Pending Claims Pipeline (${claims.filter(c=>c.status==='submitted'||c.status==='under_review').length})` },
          { id: 'policies', label: 'Coverage Policies & suspensions' },
          { id: 'reminders', label: 'Premium Billing & reminders' },
          { id: 'providers', label: 'Healthcare Partners & Clinic status' },
          { id: 'plans', label: 'Insurance Policy plans Editor' },
          { id: 'settings', label: 'System SLA settings' },
          { id: 'logs', label: 'Transparency Audit logs' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-colors ${activeTab === t.id ? 'border-[#0D9488] text-[#0D9488]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ==================== TAB 1 CLAIMS ADJUDICATION ==================== */}
      {activeTab === 'claims' && (
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-gray-400 font-mono uppercase tracking-wider block">Claims Queue Process Panel</h3>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left font-sans text-xs">
                <thead className="bg-[#0A1628] text-white font-mono uppercase tracking-wider">
                  <tr>
                    <th className="p-4">ID Reference</th>
                    <th className="p-4">Beneficiary / Member</th>
                    <th className="p-4">Clinic Provider</th>
                    <th className="p-4">Diagnosis & treatment</th>
                    <th className="p-4 text-center">Amount claimed</th>
                    <th className="p-4">Triage Priority</th>
                    <th className="p-4 text-center">Action Wizard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {claims.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">
                        No medical claims pending review.
                      </td>
                    </tr>
                  ) : (
                    claims.map((c: any) => (
                      <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${c.is_flagged ? 'bg-amber-50/50' : ''}`}>
                        <td className="p-4 font-mono font-bold text-[#0A1628]">{c.id}</td>
                        <td className="p-4">
                          <span className="font-bold text-gray-800 block">{c.holder_name}</span>
                          <span className="text-[10px] text-gray-400 font-mono">National ID: {c.holder_national_id}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-gray-700 block">{c.provider_name}</span>
                        </td>
                        <td className="p-4 max-w-xs">
                          <span className="font-bold text-rose-800 block uppercase text-[10px]">{c.diagnosis}</span>
                          <span className="text-gray-500 font-mono text-[10px] truncate block mt-0.5">{c.treatment}</span>
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-gray-900">UGX {c.amount_claimed.toLocaleString()}</td>
                        <td className="p-4">
                          {c.is_flagged ? (
                            <span className="text-[10px] uppercase font-black font-mono text-red-600 bg-red-100 px-2 py-0.5 rounded flex items-center gap-1 w-fit animate-pulse">
                              <AlertTriangle className="h-3 w-3 shrink-0" /> SUSPICIOUS
                            </span>
                          ) : c.status === 'approved' || c.status === 'paid' ? (
                            <span className="text-[10px] uppercase font-bold text-teal-700 bg-teal-100 px-2 py-1 rounded">
                              ✓ PASS
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-150 px-2 py-1 rounded">
                              ● NORMAL
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {c.status === 'submitted' || c.status === 'under_review' ? (
                            <button
                              id={`evaluate-claim-${c.id}-btn`}
                              onClick={() => {
                                setSelectedClaim(c);
                                setApprovedAmount(c.amount_claimed.toString());
                              }}
                              className="bg-[#0D9488] hover:bg-[#0b7e74] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg font-sans"
                            >
                              Evaluate & Adjust
                            </button>
                          ) : c.status === 'approved' ? (
                            <button
                              id={`pay-claim-${c.id}-btn`}
                              onClick={() => handleDisbursePayout(c.id)}
                              className="bg-[#0A1628] hover:bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg"
                            >
                              Disburse UGX {c.amount_approved.toLocaleString()}
                            </button>
                          ) : (
                            <span className="text-gray-400 font-bold uppercase font-mono text-[10px]">Adjudicated ({c.status})</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Adjudication Adjuster Modal Box (Module 4) */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden text-xs">
            <div className="bg-[#0A1628] text-white p-4 flex justify-between items-center">
              <span className="font-extrabold font-mono tracking-tight uppercase">Claims adjudication Wizard</span>
              <button onClick={() => setSelectedClaim(null)} className="p-1 hover:bg-slate-800 rounded-full">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 font-sans">
              {selectedClaim.is_flagged && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5 animate-pulse" />
                  <div>
                    <h5 className="font-black">AUTOMATED SUSPICIOUS INDICATOR FLAG TRIGGERED:</h5>
                    <p className="text-[10px] mt-0.5 leading-relaxed font-mono">{selectedClaim.notes}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 block font-mono">Patient Member:</span>
                  <span className="font-bold text-[#0A1628] text-sm">{selectedClaim.holder_name}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-mono">Invoiced Provider:</span>
                  <span className="font-bold text-[#0A1628] text-sm">{selectedClaim.provider_name}</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-gray-400 block font-mono uppercase tracking-wider text-[10px]">Diagnosis & Treatment:</span>
                <p className="font-black text-[#0A1628] mt-1 text-sm">{selectedClaim.diagnosis}</p>
                <p className="text-gray-500 font-mono mt-0.5">{selectedClaim.treatment}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <span className="text-gray-400 font-bold block font-mono">Invoiced requested Sum:</span>
                  <span className="text-base font-black text-[#0A1628]">UGX {selectedClaim.amount_claimed.toLocaleString()}</span>
                </div>

                <div>
                  <label className="block text-gray-500 font-bold font-mono mb-1 text-[10px] uppercase">Approved payout compensation (UGX)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 font-bold font-mono text-[10px] text-gray-400">UGX</span>
                    <input
                      type="number"
                      required
                      value={approvedAmount}
                      onChange={e => setApprovedAmount(e.target.value)}
                      className="w-full border border-gray-200 rounded pl-11 pr-2.5 py-1.5 focus:border-[#0D9488] font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-bold font-mono mb-1 text-[10px] uppercase">Review Comments/Exclusion explanations</label>
                <textarea
                  rows={2}
                  placeholder="Insert clinical notes or plan section justifications here..."
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 outline-none focus:border-[#0D9488]"
                />
              </div>

              {reviewError && <div className="text-red-700 font-semibold p-2.5 bg-red-50 border border-red-100 rounded">{reviewError}</div>}

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleAdjudicate('rejected')}
                  className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold px-4 py-2 rounded-lg"
                >
                  Deny Claim
                </button>
                <button
                  id="staff-claim-approve-btn"
                  onClick={() => handleAdjudicate('approved')}
                  className="bg-[#0D9488] hover:bg-[#0b7e74] text-white text-[11px] font-bold px-4 py-2 rounded-lg"
                >
                  Approve Claim for Payout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2 POLICIES & STATUS SUSPENSIONS ==================== */}
      {activeTab === 'policies' && (
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-gray-400 font-mono uppercase tracking-wider block font-bold">Policy administration & Suspension Toggles</h3>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left font-sans text-xs">
                <thead className="bg-[#0A1628] text-white font-mono uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Policy key</th>
                    <th className="p-4">Policyholder Holder</th>
                    <th className="p-4">Assigned Plan Tier</th>
                    <th className="p-4">Effective timeline</th>
                    <th className="p-4">Billing Frequency</th>
                    <th className="p-4">Current Status</th>
                    <th className="p-4 text-center">Benefit control Adjustments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {policies.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-[#0A1628]">{p.id}</td>
                      <td className="p-4 font-sans font-bold text-gray-800">
                        {p.holder_name}
                        <span className="block text-[10px] text-gray-400 font-mono italic">{p.holder_email}</span>
                      </td>
                      <td className="p-4 font-sans font-medium text-gray-600">{p.plan_name}</td>
                      <td className="p-4 text-[11px] text-gray-500">{p.start_date} to {p.end_date}</td>
                      <td className="p-4 uppercase">{p.premium_frequency}</td>
                      <td className="p-4">
                        <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded ${
                          p.status === 'active' ? 'bg-[#0D9488]/15 text-[#0D9488]' :
                          p.status === 'suspended' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          ● {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-center space-x-2">
                        {p.status !== 'terminated' ? (
                          <>
                            <button
                              id={`toggle-policy-${p.id}-btn`}
                              onClick={() => handleTogglePolicyStatus(p.id, p.status)}
                              className={`text-[10px] font-bold px-2.5 py-1.5 rounded border font-sans ${
                                p.status === 'active' 
                                  ? 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100' 
                                  : 'border-[#0D9488]/30 text-[#0D9488] bg-teal-50 hover:bg-[#0D9488]/10'
                              }`}
                            >
                              {p.status === 'active' ? 'Suspend Benefits' : 'Reactivate'}
                            </button>

                            <button
                              onClick={() => handleTerminatePolicy(p.id)}
                              className="text-[10px] font-bold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded font-sans"
                            >
                              Terminate Plan
                            </button>
                          </>
                        ) : (
                          <span className="text-gray-400 italic">Policy terminated</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3 REMINDERS TRIGGER ==================== */}
      {activeTab === 'reminders' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 space-y-4">
            <div className="flex items-center space-x-3">
              <Bell className="h-6 w-6 text-amber-600" />
              <h4 className="font-extrabold text-[#0A1628] sm:text-lg">Outstanding premium Collection Reminders</h4>
            </div>
            
            <p className="text-xs text-amber-800 leading-relaxed leading-loose">
              Under Uganda insurance SLA guidelines, members with unpaid, overdue, or pending premium invoices receive automated alerts to prompt clearance prior to policy suspension. Use the trigger button below to fire instant notices programmatically.
            </p>

            <button
              id="broadcast-reminders-btn"
              onClick={handleBroadcastReminders}
              className="bg-[#0A1628] hover:bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md"
            >
              Force broadcast outstanding reminders
            </button>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-400 font-mono uppercase tracking-wider block">Global Invoice registry</h4>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left font-sans text-xs">
                  <thead className="bg-[#0A1628] text-white font-mono uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Bill ID</th>
                      <th className="p-4">Recipient Member</th>
                      <th className="p-4">Plan Rate</th>
                      <th className="p-4 text-center">Invoiced Sum</th>
                      <th className="p-4">Clearance Status</th>
                      <th className="p-4">Clearing receipt reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono">
                    {premiums.map(p => (
                      <tr key={p.id}>
                        <td className="p-4 font-bold text-gray-700">{p.id}</td>
                        <td className="p-4 font-sans font-bold text-gray-900">{p.holder_name}</td>
                        <td className="p-4 font-sans text-gray-500">{p.plan_name}</td>
                        <td className="p-4 text-center font-bold font-sans text-[#0A1628]">UGX {p.amount.toLocaleString()}</td>
                        <td className="p-4">
                          <span className={`text-[9px] uppercase font-bold px-2 rounded ${
                            p.status === 'paid' ? 'bg-teal-100 text-teal-800' : 'bg-red-100 text-red-800 font-black animate-pulse'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-4 text-[#0D9488] font-bold">{p.receipt_number || '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: HEALTHCARE PARTNERS & ACCREDITATION ==================== */}
      {activeTab === 'providers' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="text-sm font-bold text-gray-400 font-mono uppercase tracking-wider block">Clinic Partner Registry</h3>
              <p className="text-xs text-gray-500">Manage accreditation and review applications for partner medical providers.</p>
            </div>
            <button
              onClick={() => setShowProviderForm(!showProviderForm)}
              className="bg-[#0D9488] hover:bg-[#0b7e74] text-white text-xs font-bold px-4 py-2 rounded-lg shadow transition-transform hover:-translate-y-0.5"
            >
              {showProviderForm ? 'Hide Form' : 'Register Clinic Partner'}
            </button>
          </div>

          {showProviderForm && (
            <form onSubmit={handleCreateProvider} className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-4 max-w-2xl text-xs font-sans">
              <h4 className="font-bold text-sm text-[#0A1628] uppercase border-b border-slate-200 pb-2">New Clinic Partner Application</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Clinic/Hospital Name</label>
                  <input
                    type="text"
                    required
                    value={providerName}
                    onChange={e => setProviderName(e.target.value)}
                    placeholder="e.g. Kampala Specialist Dental Clinic"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:border-[#0D9488]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Provider Facility Type</label>
                  <select
                    value={providerType}
                    onChange={e => setProviderType(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:border-[#0D9488]"
                  >
                    <option value="hospital">Referral Hospital</option>
                    <option value="clinic">Outpatient Clinic</option>
                    <option value="lab">Medical Laboratory</option>
                    <option value="pharmacy">Pharmacy</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Physical Location Address</label>
                  <input
                    type="text"
                    required
                    value={providerLocation}
                    onChange={e => setProviderLocation(e.target.value)}
                    placeholder="e.g. Wandegeya Roundabout, Kampala"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:border-[#0D9488]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Contact Phone/Email</label>
                  <input
                    type="text"
                    required
                    value={providerContact}
                    onChange={e => setProviderContact(e.target.value)}
                    placeholder="e.g. +256 701 999888"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:border-[#0D9488]"
                  />
                </div>
              </div>

              {providerError && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg font-medium">
                  {providerError}
                </div>
              )}

              {providerSuccess && (
                <div className="p-3 bg-teal-50 text-teal-700 border border-teal-100 rounded-lg font-bold">
                  {providerSuccess}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowProviderForm(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 px-3 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#0A1628] text-white text-xs font-bold px-5 py-2 rounded-lg shadow-sm"
                >
                  Submit Registration
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left font-sans text-xs">
                <thead className="bg-[#0A1628] text-white font-mono uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Facility Name</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Accreditation</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {providers.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-gray-800">{p.name}</td>
                      <td className="p-4 uppercase font-mono text-[10px] text-slate-500">{p.type}</td>
                      <td className="p-4 text-slate-600">{p.location}</td>
                      <td className="p-4 font-mono text-slate-500">{p.contact}</td>
                      <td className="p-4">
                        <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                          p.accreditation_status === 'accredited' ? 'bg-teal-100 text-teal-800' :
                          p.accreditation_status === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {p.accreditation_status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-1 whitespace-nowrap">
                        {p.accreditation_status !== 'accredited' && (
                          <button
                            onClick={() => handleToggleProviderAccreditation(p.id, 'accredited')}
                            className="bg-[#0D9488]/10 hover:bg-[#0D9488]/20 text-[#0D9488] font-bold px-2 py-1 rounded text-[10px]"
                          >
                            Accredit ✓
                          </button>
                        )}
                        {p.accreditation_status === 'accredited' && (
                          <button
                            onClick={() => handleToggleProviderAccreditation(p.id, 'suspended')}
                            className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2 py-1 rounded text-[10px]"
                          >
                            Suspend ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 5: INSURANCE POLICY PLANS EDITOR ==================== */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="text-sm font-bold text-gray-400 font-mono uppercase tracking-wider block">Policy Plan Catalog</h3>
              <p className="text-xs text-gray-500">Configure insurance plan tiers, premiums, benefits coverage, and exclusions.</p>
            </div>
            <button
              onClick={() => {
                setSelectedPlan(null);
                setPlanName('');
                setPlanDescription('');
                setPlanPremium('');
                setPlanLimit('');
                setPlanBenefits('');
                setPlanExclusions('');
                setShowPlanForm(!showPlanForm);
              }}
              className="bg-[#0D9488] hover:bg-[#0b7e74] text-white text-xs font-bold px-4 py-2 rounded-lg shadow transition-transform hover:-translate-y-0.5"
            >
              {showPlanForm ? 'Hide Form' : 'Create Insurance Plan'}
            </button>
          </div>

          {showPlanForm && (
            <form onSubmit={handleSavePlan} className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-4 max-w-2xl text-xs font-sans">
              <h4 className="font-bold text-sm text-[#0A1628] uppercase border-b border-slate-200 pb-2">
                {selectedPlan ? 'Modify Plan Specifications' : 'Define New Insurance Plan'}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Plan Name</label>
                  <input
                    type="text"
                    required
                    value={planName}
                    onChange={e => setPlanName(e.target.value)}
                    placeholder="e.g. Titanium VIP Plus"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:border-[#0D9488]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Premium Rate (Monthly)</label>
                    <input
                      type="number"
                      required
                      value={planPremium}
                      onChange={e => setPlanPremium(e.target.value)}
                      placeholder="e.g. 150000"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white font-mono outline-none focus:border-[#0D9488]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Coverage limit (UGX)</label>
                    <input
                      type="number"
                      required
                      value={planLimit}
                      onChange={e => setPlanLimit(e.target.value)}
                      placeholder="e.g. 50000000"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white font-mono outline-none focus:border-[#0D9488]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Plan Summary Description</label>
                <textarea
                  required
                  value={planDescription}
                  onChange={e => setPlanDescription(e.target.value)}
                  placeholder="Summarize target user group and core outpatient diagnostics allocation..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:border-[#0D9488] h-20"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Covered Benefits (Comma Separated)</label>
                  <textarea
                    required
                    value={planBenefits}
                    onChange={e => setPlanBenefits(e.target.value)}
                    placeholder="General Outpatient Care, Inpatient Admission up to 10 days, Optical lenses..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:border-[#0D9488] h-20"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Coverage Exclusions (Comma Separated)</label>
                  <textarea
                    required
                    value={planExclusions}
                    onChange={e => setPlanExclusions(e.target.value)}
                    placeholder="Purely Cosmetic Interventions, Elective Nose Rhinoplasty, Organ Transplant..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:border-[#0D9488] h-20"
                  />
                </div>
              </div>

              {planError && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg font-medium">
                  {planError}
                </div>
              )}

              {planSuccess && (
                <div className="p-3 bg-teal-50 text-teal-700 border border-teal-100 rounded-lg font-bold">
                  {planSuccess}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlan(null);
                    setShowPlanForm(false);
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 px-3 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#0A1628] text-white text-xs font-bold px-5 py-2 rounded-lg shadow-sm"
                >
                  {selectedPlan ? 'Save specifications' : 'Publish Insurance Plan'}
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(p => (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-extrabold text-[#0A1628] text-base leading-tight">{p.name}</h4>
                    <span className="bg-teal-50 text-[#0D9488] font-mono font-bold text-[9px] uppercase px-2 py-0.5 rounded">
                      {p.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-500 leading-relaxed font-sans">{p.description}</p>
                  
                  <div className="border-t border-b border-gray-50 py-3 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Monthly Premium:</span>
                      <strong className="text-slate-800 font-mono">UGX {p.premium_amount.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Coverage limit:</span>
                      <strong className="text-[#0D9488] font-mono">UGX {p.coverage_limit.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-gray-400 block">Core Benefits</span>
                    <ul className="text-[10px] text-slate-600 space-y-1 list-disc list-inside">
                      {p.benefits.slice(0, 3).map((b: string, i: number) => (
                        <li key={i} className="truncate">{b}</li>
                      ))}
                      {p.benefits.length > 3 && <li className="italic text-gray-400">And {p.benefits.length - 3} more...</li>}
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedPlan(p);
                    setPlanName(p.name);
                    setPlanDescription(p.description);
                    setPlanPremium(p.premium_amount.toString());
                    setPlanLimit(p.coverage_limit.toString());
                    setPlanBenefits(p.benefits.join(', '));
                    setPlanExclusions(p.exclusions.join(', '));
                    setShowPlanForm(true);
                  }}
                  className="w-full mt-5 bg-slate-900 hover:bg-slate-800 text-white font-mono text-[10px] font-bold py-2 rounded-lg transition-transform hover:-translate-y-0.5 text-center"
                >
                  Edit Plan Details
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== TAB 6: SYSTEM SLA SETTINGS ==================== */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6 max-w-3xl">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-base font-extrabold text-[#0A1628]">Insurance Policy Parameters</h3>
            <p className="text-xs text-gray-400">Configure global auto-approval thresholds, provider validation guidelines, and SLA boundaries.</p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-6 text-xs font-sans text-slate-700">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="space-y-0.5 max-w-[70%]">
                  <strong className="block text-slate-800 text-xs">Allow Auto-Approval of Low Claims</strong>
                  <span className="text-[10px] text-gray-400">Claims below the designated threshold automatically bypass staff triage loops if no flags trigger.</span>
                </div>
                <input
                  type="checkbox"
                  checked={settingsAllowAuto}
                  onChange={e => setSettingsAllowAuto(e.target.checked)}
                  className="h-4.5 w-4.5 accent-[#0D9488] cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Low Claim Auto-Approval Threshold (UGX)</label>
                  <input
                    type="number"
                    required
                    value={settingsThreshold}
                    onChange={e => setSettingsThreshold(e.target.value)}
                    placeholder="e.g. 500000"
                    disabled={!settingsAllowAuto}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white font-mono outline-none focus:border-[#0D9488] disabled:bg-slate-100 disabled:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Standard Claim SLA Resolution Limit (Days)</label>
                  <input
                    type="number"
                    required
                    value={settingsSlaDays}
                    onChange={e => setSettingsSlaDays(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full border border-gray-250 rounded-lg px-3 py-2 text-xs bg-white font-mono outline-none focus:border-[#0D9488]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="space-y-0.5 max-w-[70%]">
                  <strong className="block text-slate-800 text-xs">Require Clinic Accreditation</strong>
                  <span className="text-[10px] text-gray-400">Patients can only process direct-billing claims from clinics in the accredited partner registry.</span>
                </div>
                <input
                  type="checkbox"
                  checked={settingsRequireAccreditation}
                  onChange={e => setSettingsRequireAccreditation(e.target.checked)}
                  className="h-4.5 w-4.5 accent-[#0D9488] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="space-y-0.5 max-w-[70%]">
                  <strong className="block text-slate-800 text-xs">Allow Self Claim Submissions</strong>
                  <span className="text-[10px] text-gray-400">Enables members to submit claims directly in their portal for out-of-pocket medical expenses.</span>
                </div>
                <input
                  type="checkbox"
                  checked={settingsAllowSelfSubmit}
                  onChange={e => setSettingsAllowSelfSubmit(e.target.checked)}
                  className="h-4.5 w-4.5 accent-[#0D9488] cursor-pointer"
                />
              </div>
            </div>

            {settingsError && (
              <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg font-medium">
                {settingsError}
              </div>
            )}

            {settingsSuccess && (
              <div className="p-3 bg-teal-50 text-teal-700 border border-teal-100 rounded-lg font-bold animate-pulse">
                {settingsSuccess}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                type="submit"
                className="bg-[#0A1628] hover:bg-slate-900 text-white text-xs font-bold px-6 py-2.5 rounded-lg shadow"
              >
                Save Settings Configuration
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== TAB 7: TRANSPARENCY AUDIT LOGS ==================== */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="text-sm font-bold text-gray-400 font-mono uppercase tracking-wider block">Compliance Audit Ledger</h3>
              <p className="text-xs text-gray-500">Full immutable registry of system events, logins, policy changes, and claim reviews.</p>
            </div>

            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit trail..."
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                className="w-full border border-gray-250 bg-white pl-9 pr-4 py-2 rounded-lg text-xs outline-none focus:border-[#0D9488]"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left font-sans text-xs">
                <thead className="bg-[#0A1628] text-white font-mono uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Operator Name</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Entity</th>
                    <th className="p-4">Entity reference ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {auditLogs
                    .filter(l => {
                      const query = auditSearch.toLowerCase();
                      return (
                        l.user_name.toLowerCase().includes(query) ||
                        l.action.toLowerCase().includes(query) ||
                        l.entity.toLowerCase().includes(query) ||
                        l.entity_id.toLowerCase().includes(query)
                      );
                    })
                    .map(l => (
                      <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-gray-500 font-bold whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</td>
                        <td className="p-4 font-sans font-bold text-slate-900 whitespace-nowrap">{l.user_name}</td>
                        <td className="p-4 uppercase font-black text-[10px] whitespace-nowrap text-[#0D9488]">{l.action}</td>
                        <td className="p-4 text-gray-500 lowercase whitespace-nowrap">{l.entity}</td>
                        <td className="p-4 text-[#0A1628] font-bold whitespace-nowrap">{l.entity_id}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
