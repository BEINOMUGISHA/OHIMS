/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  CreditCard,
  UserCheck,
  Activity,
  DollarSign,
  Plus,
  Compass,
  FileCheck,
  AlertTriangle,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
  UserMinus,
  FileText,
  RefreshCw,
  Download,
  Search,
  Calculator,
  Map,
  Send,
  Info
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { User, Member, Policy, Beneficiary, Premium, Claim, InsurancePlan, Provider } from '../types';
import MedicalHologramDashboard from './MedicalHologramDashboard';

interface MemberDashboardProps {
  currentUser: User;
  onRefreshData: () => void;
}

export default function MemberDashboard({ currentUser, onRefreshData }: MemberDashboardProps) {
  const [memberData, setMemberData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'claims' | 'premiums' | 'providers' | 'checker' | 'estimator' | 'ai_chat' | 'settings' | 'hologram'>('overview');
  
  // AI Chat States
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Hello! I am your OHIMS Underwriting AI Assistant. Ask me anything about your plan benefits, exclusions, or check if a medical procedure is covered.' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Profile Settings States
  const [settingsAddress, setSettingsAddress] = useState('');
  const [settingsPhone, setSettingsPhone] = useState('');
  const [settingsDob, setSettingsDob] = useState('');
  const [settingsGender, setSettingsGender] = useState('');
  const [settingsNationalId, setSettingsNationalId] = useState('');
  const [settingsPhoto, setSettingsPhoto] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');
  
  // Submit new self-claim modal/form states
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimPlanId, setClaimPlanId] = useState('');
  const [claimDiagnosis, setClaimDiagnosis] = useState('');
  const [claimTreatment, setClaimTreatment] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [claimSupportDoc, setClaimSupportDoc] = useState(true); // simulate upload
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState('');

  // Add Beneficiary State
  const [showBenForm, setShowBenForm] = useState(false);
  const [benName, setBenName] = useState('');
  const [benRelation, setBenRelation] = useState('Spouse');
  const [benDob, setBenDob] = useState('1990-06-15');
  const [benError, setBenError] = useState('');
  const [benSuccess, setBenSuccess] = useState('');

  // Interactive Coverage benefits Checker States
  const [checkTreatment, setCheckTreatment] = useState('Malaria Fever Checkup & Infusion');
  const [checkerResponse, setCheckerResponse] = useState<any>(null);

  // FEATURE 1: Interactive Premium & Dependents Estimator Calculator States
  const [calcPlan, setCalcPlan] = useState<'plan-basic' | 'plan-standard' | 'plan-premium'>('plan-basic');
  const [calcDependents, setCalcDependents] = useState<number>(1);
  const [calcCycle, setCalcCycle] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [calcDental, setCalcDental] = useState(true);
  const [calcOptical, setCalcOptical] = useState(false);
  const [calcCritical, setCalcCritical] = useState(false);
  const [calcDeductible, setCalcDeductible] = useState<string>('10%');
  const [calcIsQuoteSaved, setCalcIsQuoteSaved] = useState<boolean>(false);

  // FEATURE 2: Clinic Finder, Traffic & Route Time Simulator States
  const [providers, setProviders] = useState<Provider[]>([]);
  const [provSearch, setProvSearch] = useState('');
  const [provTypeFilter, setProvTypeFilter] = useState<'all' | 'hospital' | 'clinic' | 'pharmacy'>('all');
  const [provUserLocation, setProvUserLocation] = useState<string>('Nakasero, Kampala');
  const [provActiveRoutingId, setProvActiveRoutingId] = useState<string | null>(null);
  const [provRoutingStep, setProvRoutingStep] = useState<number>(0);
  const [provTraffic, setProvTraffic] = useState<'Clear' | 'Moderate' | 'Heavy' | 'Gridlock'>('Moderate');
  const [provEta, setProvEta] = useState<number>(0);
  const [provDistance, setProvDistance] = useState<number>(0);

  // FEATURE 3: Live Claims Co-Pay Draft Pre-Screener States
  const [simDiagnosis, setSimDiagnosis] = useState('Malaria Fever Checkup & Infusion');
  const [simCost, setSimCost] = useState('180000');
  const [simCopayAlert, setSimCopayAlert] = useState<any>(null);

  // Policy expiration simulation & renewal states
  const [isSimulatingExpiry, setIsSimulatingExpiry] = useState(false);
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewError, setRenewError] = useState('');
  const [renewSuccess, setRenewSuccess] = useState('');

  const fetchProfile = async () => {
    try {
      setLoading(true);
      // First get the "me" auth endpoint to locate associated member ID
      const authRes = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${currentUser.id}` }
      });
      const meData = await authRes.json();
      
      if (meData.member) {
        // Fetch extended member details
        const detailsRes = await fetch(`/api/members/${meData.member.id}`, {
          headers: { 'Authorization': `Bearer ${currentUser.id}` }
        });
        const details = await detailsRes.json();
        setMemberData(details);

        // Prepopulate settings form values
        if (details.member) {
          setSettingsAddress(details.member.address || '');
          setSettingsPhone(details.member.phone || currentUser.phone || '');
          setSettingsDob(details.member.dob || '');
          setSettingsGender(details.member.gender || 'male');
          setSettingsNationalId(details.member.national_id || '');
          setSettingsPhoto(details.member.photo || '');
        }

        // Prepopulate claim variables if policy exists
        if (details.policies && details.policies.length > 0) {
          setClaimPlanId(details.policies[0].id);
        }
      }

      // Also fetch providers for Clinic Finder feature
      const provRes = await fetch('/api/providers');
      if (provRes.ok) {
        const provData = await provRes.json();
        setProviders(provData);
      }
    } catch (e) {
      console.error('Error fetching member stats', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [currentUser]);

  // Handle premium self payment
  const handlePayPremium = async (premId: string) => {
    try {
      const res = await fetch(`/api/premiums/${premId}/pay`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentUser.id}` }
      });
      if (res.ok) {
        onRefreshData();
        fetchProfile();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle policy renewal
  const handleRenewPolicy = async (policyId: string) => {
    try {
      setRenewLoading(true);
      setRenewError('');
      setRenewSuccess('');
      const res = await fetch(`/api/policies/${policyId}/renew`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentUser.id}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRenewSuccess(data.message || 'Policy renewed successfully with renewal premium installment generated!');
        onRefreshData();
        fetchProfile();
      } else {
        setRenewError(data.error || 'Failed to renew policy');
      }
    } catch (err) {
      console.error(err);
      setRenewError('Core communications failure during renewal sequence');
    } finally {
      setRenewLoading(false);
    }
  };

  // Submit self clinical claim
  const handleAddClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimError('');
    setClaimSuccess('');

    if (!claimDiagnosis || !claimTreatment || !claimAmount) {
      setClaimError('Diagnosis, Treatment, and claimed amount are necessary.');
      return;
    }

    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          policy_id: claimPlanId,
          diagnosis: claimDiagnosis,
          treatment: claimTreatment,
          amount_claimed: Number(claimAmount),
          document_data: claimSupportDoc ? 'custom-receipt-upload.pdf' : null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setClaimError(data.error || 'Claim filing rejected');
        return;
      }
      setClaimSuccess(data.message || 'Claim filed successfully!');
      
      setTimeout(() => {
        setShowClaimForm(false);
        setClaimDiagnosis('');
        setClaimTreatment('');
        setClaimAmount('');
        setClaimSuccess('');
        onRefreshData();
        fetchProfile();
      }, 2000);
    } catch (err: any) {
      setClaimError('Connection failure: ' + err.message);
    }
  };

  // Submit Beneficiary addition
  const handleAddBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    setBenError('');
    setBenSuccess('');

    if (!benName || !benRelation || !benDob) {
      setBenError('Please fill out Name, relation, and date of birth.');
      return;
    }

    try {
      const res = await fetch(`/api/members/${memberData.member.id}/beneficiary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({ name: benName, relationship: benRelation, dob: benDob })
      });
      const data = await res.json();
      if (!res.ok) {
        setBenError(data.error);
        return;
      }
      setBenSuccess('Beneficiary registered under active policy benefits!');
      setTimeout(() => {
        setShowBenForm(false);
        setBenName('');
        setBenSuccess('');
        onRefreshData();
        fetchProfile();
      }, 1500);
    } catch (err: any) {
      setBenError('Could not sync: ' + err.message);
    }
  };

  // Delete Beneficiary
  const handleDeleteBeneficiary = async (benId: string) => {
    if (!window.confirm('Are you sure you want to remove this beneficiary from your policy benefits?')) {
      return;
    }

    try {
      const res = await fetch(`/api/members/${memberData.member.id}/beneficiary/${benId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentUser.id}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to remove beneficiary');
        return;
      }
      onRefreshData();
      fetchProfile();
    } catch (err: any) {
      alert('Failed to connect to server: ' + err.message);
    }
  };

  // Save Member Profile Settings
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuccess('');

    try {
      const res = await fetch(`/api/members/${memberData.member.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          national_id: settingsNationalId,
          dob: settingsDob,
          gender: settingsGender,
          address: settingsAddress,
          photo: settingsPhoto
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setSettingsError(data.error || 'Failed to update profile');
        return;
      }
      setSettingsSuccess('Profile details recorded successfully!');
      onRefreshData();
      fetchProfile();
      setTimeout(() => setSettingsSuccess(''), 3000);
    } catch (err: any) {
      setSettingsError('Connection failed: ' + err.message);
    }
  };

  // Send AI Chat Assistant Message
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim() || aiLoading) return;

    const userMsg = aiInput;
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setAiLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          message: userMsg,
          history: aiMessages.slice(1).map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setAiMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error communicating with my AI brain: ' + (data.error || 'Unknown error') }]);
        return;
      }
      setAiMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err: any) {
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'Connection failed: ' + err.message }]);
    } finally {
      setAiLoading(false);
    }
  };

  // Transparency Coverage Checker Simulator Tool
  const runCoverageChecker = () => {
    if (!memberData || !memberData.policies || memberData.policies.length === 0) {
      setCheckerResponse({
        verdict: "DENIED",
        reason: "No active health insurance policy found to verify benefits coverage limits against."
      });
      return;
    }

    const planId = memberData.policies[0].plan_id;
    
    // Hardcoded logic representing strict plan details
    const rulesList: Record<string, any> = {
      'Malaria Fever Checkup & Infusion': {
        'plan-basic': { verdict: 'COVERED', tier: 'Outpatient Care', limit: 'UGX 5,000,000 total limit', text: 'Malaria clinical diagnosis, fever test profiles, and generic antimalarial injections are fully covered out of General Outpatient allocations.' },
        'plan-standard': { verdict: 'COVERED', tier: 'Outpatient Care', limit: 'UGX 30,000,000 total limit', text: 'Fully covered. Outpatient checkup assessments and medications require zero out-of-pocket co-pays.' },
        'plan-premium': { verdict: 'COVERED', tier: 'Immediate Care', limit: 'UGX 150,000,000 total limit', text: '100% comprehensive Coverage. Includes immediate private ward observation queues and premium brand therapeutic recovery.' }
      },
      'Regular Routine Eye Refraction Lens': {
        'plan-basic': { verdict: 'EXCLUDED', tier: 'Optical Limit', limit: 'Not Available', text: 'Optics and visual refraction accessories are fully EXCLUDED from Bronze Basic coverage plans.' },
        'plan-standard': { verdict: 'COVERED', tier: 'Optical allowance', limit: 'UGX 1,000,000 Sub-limit', text: 'Fully covered up to a designated sub-limit of UGX 1,000,000. Includes visual refraction grading profiles and frames.' },
        'plan-premium': { verdict: 'COVERED', tier: 'Premium Optical', limit: 'Comprehensive Limit', text: '100% covered. Outpatient visual treatment, prescription contact lenses, or spectacles are covered without co-pays.' }
      },
      'Emergency Ward Appendectomy Surgery': {
        'plan-basic': { verdict: 'EXCLUDED', tier: 'Inpatient surgical limit', limit: 'Not Available', text: 'Complex inpatient procedures and appendectomy surgeries are excluded under Bronze Starter rules.' },
        'plan-standard': { verdict: 'COVERED', tier: 'Inpatient Hospital Admissions', limit: 'Standard Admission Allowance', text: 'Fully covered! Fits standard inpatient ward packages allowing for up to 5 days of critical clinic hospitalization.' },
        'plan-premium': { verdict: 'COVERED', tier: 'Full Inpatient care package', limit: 'Immediate Critical Admission', text: '100% immediate clinical priority cover. Private rooms, surgical theater admissions, and rehabilitation are managed seamlessly.' }
      },
      'Elective Nose Rhinoplasty (Cosmetic)': {
        'plan-basic': { verdict: 'EXCLUDED', tier: 'Policy Exclusion Rules', limit: 'Not Available', text: 'Rhinoplasty and elective cosmetic alterations are excluded from Basic plans unless directly required for therapeutic rehabilitation.' },
        'plan-standard': { verdict: 'EXCLUDED', tier: 'Policy Exclusion Rules', limit: 'Not Available', text: 'Purely cosmetic, non-reconstructive plastic surgeries are strictly excluded under Standard wellness rules.' },
        'plan-premium': { verdict: 'EXCLUDED', tier: 'Policy Exclusion Rules', limit: 'Not Available', text: 'Excluded. Cosmetic surgery for non-reconstructive purposes is not covered by Premium Care rules.' }
      }
    };

    const targetTx = checkTreatment;
    const rule = rulesList[targetTx] ? rulesList[targetTx][planId] : {
      verdict: 'MANUAL REVIEW REQUIRED', 
      tier: 'General Diagnostic Evaluation', 
      limit: 'Varies', 
      text: 'Our active database cannot formulate automatic coverage matching for this treatment. Submit a claim or consult staff.'
    };

    setCheckerResponse(rule);
  };

  // Helper to compute live pre-screener logic
  const getPreScreenerAssessment = () => {
    const cost = Number(simCost) || 0;
    const activePolicy = memberData?.policies?.[0];
    const planId = activePolicy?.plan_id || 'plan-basic';
    const planLimit = activePolicy?.plan_limit || 5000000;
    
    // Calculate spent claims
    const spentClaims = memberData?.claims
      ? memberData.claims.filter((c: Claim) => c.status === 'paid').reduce((sum: number, c: Claim) => sum + c.amount_approved, 0)
      : 0;
    const remainingLimit = planLimit - spentClaims;

    let verdict = 'COVERED';
    let coPayPercent = 10;
    let text = 'This treatment is covered under standard outpatient allocation.';
    let score = 95;

    if (simDiagnosis.toLowerCase().includes('rhinoplasty') || simDiagnosis.toLowerCase().includes('cosmetic')) {
      verdict = 'EXCLUDED';
      coPayPercent = 100;
      text = 'Cosmetic rhinoplasties or aesthetic interventions are fully excluded from coverage.';
      score = 0;
    } else if (simDiagnosis.toLowerCase().includes('lens') || simDiagnosis.toLowerCase().includes('eye')) {
      if (planId === 'plan-basic') {
        verdict = 'EXCLUDED';
        coPayPercent = 100;
        text = 'Routine lens checkups and frames are fully excluded in Bronze Basic tier plans.';
        score = 0;
      } else if (planId === 'plan-standard') {
        verdict = 'SUB-LIMIT APPLIES';
        coPayPercent = 20;
        text = 'Standard plan has a UGX 1,000,000 optical sub-limit. A 20% co-pay applies.';
        score = 75;
      } else {
        verdict = 'COVERED';
        coPayPercent = 0;
        text = 'Comprehensive Optical coverage has no sub-limits or co-pays in Premium tier.';
        score = 98;
      }
    } else if (simDiagnosis.toLowerCase().includes('appendix') || simDiagnosis.toLowerCase().includes('surgery')) {
      if (planId === 'plan-basic') {
        verdict = 'EXCLUDED';
        coPayPercent = 100;
        text = 'Bronze Basic plans strictly exclude emergency inpatient surgeries. Requires upgrades.';
        score = 5;
      } else if (planId === 'plan-standard') {
        verdict = 'COVERED';
        coPayPercent = 10;
        text = 'Inpatient appendectomies are covered out of General Surgery allocations (Standard 10% co-pay).';
        score = 85;
      } else {
        verdict = 'COVERED';
        coPayPercent = 5;
        text = '100% comprehensive surgical care with minimal 5% co-pay balance on private tiers.';
        score = 99;
      }
    }

    // Limit warning
    let limitExceeded = false;
    if (cost > remainingLimit) {
      limitExceeded = true;
      score = Math.max(5, score - 60);
    }

    const coPayAmount = Math.round(cost * (coPayPercent / 100));
    const estimatedPayout = Math.max(0, cost - coPayAmount);

    return {
      verdict,
      coPayPercent,
      coPayAmount,
      estimatedPayout,
      text,
      score,
      limitExceeded,
      remainingLimit
    };
  };

  const exportPolicyToPDF = () => {
    if (!memberData || !activePolicy) return;
    const doc = new jsPDF();
    
    // Header block
    doc.setFillColor(10, 22, 40); // #0A1628
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('ONLINE HEALTH INSURANCE MANAGEMENT SYSTEM (OHIMS) UGANDA', 15, 22);
    doc.setFontSize(10);
    doc.text('OFFICIAL NATIONAL HEALTH COVERAGE POLICY DOCUMENT', 15, 31);
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    let y = 55;
    const addSectionHeader = (title: string) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(13, 148, 136); // #0D9488
      doc.text(title, 15, y);
      doc.setDrawColor(200, 200, 200);
      doc.line(15, y + 2, 195, y + 2);
      y += 12;
      doc.setTextColor(50, 50, 50);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
    };

    addSectionHeader('POLICYHOLDER PROFILE DETAILS');
    doc.text(`Full Name: ${memberData.member.name}`, 15, y);
    doc.text(`National ID: ${memberData.member.national_id}`, 15, y + 6);
    doc.text(`Contact Phone: ${currentUser.phone || memberData.member.phone || '--'}`, 15, y + 12);
    doc.text(`Physical Address: ${memberData.member.address}`, 15, y + 18);
    y += 28;

    addSectionHeader('INSURANCE POLICY SPECIFICATIONS');
    doc.text(`Policy Certificate ID: ${activePolicy.id}`, 15, y);
    doc.text(`Insurance Plan Tier: ${memberData.member.active_policy?.plan_name || 'Enrolled Coverage Plan'}`, 15, y + 6);
    doc.text(`Policy Coverage Status: ${activePolicy.status.toUpperCase()}`, 15, y + 12);
    doc.text(`Plan Coverage Limit: UGX ${(memberData.member.active_policy?.plan_limit || 5000000).toLocaleString()}`, 15, y + 18);
    doc.text(`Premium Payment Frequency: ${activePolicy.premium_frequency.toUpperCase()}`, 15, y + 24);
    doc.text(`Effective Coverage Start: ${activePolicy.start_date}`, 15, y + 30);
    doc.text(`Policy Expiration Date: ${activePolicy.end_date}`, 15, y + 36);
    y += 46;

    if (memberData.beneficiaries && memberData.beneficiaries.length > 0) {
      addSectionHeader('REGISTERED BENEFICIARIES & DEPENDENTS');
      memberData.beneficiaries.forEach((b: any, index: number) => {
        doc.text(`${index + 1}. Name: ${b.name} (${b.relationship}) - Born: ${b.dob}`, 15, y);
        y += 6;
      });
      y += 6;
    }

    doc.setFillColor(242, 248, 248);
    doc.rect(15, y, 180, 22, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.text('This is an official document generated by the Online Health Insurance Management System (OHIMS), Uganda.', 18, y + 8);
    doc.text('Authorized by National Health Insurance Guidelines. All claims are assessed dynamically.', 18, y + 15);

    doc.save(`OHIMS_Policy_Document_${activePolicy.id}.pdf`);
  };

  const exportClaimsToPDF = () => {
    if (!memberData) return;
    const doc = new jsPDF();
    
    // Header block
    doc.setFillColor(15, 23, 42); // #10172A
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('ONLINE HEALTH INSURANCE MANAGEMENT SYSTEM (OHIMS) UGANDA MEDICAL CLAIMS', 15, 22);
    doc.setFontSize(10);
    doc.text('OFFICIAL POLICYHOLDER CLAIMS HISTORIC PIPELINE & ASSESSMENT REPORT', 15, 31);
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    let y = 55;
    doc.setFont('helvetica', 'bold');
    doc.text(`Claimant Name: ${memberData.member.name}`, 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`National ID: ${memberData.member.national_id} | Connected Policy Card: ${activePolicy?.id || '--'}`, 15, y + 6);
    doc.text(`Report Extraction Date: ${new Date().toLocaleDateString()}`, 15, y + 12);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y + 15, 195, y + 15);
    
    y += 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('Claim ID', 15, y);
    doc.text('Diagnosis & Medical Treatment', 38, y);
    doc.text('Status', 125, y);
    doc.text('Sum Claimed', 150, y);
    doc.text('Approved', 175, y);
    doc.line(15, y + 2, 195, y + 2);
    y += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (memberData.claims.length === 0) {
      doc.text('No medical claim records resolved under this active membership.', 15, y);
    } else {
      memberData.claims.forEach((c: Claim) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.text(c.id, 15, y);
        doc.setFont('helvetica', 'normal');
        
        const diagVal = c.diagnosis.length > 35 ? c.diagnosis.substring(0, 32) + '...' : c.diagnosis;
        doc.text(diagVal, 38, y);
        
        // Minor subtext
        doc.setFontSize(8);
        doc.setTextColor(110, 110, 110);
        const treatVal = c.treatment.length > 45 ? c.treatment.substring(0, 42) + '...' : c.treatment;
        doc.text(treatVal, 38, y + 4.5);
        
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        doc.text(c.status.toUpperCase(), 125, y);
        doc.text(`UGX ${c.amount_claimed.toLocaleString()}`, 150, y);
        doc.text(c.amount_approved > 0 ? `UGX ${c.amount_approved.toLocaleString()}` : 'UGX 0', 175, y);
        
        y += 13;
      });
    }

    doc.save(`OHIMS_Claims_Report_${memberData.member.id}.pdf`);
  };

  const exportClaimToPDF = (c: Claim) => {
    if (!memberData) return;
    const doc = new jsPDF();
    const activePolicy = memberData.policies[0];
    
    // Header block
    doc.setFillColor(15, 23, 42); // Deep slate #10172A
    doc.rect(0, 0, 210, 42, 'F');
    
    // Header text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('ONLINE HEALTH INSURANCE MANAGEMENT SYSTEM (OHIMS) CLAIM SUMMARY', 15, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('INDIVIDUAL MEDICAL CLAIM DISCLOSURE & AUDIT PASS', 15, 29);
    
    // Right header metadata
    doc.setFontSize(8);
    doc.text(`CLAIM REFERENCE: ${c.id}`, 195, 20, { align: 'right' });
    doc.text(`GENERATED: ${new Date().toLocaleDateString()}`, 195, 26, { align: 'right' });
    
    // Main Body Accent colored bar
    doc.setFillColor(13, 148, 136); // Teal #0D9488
    doc.rect(15, 48, 180, 2, 'F');
    
    // Patient/Member Section
    let y = 60;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('MEMBER / BENEFICIARY INFORMATION', 15, y);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    y += 10;
    doc.text(`Policyholder Name:`, 15, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${memberData.member.name}`, 60, y);
    
    doc.setFont('helvetica', 'normal');
    y += 6;
    doc.text(`National ID:`, 15, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${memberData.member.national_id}`, 60, y);
    
    doc.setFont('helvetica', 'normal');
    y += 6;
    doc.text(`Associated Policy ID:`, 15, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${activePolicy?.id || '--'}`, 60, y);
    
    doc.setFont('helvetica', 'normal');
    y += 6;
    doc.text(`Active Coverage Plan:`, 15, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${activePolicy?.plan_name || 'Enrolled Plan'}`, 60, y);
    
    // Claim Details Section
    y += 14;
    doc.setDrawColor(229, 231, 235);
    doc.line(15, y, 195, y);
    
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CLAIM SPECIFICATIONS & TREATMENT LOG', 15, y);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    y += 10;
    doc.text(`Discovered Diagnosis:`, 15, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${c.diagnosis}`, 60, y);
    
    doc.setFont('helvetica', 'normal');
    y += 6;
    doc.text(`Administered Treatment:`, 15, y);
    doc.setFont('helvetica', 'normal');
    const treatmentLines = doc.splitTextToSize(c.treatment || 'N/A', 130);
    doc.text(treatmentLines, 60, y);
    
    y += (treatmentLines.length * 5) + 2;
    doc.text(`Submitted Date:`, 15, y);
    doc.setFont('helvetica', 'bold');
    doc.text(c.submitted_at ? new Date(c.submitted_at).toLocaleDateString() : 'N/A', 60, y);
    
    // Financial Breakdown
    y += 14;
    doc.line(15, y, 195, y);
    
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('FINANCIAL VERDICT BREAKDOWN', 15, y);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    y += 10;
    doc.text(`Invoiced Medical Bill:`, 15, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`UGX ${c.amount_claimed.toLocaleString()}`, 150, y, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    y += 6;
    doc.text(`Disbursed / Approved Payout:`, 15, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(13, 148, 136); // Teal
    doc.text(`UGX ${c.amount_approved.toLocaleString()}`, 150, y, { align: 'right' });
    
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    y += 6;
    doc.text(`Current Tracker Status:`, 15, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${c.status.toUpperCase()}`, 150, y, { align: 'right' });
    
    // Notes or feedback
    doc.setFont('helvetica', 'normal');
    y += 12;
    doc.setFillColor(248, 250, 252); // Soft gray
    doc.rect(15, y, 180, 25, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('AUDITOR CLINICAL NOTES & RECOMMENDATION:', 20, y + 6);
    doc.setFont('helvetica', 'normal');
    const notesText = c.notes || 'This claim is currently undergoing professional clinician audit reviews. Payout levels are governed strictly by the health plan criteria.';
    const notesLines = doc.splitTextToSize(notesText, 170);
    doc.text(notesLines, 20, y + 12);
    
    // Bottom Disclaimer Seal
    y += 35;
    doc.setFillColor(242, 248, 248);
    doc.rect(15, y, 180, 18, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('This transcript serves as a digital pass. Disbursed and approved amounts are wired directly', 18, y + 6);
    doc.text('to registered healthcare institutions under SLA-2026. All operations comply with IRA Uganda guidelines.', 18, y + 11);
    
    doc.save(`OHIMS_Claim_Receipt_${c.id}.pdf`);
  };

  // Helper to compute dynamic premium & dependents calculations
  const getCalculatedPremium = () => {
    let base = 50000;
    if (calcPlan === 'plan-standard') base = 180000;
    if (calcPlan === 'plan-premium') base = 450000;

    const dependentSurcharge = base * 0.25 * calcDependents;
    
    let riderSum = 0;
    if (calcDental) riderSum += 35000;
    if (calcOptical) riderSum += 45000;
    if (calcCritical) riderSum += 85000;

    const rawMonthly = base + dependentSurcharge + riderSum;

    // Deductible discount
    let deductiblePct = 0;
    if (calcDeductible === '10%') deductiblePct = 0.08;
    if (calcDeductible === '20%') deductiblePct = 0.15;
    const deductibleDiscount = rawMonthly * deductiblePct;

    const discountedMonthly = rawMonthly - deductibleDiscount;

    // Billing frequency discount & factor
    let cycleMultiply = 1;
    let cycleDiscountPct = 0;
    if (calcCycle === 'quarterly') {
      cycleMultiply = 3;
      cycleDiscountPct = 0.05;
    } else if (calcCycle === 'annual') {
      cycleMultiply = 12;
      cycleDiscountPct = 0.12;
    }

    const priceBeforeCycleDiscount = discountedMonthly * cycleMultiply;
    const cycleDiscountAmount = priceBeforeCycleDiscount * cycleDiscountPct;
    const finalCyclePrice = priceBeforeCycleDiscount - cycleDiscountAmount;

    return {
      baseMonthly: base,
      dependentSurcharge,
      riderSum,
      deductibleDiscount,
      cycleDiscountAmount,
      discountedMonthly,
      finalCyclePrice
    };
  };

  const exportPremiumQuoteToPDF = () => {
    const calc = getCalculatedPremium();
    const doc = new jsPDF();
    
    // Header block
    doc.setFillColor(13, 148, 136); // Teal #0D9488
    doc.rect(0, 0, 210, 42, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('ONLINE HEALTH INSURANCE MANAGEMENT SYSTEM (OHIMS) PREMIUMS', 15, 20);
    doc.setFontSize(9);
    doc.text('OFFICIAL MEDICAL COVERAGE ENROLLMENT ESTIMATION MATRIX', 15, 30);
    
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(11);
    
    let y = 60;
    doc.setFont('helvetica', 'bold');
    doc.text('PROSPECTIVE POLICY COVERAGE SPECIFICATIONS', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    y += 10;
    const activeTier = calcPlan === 'plan-premium' ? 'Gold Care Plus (Premium)' : calcPlan === 'plan-standard' ? 'Silver Wellness (Standard)' : 'Bronze Starter (Basic)';
    doc.text(`Enrolled Underwriter Representative: Ahumuza Brian`, 15, y);
    doc.text(`Target Insurance Tier: ${activeTier}`, 15, y + 6);
    doc.text(`Calculated Dependents On-cover: ${calcDependents} dependent(s)`, 15, y + 12);
    doc.text(`Deductible & Co-pay Agreement: ${calcDeductible} Member Liability`, 15, y + 18);
    doc.text(`Billing Cycle Plan: ${calcCycle.toUpperCase()}`, 15, y + 24);
    
    y += 38;
    doc.setDrawColor(229, 231, 235);
    doc.line(15, y, 195, y);
    y += 8;
    
    doc.setFont('helvetica', 'bold');
    doc.text('BILLING BREAKDOWN (UGX)', 15, y);
    doc.setFont('helvetica', 'normal');
    y += 8;
    doc.text(`Base Monthly Tier Premium:`, 15, y);
    doc.text(`UGX ${calc.baseMonthly.toLocaleString()}`, 150, y);
    
    y += 6;
    doc.text(`Additional Dependents Rider charge:`, 15, y);
    doc.text(`UGX ${calc.dependentSurcharge.toLocaleString()}`, 150, y);
    
    y += 6;
    doc.text(`Optional Specialized Riders (Dental, Optical, Critical):`, 15, y);
    doc.text(`UGX ${calc.riderSum.toLocaleString()}`, 150, y);
    
    y += 6;
    doc.text(`Deductible Option Premium Reduction:`, 15, y);
    doc.text(`- UGX ${calc.deductibleDiscount.toLocaleString()}`, 150, y);
    
    y += 6;
    doc.text(`Billing Mode Payment Cycle Discount:`, 15, y);
    doc.text(`- UGX ${calc.cycleDiscountAmount.toLocaleString()}`, 150, y);

    y += 10;
    doc.line(15, y, 195, y);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL ESTIMATED PREMIUM (${calcCycle.toUpperCase()} Billing):`, 15, y);
    doc.text(`UGX ${Math.round(calc.finalCyclePrice).toLocaleString()}`, 150, y);
    
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Estimated average monthly balance: UGX ${Math.round(calc.finalCyclePrice / (calcCycle === 'annual' ? 12 : calcCycle === 'quarterly' ? 3 : 1)).toLocaleString()} / month`, 15, y);
    
    y += 24;
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(243, 244, 246);
    doc.rect(15, y, 180, 20, 'F');
    doc.text('STATEMENT OF DISCLOSURE & GUARANTY', 20, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('All parameters modeled under IRA Uganda premium guidelines. Quotes represent live binding valuations', 20, y + 12);
    doc.text('subject to authorized staff endorsement. Final policies are governed by official Online Health Insurance guidelines.', 20, y + 15);
    
    doc.save(`OHIMS_Premium_Enrollment_Quote_${calcCycle}.pdf`);
  };

  const getSimulatedRouteMetrics = (clinicName: string) => {
    let baseDistance = 2.4; // km
    if (clinicName.toLowerCase().includes('mulago')) baseDistance = 2.1;
    if (clinicName.toLowerCase().includes('kampala')) baseDistance = 1.8;
    if (clinicName.toLowerCase().includes('case')) baseDistance = 1.1;
    if (clinicName.toLowerCase().includes('pharmacy')) baseDistance = 1.5;

    // Location modifiers
    if (provUserLocation.includes('Kololo')) baseDistance += 0.8;
    if (provUserLocation.includes('Bugolobi')) baseDistance += 3.2;
    if (provUserLocation.includes('Mengo')) baseDistance += 4.1;
    if (provUserLocation.includes('Wandegeya')) baseDistance -= 0.6;

    baseDistance = Math.abs(baseDistance);
    if (baseDistance === 0) baseDistance = 0.4;

    let minPerKm = 3;
    if (provTraffic === 'Clear') minPerKm = 2;
    if (provTraffic === 'Heavy') minPerKm = 8;
    if (provTraffic === 'Gridlock') minPerKm = 17;

    const baseEta = Math.round(baseDistance * minPerKm);

    return {
      distance: Number(baseDistance.toFixed(1)),
      eta: baseEta
    };
  };

  const triggerRouteSimulation = (clinicId: string, clinicName: string) => {
    setProvActiveRoutingId(clinicId);
    setProvRoutingStep(1); // computing

    const metrics = getSimulatedRouteMetrics(clinicName);
    setProvDistance(metrics.distance);
    setProvEta(metrics.eta);

    // Simulate multi-step GPS calculation sequence in JS
    setTimeout(() => {
      setProvRoutingStep(2); // plotting optimal layout
    }, 800);

    setTimeout(() => {
      setProvRoutingStep(3); // success
    }, 1800);
  };

  // Run initial checker on load
  useEffect(() => {
    if (memberData) {
      runCoverageChecker();
    }
  }, [checkTreatment, memberData]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <div className="inline-flex space-x-1 items-center font-mono text-sm text-[#0D9488]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Synchronizing Medical Membership Profiles...</span>
        </div>
      </div>
    );
  }

  if (!memberData) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center bg-white rounded-2xl border border-dashed border-gray-200 mt-8">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-[#0A1628]">Profile Onboarding Incomplete</h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto mt-2">
          Your credentials exist, but you haven't finalized clinical onboarding. Please click register or select another user role sandbox to begin.
        </p>
      </div>
    );
  }

  const activePolicy = memberData.policies[0];
  const outstandingPremiums = memberData.premiums.filter((p: Premium) => p.status !== 'paid');

  const getPolicyExpiryDays = () => {
    if (!activePolicy) return null;
    let actualEndDate = activePolicy.end_date;
    if (isSimulatingExpiry) {
      actualEndDate = '2026-06-22'; // Exactly 16 days to expiration
    }
    if (!actualEndDate) return null;

    const today = new Date("2026-06-06T12:00:00Z");
    const expiry = new Date(actualEndDate);
    if (isNaN(expiry.getTime())) return null;

    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysLeft = getPolicyExpiryDays();
  const isExpiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 30;
  const isExpired = daysLeft !== null && daysLeft <= 0;

  const getChartData = () => {
    const months = [
      { name: 'Jan', fullname: 'January' },
      { name: 'Feb', fullname: 'February' },
      { name: 'Mar', fullname: 'March' },
      { name: 'Apr', fullname: 'April' },
      { name: 'May', fullname: 'May' },
      { name: 'Jun', fullname: 'June' },
      { name: 'Jul', fullname: 'July' },
      { name: 'Aug', fullname: 'August' },
      { name: 'Sep', fullname: 'September' },
      { name: 'Oct', fullname: 'October' },
      { name: 'Nov', fullname: 'November' },
      { name: 'Dec', fullname: 'December' }
    ];

    const planLimit = activePolicy?.plan_limit || 5000000;
    
    // Aggregate claims by month
    const monthlyStats = months.map((m, idx) => {
      const monthClaims = (memberData?.claims || []).filter((c: Claim) => {
        if (!c.submitted_at) return false;
        const d = new Date(c.submitted_at);
        return !isNaN(d.getTime()) && d.getMonth() === idx;
      });

      const totalClaimed = monthClaims.reduce((sum: number, c: Claim) => sum + (Number(c.amount_claimed) || 0), 0);
      const totalApprovedPaid = monthClaims
        .filter((c: Claim) => c.status === 'paid' || c.status === 'approved')
        .reduce((sum: number, c: Claim) => sum + (Number(c.amount_approved) || 0), 0);

      return {
        key: idx,
        name: m.name,
        fullname: m.fullname,
        Claimed: totalClaimed,
        Approved: totalApprovedPaid,
      };
    });

    let runningApprovedSum = 0;
    return monthlyStats.map(item => {
      runningApprovedSum += item.Approved;
      const remainingLimit = Math.max(0, planLimit - runningApprovedSum);
      return {
        ...item,
        'Remaining Limit': remainingLimit,
      };
    });
  };

  const chartData = getChartData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-8 border-slate-800 text-white p-3 rounded-xl shadow-xl text-[10px] font-mono leading-relaxed">
          <p className="font-bold border-b border-slate-800 pb-1 mb-1 text-[#0D9488]">{label}</p>
          {payload.map((entry: any, i: number) => (
            <div key={i} className="flex justify-between gap-6 mt-1 text-[10px]">
              <span className="text-slate-400">{entry.name}:</span>
              <span className="font-bold" style={{ color: entry.stroke || entry.fill }}>
                UGX {entry.value?.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#0D9488] block uppercase tracking-wider font-mono">Policyholder Workspace</span>
          <h2 className="text-2xl font-black text-[#0A1628]">Welcome, {memberData.member.name}</h2>
          <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1 font-mono">
            <MapPin className="h-3.5 w-3.5 text-[#0D9488]" /> {memberData.member.address}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activePolicy && (
            <button
              onClick={exportPolicyToPDF}
              className="bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
            >
              <Download className="h-4 w-4 text-[#0D9488]" /> Download Policy PDF
            </button>
          )}
          <button
            onClick={() => setActiveTab('checker')}
            className="bg-slate-100 hover:bg-slate-200 text-[#0A1628] text-xs font-bold px-4 py-2.5 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
          >
            <Compass className="h-4 w-4 text-[#0D9488]" /> Benefit Checker
          </button>
          {activePolicy && activePolicy.status === 'active' && (
            <button
              id="submit-self-claim-btn"
              onClick={() => setShowClaimForm(true)}
              className="bg-[#0D9488] hover:bg-[#0b7e74] text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm transition-transform hover:-translate-y-0.5 flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> File Outpatient Claim
            </button>
          )}
        </div>
      </div>

      {/* Policy Expiration Alert Warning Component */}
      {activePolicy && (isExpiringSoon || isExpired) ? (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="bg-amber-100 text-amber-800 p-2.5 rounded-xl shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5 text-amber-700 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Urgent: Medical Policy Expiration Impending</span>
                  <span className="bg-amber-600/10 text-amber-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {daysLeft !== null && daysLeft > 0 ? `Expires in ${daysLeft} Days` : 'Expired'}
                  </span>
                </h4>
                <p className="text-xs text-slate-650 leading-relaxed max-w-2xl">
                  Your insurance policy premium allocation coverage term is scheduled to expire on <strong className="font-mono">{isSimulatingExpiry ? '2026-06-22' : activePolicy.end_date}</strong>. 
                  To ensure uninterrupted medical coverage at outpatient clinics, specialist hospitals, and wellness partners of the Online Health Insurance Management System (OHIMS) Uganda network, please execute policy renewal immediately.
                </p>
                {isSimulatingExpiry && (
                  <p className="text-[10px] text-[#0D9488] font-mono leading-none pt-1">
                    ● Simulated expiration mode is active. (Click simulated toggle to restore actual dates)
                  </p>
                )}
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <button
                onClick={() => handleRenewPolicy(activePolicy.id)}
                disabled={renewLoading}
                className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-350 text-white text-xs font-black px-4 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer font-mono"
              >
                {renewLoading ? (
                  <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                ) : (
                  <Clock className="h-3.5 w-3.5" />
                )}
                RENEW INSURANCE POLICY NOW
              </button>
              <button
                onClick={() => setIsSimulatingExpiry(false)}
                className="bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 text-xs font-bold px-3 py-2.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                title="Disable Simulator"
              >
                Reset
              </button>
            </div>
          </div>
          {renewError && (
            <div className="bg-red-50 text-red-700 text-xs font-semibold px-3 py-2 rounded-xl border border-red-150">
              {renewError}
            </div>
          )}
          {renewSuccess && (
            <div className="bg-teal-50 text-[#0D9488] text-xs font-bold px-3 py-2 rounded-xl border border-teal-150 animate-pulse">
              {renewSuccess}
            </div>
          )}
        </div>
      ) : activePolicy ? (
        <div className="bg-slate-50 hover:bg-slate-100/75 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-150">
          <div className="flex items-center gap-2.5 text-xs text-gray-500">
            <Shield className="h-4 w-4 text-[#0D9488]" />
            <span>
              Your medical policy is secure and fully active (expires on <strong className="font-mono text-slate-700">{activePolicy.end_date}</strong>).
            </span>
          </div>
          <button
            onClick={() => setIsSimulatingExpiry(true)}
            className="text-[10px] font-bold font-mono text-[#0D9488] hover:text-[#0b7e74] flex items-center gap-1 hover:underline cursor-pointer"
          >
            <AlertTriangle className="h-3 w-3 text-amber-500 animate-bounce-slow" />
            [Simulate Impending 30-Day Expiry Warning]
          </button>
        </div>
      ) : null}

      {/* Nav Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-thin whitespace-nowrap">
        {[
          { id: 'overview', label: 'Overview & Policy Card' },
          { id: 'claims', label: 'My Claims history' },
          { id: 'premiums', label: 'Premiums Tracking' },
          { id: 'checker', label: 'Coverage benefits Checker' },
          { id: 'estimator', label: 'Premium Estimator' },
          { id: 'providers', label: 'Accredited Clinics & Route Finder' },
          { id: 'ai_chat', label: '🛡️ Underwriting AI Assistant' },
          { id: 'settings', label: '⚙️ Profile Settings' },
          { id: 'hologram', label: '🔮 3D Diagnostics Hologram' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-colors flex-shrink-0 ${activeTab === t.id ? 'border-[#0D9488] text-[#0D9488]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ==================== TAB 1 OVERVIEW ==================== */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          
          {/* ===================== FINANCIAL ANALYTICS PANEL & CHARTING ===================== */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#0D9488] font-mono uppercase tracking-widest block">Live Health Coverage Telemetry</span>
                <h3 className="text-lg font-black text-[#0A1628] tracking-tight">Claim Trends & Policy Limits Consumption</h3>
                <p className="text-xs text-gray-500 max-w-xl">
                  Real-time underwriter audit trail logging of active claims, approval ratios, and the resulting depletion impact on your active UGX coverage pool over the calendar year.
                </p>
              </div>

              {/* Dynamic stats highlight badges */}
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-0.5">
                  <span className="text-[9px] text-gray-400 font-mono uppercase font-semibold">Total Pool Limit</span>
                  <div className="font-extrabold text-[#0A1628] font-mono">
                    UGX {(activePolicy?.plan_limit || 5000000).toLocaleString()}
                  </div>
                </div>
                <div className="px-4 py-2.5 bg-teal-50/50 border border-teal-100/30 rounded-xl space-y-0.5">
                  <span className="text-[9px] text-[#0D9488] font-mono uppercase font-semibold">Approved Claims</span>
                  <div className="font-extrabold text-[#0D9488] font-mono">
                    UGX {(memberData?.claims || []).filter((c: Claim) => c.status === 'paid' || c.status === 'approved').reduce((sum: number, c: Claim) => sum + (Number(c.amount_approved) || 0), 0).toLocaleString()}
                  </div>
                </div>
                <div className="px-4 py-2.5 bg-amber-50/30 border border-amber-100/30 rounded-xl space-y-0.5">
                  <span className="text-[9px] text-amber-600 font-mono uppercase font-semibold">Active Balance</span>
                  <div className="font-extrabold text-amber-600 font-mono">
                    UGX {Math.max(0, (activePolicy?.plan_limit || 5000000) - (memberData?.claims || []).filter((c: Claim) => c.status === 'paid' || c.status === 'approved').reduce((sum: number, c: Claim) => sum + (Number(c.amount_approved) || 0), 0)).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Twin Interactive Charts layout */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-stretch pt-2">
              
              {/* Claims Pipeline Over Month */}
              <div className="space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488] inline-block" />
                    Clinical Outlays History
                  </h4>
                  <p className="text-[11px] text-gray-500 leading-normal">
                    Aggregated view of outpatient clinical claims filed versus actual approved payouts approved by the auditor pool.
                  </p>
                </div>

                <div className="h-[260px] w-full bg-slate-50/40 p-4 rounded-xl border border-dashed border-gray-150">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECEFF1" />
                      <XAxis 
                        dataKey="name" 
                        tickLine={false} 
                        axisLine={false} 
                        stroke="#94A3B8" 
                        fontSize={10} 
                        fontFamily="monospace"
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        stroke="#94A3B8" 
                        fontSize={9} 
                        fontFamily="monospace"
                        tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(13, 148, 136, 0.03)' }} />
                      <Legend 
                        iconSize={8}
                        iconType="circle"
                        wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', paddingTop: '10px' }}
                      />
                      <Bar dataKey="Claimed" name="Claimed UGX" fill="#94A3B8" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="Approved" name="Approved UGX" fill="#0D9488" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Limits Depletion area */}
              <div className="space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    Diminishing Allocation Reserve
                  </h4>
                  <p className="text-[11px] text-gray-500 leading-normal">
                    Visual curve mapping resource consumption over time. Assures compliance beneath active plan thresholds.
                  </p>
                </div>

                <div className="h-[260px] w-full bg-slate-50/40 p-4 rounded-xl border border-dashed border-gray-150">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRemaining" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0D9488" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#0D9488" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECEFF1" />
                      <XAxis 
                        dataKey="name" 
                        tickLine={false} 
                        axisLine={false} 
                        stroke="#94A3B8" 
                        fontSize={10} 
                        fontFamily="monospace"
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        stroke="#94A3B8" 
                        fontSize={9} 
                        fontFamily="monospace"
                        tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        iconSize={8}
                        iconType="circle"
                        wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', paddingTop: '10px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Remaining Limit" 
                        name="Remaining Pool UGX" 
                        stroke="#0D9488" 
                        fillOpacity={1} 
                        fill="url(#colorRemaining)" 
                        strokeWidth={2.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Card Showcase Column */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-gray-400 font-mono uppercase tracking-wider block">Digital Member Card</h3>
            
            {activePolicy ? (
              <div id="digital-member-card" className="bg-gradient-to-tr from-[#0a1628] to-[#122842] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-teal-500/20">
                {/* Background medical grid emblem mock */}
                <div className="absolute -right-10 -bottom-10 opacity-10 bg-teal-500 h-40 w-40 rounded-full" />
                
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <span className="text-[10px] text-teal-400 font-mono font-bold tracking-widest uppercase block">Online Health Insurance (OHIMS) Uganda</span>
                    <span className="text-xs font-semibold text-gray-300 block">Health Insurance Card</span>
                  </div>
                  <div className="bg-[#0D9488] p-1.5 rounded-lg text-white">
                    <Shield className="h-5 w-5" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider font-mono block">Enrolled Policyholder</span>
                    <span className="text-base font-bold tracking-tight">{memberData.member.name}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs leading-none">
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider font-mono block">National ID</span>
                      <span className="font-semibold font-mono">{memberData.member.national_id}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider font-mono block">Policy ID</span>
                      <span className="font-semibold font-mono">{activePolicy.id}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider font-mono block">Status State</span>
                      <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded ${activePolicy.status === 'active' ? 'bg-[#0D9488]/30 text-teal-300' : 'bg-red-500/30 text-red-300'}`}>
                        ● {activePolicy.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider font-mono block">Expiry Term</span>
                      <span className={`font-semibold text-xs font-mono transition-colors flex items-center justify-end gap-1 ${isExpiringSoon || isExpired ? 'text-amber-450 font-bold' : 'text-white'}`}>
                        {isExpiringSoon || isExpired ? <AlertTriangle className="h-3.5 w-3.5 inline text-amber-500 animate-pulse" /> : null}
                        {isSimulatingExpiry ? '2026-06-22' : activePolicy.end_date}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-100 p-6 rounded-2xl text-center space-y-2">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
                <h4 className="font-bold text-xs text-red-800">Policy benefits suspended</h4>
                <p className="text-[11px] text-red-600">Please clear pending dues on premiums sub-tab to reinstate medical protection coverage.</p>
              </div>
            )}

            {/* In-app Pending Reminders Widget */}
            {outstandingPremiums.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-start space-x-2.5">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 animate-bounce-slow" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-800">Premium Installment Pending</h4>
                    <p className="text-[11px] text-amber-600 leading-relaxed mt-0.5">
                      Clearing outstanding bills preserves coverages and ensures healthcare claim processing isn't delayed.
                    </p>
                  </div>
                </div>
                
                {outstandingPremiums.map((p: Premium) => (
                  <div key={p.id} className="pt-2 border-t border-amber-200 flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-500">Due: {p.due_date}</span>
                    <button
                      onClick={() => handlePayPremium(p.id)}
                      className="bg-[#0A1628] hover:bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm"
                    >
                      Clear UGX {p.amount.toLocaleString()}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Beneficiaries Dashboard list (Module 2) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-400 font-mono uppercase tracking-wider block">Registered Beneficiaries List</h3>
              <button
                onClick={() => setShowBenForm(true)}
                className="text-xs text-[#0D9488] hover:underline flex items-center gap-1 font-bold"
              >
                <Plus className="h-3.5 w-3.5" /> Register Dependent
              </button>
            </div>

            {/* Quick Beneficiary addition form (Module 2) */}
            {showBenForm && (
              <form onSubmit={handleAddBeneficiary} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mugisha Junior"
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-teal-500"
                      value={benName}
                      onChange={e => setBenName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Relationship</label>
                    <select
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-teal-500"
                      value={benRelation}
                      onChange={e => setBenRelation(e.target.value)}
                    >
                      <option value="Spouse">Spouse</option>
                      <option value="Child">Child</option>
                      <option value="Parent">Parent</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">DOB Dependent</label>
                    <input
                      type="date"
                      required
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-teal-500"
                      value={benDob}
                      onChange={e => setBenDob(e.target.value)}
                    />
                  </div>
                </div>

                {benError && <div className="text-xs text-red-600 font-medium">{benError}</div>}
                {benSuccess && <div className="text-xs text-teal-600 font-bold">{benSuccess}</div>}

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBenForm(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#0A1628] text-white text-xs font-semibold px-4 py-1.5 rounded-md"
                  >
                    Add Dependent
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {memberData.beneficiaries.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 bg-white rounded-xl border border-gray-100 col-span-2">
                  No registered policy beneficiaries.
                </div>
              ) : (
                memberData.beneficiaries.map((b: Beneficiary) => (
                  <div key={b.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-teal-50 p-2 rounded-xl text-[#0D9488]">
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{b.name}</h4>
                        <span className="text-[10px] text-gray-400 uppercase font-mono">{b.relationship} (Born: {b.dob})</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteBeneficiary(b.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove Dependent"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Quick Summary list */}
            <div className="bg-gradient-to-br from-slate-50 to-teal-50/20 p-5 rounded-2xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Coverage & Liability checklist</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-100 flex flex-col">
                  <span className="text-[10px] text-gray-400 uppercase">Paid Claims</span>
                  <span className="text-sm font-black text-emerald-700 mt-1">
                    UGX {memberData.claims.filter((c: Claim) => c.status === 'paid').reduce((sum: number, c: Claim) => sum + c.amount_approved, 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-100 flex flex-col">
                  <span className="text-[10px] text-gray-400 uppercase">Claims evaluation</span>
                  <span className="text-sm font-black text-amber-700 mt-1">
                    {memberData.claims.filter((c: Claim) => c.status === 'submitted' || c.status === 'under_review').length} Pending
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-100 flex flex-col">
                  <span className="text-[10px] text-gray-400 uppercase">Premiums Status</span>
                  <span className="text-sm font-black text-[#0D9488] mt-1">
                    {memberData.premiums.filter((p: Premium) => p.status === 'paid').length} payments
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
        </div>
      )}

      {/* ==================== TAB 2 CLAIMS HISTORY ==================== */}
      {activeTab === 'claims' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="text-sm font-bold text-gray-400 font-mono uppercase tracking-wider block">My Medical Clinical claims (Real-time Pipeline)</h3>
            <div className="flex space-x-2">
              <button
                onClick={exportClaimsToPDF}
                className="bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5 text-[#0D9488]" /> Download Claims Report PDF
              </button>
              {activePolicy && (
                <button
                  onClick={() => setShowClaimForm(true)}
                  className="bg-[#0D9488] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#0b7e74]"
                >
                  <Plus className="h-3.5 w-3.5" /> Submit self claim
                </button>
              )}
            </div>
          </div>

          {/* New Claim Form Modal (Module 4) */}
          {showClaimForm && (
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4 max-w-xl mx-auto">
              <h4 className="font-bold text-xs text-[#0A1628] uppercase tracking-wider border-b border-gray-100 pb-2">File fresh out-of-pocket Claim</h4>
              
              <form onSubmit={handleAddClaim} className="space-y-3 font-sans">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Clinical Diagnosis</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Persistent Headaches or Outpatient Malaria Fever"
                    value={claimDiagnosis}
                    onChange={e => setClaimDiagnosis(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white uppercase outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Therapeutic Treatment/Invoiced Services</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="E.g. Inpatient Ward Bed admission, lab test analysis, blood panels, medications"
                    value={claimTreatment}
                    onChange={e => setClaimTreatment(e.target.value)}
                    className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-xs bg-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Claimed Invoiced Sum (UGX)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2.5 font-bold font-mono text-[10px] text-gray-400">UGX</span>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 150000"
                        value={claimAmount}
                        onChange={e => setClaimAmount(e.target.value)}
                        className="w-full border border-gray-200 rounded pl-11 pr-2.5 py-1.5 text-xs bg-white font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#0D9488] uppercase mb-0.5">Supporting Clinical files</label>
                    <div className="border border-dashed border-teal-200 bg-teal-50/50 rounded p-1.5 flex items-center justify-between">
                      <span className="text-[10px] text-[#0D9488] font-mono leading-none">✓ practitioner-bill.pdf</span>
                      <span className="text-[9px] text-[#0D9488] bg-[#0D9488]/15 px-1 rounded font-bold font-mono">152 KB</span>
                    </div>
                  </div>
                </div>

                {claimError && <div className="p-2 border border-red-200 bg-red-50 text-red-600 rounded text-xs leading-loose font-medium">{claimError}</div>}
                {claimSuccess && <div className="p-2 border border-teal-200 bg-teal-50 text-teal-700 font-bold rounded text-xs leading-loose">{claimSuccess}</div>}

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowClaimForm(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-claims-onboard-btn"
                    type="submit"
                    className="bg-[#0D9488] text-white text-xs font-bold px-5 py-2 rounded-lg"
                  >
                    Transmit Claim to Assessor queue
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* FEATURE 3: Claims Pre-Screening Eligibility & Co-Pay Estimator */}
          <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl relative overflow-hidden shadow-md">
            {/* Ambient background decoration */}
            <div className="absolute right-0 top-0 w-32 h-32 bg-teal-500/10 blur-2xl rounded-full pointer-events-none" />
            
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-teal-400 rotate-12" />
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-teal-400">Underwriting AI Pilot</h4>
                <h3 className="text-sm font-bold text-slate-100">Live Claim Eligibility Pre-Screener & Co-Pay Forecast</h3>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 mb-5 leading-normal max-w-xl">
              Simulate your diagnosis and anticipated medical cost in real-time under Uganda Health Insurance guidelines. Understand exact co-pay levels and plan limit warnings *prior* to transmitting your file to the underwriter review queue.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start font-sans text-xs">
              {/* Left Column Controls */}
              <div className="space-y-4 bg-slate-800/40 p-4 rounded-xl border border-slate-800 w-full">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Expected Medical Diagnosis</label>
                  <select
                    value={simDiagnosis}
                    onChange={e => setSimDiagnosis(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-[11px] font-mono text-white tracking-tight focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  >
                    <option value="Malaria Fever Checkup & Infusion">Malaria Fever Checkup & Infusion</option>
                    <option value="Regular Routine Eye Refraction Lens">Regular Routine Eye Refraction Lens</option>
                    <option value="Emergency Ward Appendectomy Surgery">Emergency Ward Appendectomy Surgery</option>
                    <option value="Elective Nose Rhinoplasty (Cosmetic)">Elective Nose Rhinoplasty (Cosmetic Dental/Aesthetic)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Invoiced / Quoted Medical Bill (UGX)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-[9px] font-bold text-teal-400 font-mono">UGX</span>
                    <input
                      type="number"
                      value={simCost}
                      onChange={e => setSimCost(e.target.value)}
                      placeholder="e.g. 250000"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-12 pr-3 py-2 text-[11px] font-mono text-white tracking-tight focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div className="flex justify-between items-center mt-1.5 text-[9px] text-slate-400 font-mono">
                    <span>Min: UGX 10,000</span>
                    <span>Max: UGX 10,000,000+</span>
                  </div>
                </div>
              </div>

              {/* Right Column Real-Time JS Calculations */}
              {(() => {
                const check = getPreScreenerAssessment();
                const isExcluded = check.verdict === 'EXCLUDED';
                const isWarning = check.limitExceeded;
                
                return (
                  <div className="space-y-4 bg-slate-950/80 p-5 rounded-xl border border-slate-800 flex flex-col justify-between h-full w-full">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Eligibility Verdict</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                          isExcluded ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 
                          isWarning ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 
                          'bg-[#0D9488]/20 text-teal-300 border border-teal-500/30'
                        }`}>
                          {check.verdict}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono text-slate-400">
                          <span>Ugandan Policy Co-Pay:</span>
                          <span className={isExcluded ? 'text-red-400 font-bold' : 'text-slate-200'}>
                            {check.coPayPercent}% ({isExcluded ? 'Full' : 'Standard'} Liability)
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-slate-400">Calculated Co-Pay Sum:</span>
                          <span className="font-bold text-amber-400">UGX {check.coPayAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-mono border-t border-slate-900 pt-1.5 mt-1">
                          <span className="text-slate-400">Est. Online Health Insurance (OHIMS) Paid Portion:</span>
                          <span className="font-black text-teal-400">UGX {check.estimatedPayout.toLocaleString()}</span>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-400 italic bg-slate-900/50 p-2 rounded border border-slate-800 leading-relaxed">
                        "{check.text}"
                      </p>

                      {/* Score Indicator Slider */}
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>Auto-Approval Probability:</span>
                          <span className={`font-bold ${check.score > 80 ? 'text-emerald-400' : check.score > 40 ? 'text-amber-400' : 'text-red-400'}`}>
                            {check.score}% Chance
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${check.score > 80 ? 'bg-emerald-400' : check.score > 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${check.score}%` }}
                          />
                        </div>
                      </div>

                      {/* Limit Alert Warning */}
                      {isWarning && (
                        <div className="p-2 border border-red-500/20 bg-red-500/10 rounded flex items-start gap-1.5 text-[10px] text-red-300 animate-pulse leading-normal">
                          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-400" />
                          <span>
                            <strong>Alert!</strong> Exceeds remaining policy limit (Remaining: UGX {check.remainingLimit.toLocaleString()}). Excess falls on you!
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Autofill trigger */}
                    {!isExcluded && (
                      <button
                        onClick={() => {
                          setClaimDiagnosis(simDiagnosis);
                          setClaimTreatment(`Outpatient Treatment plan for checked: ${simDiagnosis}`);
                          setClaimAmount(simCost);
                          setShowClaimForm(true);
                          // Soft scroll
                          setTimeout(() => {
                            document.getElementById('submit-claims-onboard-btn')?.scrollIntoView({ behavior: 'smooth' });
                          }, 150);
                        }}
                        className="w-full mt-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white text-[10px] font-bold font-mono py-2 rounded-lg transition-transform hover:-translate-y-0.5 text-center flex items-center justify-center gap-1.5"
                      >
                        <Send className="h-3.5 w-3.5" /> Transfer & Autofill Outpatient Claim Card
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left font-sans">
                <thead className="bg-[#0A1628] text-white text-xs font-mono uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Claim ID</th>
                    <th className="p-4">Diagnosis</th>
                    <th className="p-4">Services/Treatment</th>
                    <th className="p-4 text-center">Amount claimed</th>
                    <th className="p-4 text-center">Disbursed amount</th>
                    <th className="p-4">Review Status</th>
                    <th className="p-4">Assessment Feedback</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {memberData.claims.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-400">
                        No medical medical claims filed yet.
                      </td>
                    </tr>
                  ) : (
                    memberData.claims.map((c: Claim) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-mono font-bold text-[#0A1628]">{c.id}</td>
                        <td className="p-4 font-semibold text-gray-800">{c.diagnosis}</td>
                        <td className="p-4 text-gray-500 font-mono text-[11px] max-w-xs truncate" title={c.treatment}>
                          {c.treatment}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-gray-900">UGX {c.amount_claimed.toLocaleString()}</td>
                        <td className="p-4 text-center font-mono font-bold text-[#0D9488]">
                          {c.amount_approved > 0 ? `UGX ${c.amount_approved.toLocaleString()}` : '--'}
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded leading-none ${
                            c.status === 'paid' ? 'bg-teal-100 text-teal-800 border border-teal-200' :
                            c.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                            c.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            c.status === 'under_review' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-4 text-gray-500 font-mono text-[10px] leading-relaxed max-w-xs">
                          {c.notes || 'Under review by Online Health Insurance (OHIMS) clinical assessors.'}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => exportClaimToPDF(c)}
                            title="Download Claim PDF Summary"
                            className="bg-white hover:bg-[#0D9488]/10 text-slate-800 hover:text-[#0D9488] text-[9px] font-bold font-mono px-2.5 py-1.5 rounded-lg border border-gray-250 flex items-center justify-center gap-1 mx-auto transition-all duration-150 cursor-pointer"
                          >
                            <FileText className="h-3 w-3 text-[#0D9488]" />
                            PDF
                          </button>
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

      {/* ==================== TAB 3 PREMIUMS TRACKING ==================== */}
      {activeTab === 'premiums' && (
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-gray-400 font-mono uppercase tracking-wider block">Policy Premium Dues & Receipts History</h3>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left font-sans">
                <thead className="bg-[#0A1628] text-white text-xs font-mono uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Premium Installment key</th>
                    <th className="p-4 text-center">Installment Cost</th>
                    <th className="p-4">SLA Due Date</th>
                    <th className="p-4">Paid Clearance Date</th>
                    <th className="p-4">Payment status</th>
                    <th className="p-4">Receipt reference ID</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {memberData.premiums.map((p: Premium) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono font-bold text-[#0A1628]">{p.id}</td>
                      <td className="p-4 text-center font-mono font-bold">UGX {p.amount.toLocaleString()}</td>
                      <td className="p-4 font-mono">{p.due_date}</td>
                      <td className="p-4 font-mono text-gray-400">{p.paid_date ? p.paid_date.split('T')[0] : '--'}</td>
                      <td className="p-4">
                        <span className={`text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded leading-none ${
                          p.status === 'paid' ? 'bg-teal-100 text-teal-800' :
                          p.status === 'overdue' ? 'bg-red-100 text-red-800 font-black animate-pulse' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-[#0D9488]">
                        {p.receipt_number ? (
                          <span className="flex items-center gap-1">
                            <FileCheck className="h-3.5 w-3.5" /> {p.receipt_number}
                          </span>
                        ) : '--'}
                      </td>
                      <td className="p-4 text-center">
                        {p.status !== 'paid' ? (
                          <button
                            onClick={() => handlePayPremium(p.id)}
                            className="bg-[#0D9488] hover:bg-[#0b7e74] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm font-sans"
                          >
                            Pay Bill Now
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              alert(`Receipt: ${p.receipt_number}\nAmount: UGX ${p.amount.toLocaleString()}\nStatus: FULLY PAID\nPayment Date: ${p.paid_date}\nOnline Health Insurance (OHIMS) Transparency Certification Seal: Verified.`);
                            }}
                            className="text-[#0D9488] hover:underline hover:text-[#0b7e74] text-[10px] font-bold"
                          >
                            View Receipt
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

      {/* ==================== TAB 4 BENEFITS CHECKER ==================== */}
      {activeTab === 'checker' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-[#0A1628]">Transparency Coverage benefits Checker</h3>
            <p className="text-xs text-gray-500">
              Check in advance whether a specific clinical diagnosis or treatment is covered under your health plan.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0A1628] mb-2 uppercase tracking-wide">Select Treatment/Clinical Service</label>
                <select
                  value={checkTreatment}
                  onChange={e => setCheckTreatment(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-[#0D9488]"
                >
                  <option value="Malaria Fever Checkup & Infusion">Malaria Fever Assessment & Infusion</option>
                  <option value="Regular Routine Eye Refraction Lens">Routine eye examinations & corrective lenses</option>
                  <option value="Emergency Ward Appendectomy Surgery">Inpatient surgery (e.g., Appendectomy)</option>
                  <option value="Elective Nose Rhinoplasty (Cosmetic)">Cosmetic surgical rhinoplasty</option>
                </select>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase font-mono block">Your Associated Plan</span>
                <span className="text-sm font-black text-[#0A1628] block uppercase">
                  {activePolicy ? `Active: ${memberData.member.active_policy?.plan_name || 'Enrolled Coverage'}` : 'No Active Plan'}
                </span>
                <span className="text-xs text-[#0D9488] font-bold block">Policy Limit: UGX {activePolicy ? (memberData.member.active_policy?.plan_limit || 5000000).toLocaleString() : 0}</span>
              </div>
            </div>

            {/* Results Output Component */}
            {checkerResponse && (
              <div className={`p-6 rounded-2xl border flex flex-col justify-between h-full space-y-4 ${
                checkerResponse.verdict === 'COVERED' ? 'bg-[#0D9488]/5 border-[#0D9488]/20' : 'bg-red-50/50 border-red-100'
              }`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono tracking-wider font-bold text-gray-400 uppercase">Interactive Verdict</span>
                    <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded ${
                      checkerResponse.verdict === 'COVERED' ? 'bg-[#0D9488] text-white' : 'bg-red-600 text-white'
                    }`}>
                      {checkerResponse.verdict}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-[#0A1628] tracking-tight">{checkTreatment}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed pt-1">{checkerResponse.text}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-gray-400">Section allocation:</span>
                  <span className="font-bold text-[#0A1628]">{checkerResponse.tier}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 5 PREMIUMS ESTIMATOR & DEPENDENTS CALCULATOR ==================== */}
      {activeTab === 'estimator' && (
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-[#0A1628]">Interactive Health Premium & Dependents Estimator</h3>
            <p className="text-xs text-gray-500">
              Customize prospective policy boundaries, register family dependents, add medical riders, and verify UGX billing rates.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Interactive Inputs - Left */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6 font-sans text-xs">
              
              {/* Coverage Tier Selector */}
              <div>
                <label className="block text-[10px] font-bold text-[#0A1628] uppercase tracking-wider mb-2">1. Select Target Coverage Tier</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'plan-basic', label: 'Bronze Starter', rate: 'UGX 50k/mo' },
                    { id: 'plan-standard', label: 'Silver Wellness', rate: 'UGX 180k/mo' },
                    { id: 'plan-premium', label: 'Gold Care Plus', rate: 'UGX 450k/mo' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setCalcPlan(p.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        calcPlan === p.id 
                          ? 'border-[#0D9488] bg-[#0D9488]/5 shadow-sm' 
                          : 'border-gray-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="font-bold block text-gray-800 text-xs">{p.label}</span>
                      <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">{p.rate}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dependents Counter */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] font-bold text-[#0A1628] uppercase tracking-wider">2. Registered Family Dependents</label>
                  <span className="bg-[#0D9488]/10 text-[#0D9488] font-bold px-2 py-0.5 rounded text-[10px] font-mono">
                    {calcDependents} Dependents (+{calcDependents * 25}% base rate)
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={calcDependents}
                  onChange={e => {
                    setCalcDependents(Number(e.target.value));
                    setCalcIsQuoteSaved(false);
                  }}
                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#0D9488]"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-mono">
                  <span>0 (Self Cover)</span>
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5 (Max)</span>
                </div>
              </div>

              {/* Specialized Coverage Riders */}
              <div>
                <label className="block text-[10px] font-bold text-[#0A1628] uppercase tracking-wider mb-2.5">3. Specialized Coverage Riders</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { state: calcDental, setter: setCalcDental, label: 'Dental Booster', price: '+UGX 35k/mo', desc: 'Inpatient extractions & fillings' },
                    { state: calcOptical, setter: setCalcOptical, label: 'Optical Extra', price: '+UGX 45k/mo', desc: 'Lenses refract testing allowance' },
                    { state: calcCritical, setter: setCalcCritical, label: 'Critical Shield', price: '+UGX 85k/mo', desc: 'Oncology & cardiac acute benefits' }
                  ].map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        r.setter(!r.state);
                        setCalcIsQuoteSaved(false);
                      }}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all h-24 ${
                        r.state 
                          ? 'border-[#0D9488] bg-[#0D9488]/5' 
                          : 'border-gray-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-start w-full gap-2">
                        <span className="font-bold text-gray-800 tracking-tight leading-none">{r.label}</span>
                        <span className="text-[9px] font-bold text-[#0D9488] font-mono">{r.price}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 leading-tight mt-1">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Deductibles / Co-pay choice & Billing Mode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#0A1628] uppercase tracking-wider mb-2">4. Co-Pay Deductible Modifier</label>
                  <select
                    value={calcDeductible}
                    onChange={e => {
                      setCalcDeductible(e.target.value);
                      setCalcIsQuoteSaved(false);
                    }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-[#0D9488]"
                  >
                    <option value="0%">0% Co-Pay Liability (Base Premium)</option>
                    <option value="10%">10% Co-Pay Liability (8% Premium Discount)</option>
                    <option value="20%">20% Co-Pay Liability (15% Premium Discount)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#0A1628] uppercase tracking-wider mb-2">5. Billing Frequency Option</label>
                  <select
                    value={calcCycle}
                    onChange={e => {
                      setCalcCycle(e.target.value as any);
                      setCalcIsQuoteSaved(false);
                    }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-[#0D9488]"
                  >
                    <option value="monthly">Monthly Instalment Mode</option>
                    <option value="quarterly">Quarterly Mode (5% Discount applied)</option>
                    <option value="annual">Annual Mode (12% Discount applied)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Live Quotes Display Card - Right */}
            <div className="lg:col-span-5 space-y-6">
              {(() => {
                const calc = getCalculatedPremium();
                
                return (
                  <div className="bg-[#0A1628] text-white p-6 rounded-2xl relative overflow-hidden border border-teal-500/10 space-y-6 shadow-lg">
                    {/* Security logo seal decoration */}
                    <div className="absolute right-0 bottom-0 opacity-5 bg-teal-500 h-64 w-64 rounded-full pointer-events-none" />

                    <div className="border-b border-slate-800 pb-4">
                      <span className="text-[9px] font-bold tracking-widest font-mono text-teal-400 block uppercase">Online Health Insurance (OHIMS) Binding Assessment</span>
                      <h4 className="text-sm font-bold text-slate-200 mt-0.5">Coverage Valuation Quote Ledger</h4>
                    </div>

                    <div className="space-y-3.5 text-xs">
                      <div className="flex justify-between items-center text-slate-400 font-mono">
                        <span>Base Rate Monthly Cost:</span>
                        <span className="text-slate-100">UGX {calc.baseMonthly.toLocaleString()}</span>
                      </div>
                      
                      {calcDependents > 0 && (
                        <div className="flex justify-between items-center text-slate-400 font-mono">
                          <span>Dependents Surcharge Rate:</span>
                          <span className="text-slate-100">UGX {calc.dependentSurcharge.toLocaleString()}</span>
                        </div>
                      )}

                      {calc.riderSum > 0 && (
                        <div className="flex justify-between items-center text-slate-400 font-mono">
                          <span>Specialist Riders Extra:</span>
                          <span className="text-slate-100">UGX {calc.riderSum.toLocaleString()}</span>
                        </div>
                      )}

                      {calc.deductibleDiscount > 0 && (
                        <div className="flex justify-between items-center text-slate-400 font-mono text-amber-300">
                          <span>Co-Pay Deductible Discount:</span>
                          <span>- UGX {calc.deductibleDiscount.toLocaleString()}</span>
                        </div>
                      )}

                      {calc.cycleDiscountAmount > 0 && (
                        <div className="flex justify-between items-center text-slate-400 font-mono text-emerald-400">
                          <span>Payment Cycle Discount:</span>
                          <span>- UGX {calc.cycleDiscountAmount.toLocaleString()}</span>
                        </div>
                      )}

                      <div className="border-t border-slate-800 pt-5 space-y-1.5">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] text-gray-400 uppercase tracking-widest">Total Billing Installment</span>
                          <span className="text-2xl font-black text-teal-400 font-mono leading-none">
                            UGX {Math.round(calc.finalCyclePrice).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-[#0D9488] font-bold uppercase font-mono">
                          <span>Billing Cycle Due:</span>
                          <span>Per {calcCycle?.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Operational Disclaimer note */}
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1 text-[10px] text-slate-400 leading-normal">
                      <div className="flex items-center gap-1.5 font-bold text-slate-300 font-mono">
                        <Info className="h-3.5 w-3.5 text-teal-500" />
                        <span>PRE-BIND ADVISORY DICTIONARY</span>
                      </div>
                      <p>
                        This quote estimates a real-time bind based on Kampala local insurance directives. Underwriting is fully synchronized and binding when submitted to the authorized auditor pool.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={exportPremiumQuoteToPDF}
                        className="bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold font-mono py-2.5 rounded-xl transition-all border border-slate-700 hover:border-slate-600 outline-none flex items-center justify-center gap-1.5"
                      >
                        <Download className="h-3.5 w-3.5 text-[#0D9488]" /> Quote PDF
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCalcIsQuoteSaved(true);
                          setTimeout(() => {
                            setCalcIsQuoteSaved(false);
                            alert('Policy upgrade draft has been successfully logged! Online Health Insurance (OHIMS) Underwriter Rep (Ahumuza Brian) will verify credentials & issue confirmation invoice.');
                          }, 1400);
                        }}
                        className="bg-[#0D9488] hover:bg-[#0b7e74] text-white text-[10px] font-bold font-mono py-2.5 rounded-xl block text-center transition-all outline-none"
                      >
                        {calcIsQuoteSaved ? 'Registering...' : 'Request Plan Upgrade'}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 6 ACCREDITED CLINICS & KAMPALA MAP ROUTE FINDER ==================== */}
      {activeTab === 'providers' && (
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-[#0A1628]">Online Health Insurance Management System (OHIMS) Accredited Clinic Matrix & Active Route Finder</h3>
            <p className="text-xs text-gray-500">
              Search and filter approved regional medical centers. Simulate Kampala traffic density vectors to instantly compute optimal GPS driving routes and travel ETAs.
            </p>
          </div>

          {/* Quick Filter panel */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 font-sans text-xs items-center">
            
            {/* Search Input bar */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Clinic Name Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  value={provSearch}
                  onChange={e => setProvSearch(e.target.value)}
                  placeholder="e.g. Mulago, Case..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-[11px] font-mono text-white tracking-tight focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>

            {/* Clinic Type filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Health Unit Type</label>
              <select
                value={provTypeFilter}
                onChange={e => setProvTypeFilter(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-[11px] font-mono text-white focus:border-teal-500 outline-none"
              >
                <option value="all">View All Clinicians</option>
                <option value="hospital">Hospitals</option>
                <option value="clinic">Clinics</option>
                <option value="pharmacy">Pharmacies</option>
              </select>
            </div>

            {/* Current ward location selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">My Current Location (Kampala)</label>
              <select
                value={provUserLocation}
                onChange={e => {
                  setProvUserLocation(e.target.value);
                  if (provActiveRoutingId) {
                    // re-simulate
                    const activeP = providers.find(p => p.id === provActiveRoutingId);
                    if (activeP) triggerRouteSimulation(activeP.id, activeP.name);
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-[11px] font-mono text-white focus:border-teal-500 outline-none"
              >
                <option value="Nakasero, Kampala">Nakasero Hill</option>
                <option value="Kololo, Kampala">Kololo Ward</option>
                <option value="Bugolobi, Kampala">Bugolobi industrial Zone</option>
                <option value="Mengo, Kampala">Mengo Kabaka Hill</option>
                <option value="Wandegeya, Kampala">Wandegeya Roundabout</option>
              </select>
            </div>

            {/* Traffic Index Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Kampala Traffic density</label>
              <select
                value={provTraffic}
                onChange={e => {
                  setProvTraffic(e.target.value as any);
                  if (provActiveRoutingId) {
                    const activeP = providers.find(p => p.id === provActiveRoutingId);
                    if (activeP) triggerRouteSimulation(activeP.id, activeP.name);
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-[11px] font-mono text-white focus:border-teal-500 outline-none"
              >
                <option value="Clear">Clear Roadway (Speedy ETA)</option>
                <option value="Moderate">Moderate Congestion (Standard ETA)</option>
                <option value="Heavy">Heavy Commute (Delayed ETA)</option>
                <option value="Gridlock">Jam - Gridlock (Critical Lag ETA)</option>
              </select>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* Left side list */}
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {(() => {
                const filtered = providers.filter(p => {
                  const matchSearch = p.name.toLowerCase().includes(provSearch.toLowerCase()) || 
                                      p.location.toLowerCase().includes(provSearch.toLowerCase());
                  const matchType = provTypeFilter === 'all' || p.type === provTypeFilter;
                  return matchSearch && matchType;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center text-gray-400 font-sans text-xs">
                      No accredited partner clinicians match your search limits.
                    </div>
                  );
                }

                return filtered.map(p => {
                  const activePolicyId = memberData?.member?.active_policy?.plan_id || 'plan-basic';
                  const isPlanApproved = p.approved_plans.includes(activePolicyId);
                  const isRouteSelected = provActiveRoutingId === p.id;
                  
                  return (
                    <div 
                      key={p.id} 
                      className={`bg-white rounded-2xl p-5 shadow-sm border transition-all ${
                        isRouteSelected 
                          ? 'border-[#0D9488]/70 ring-1 ring-[#0D9488]/30 shadow-md' 
                          : 'border-gray-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-[#0D9488] uppercase tracking-wider bg-[#0D9488]/10 px-2 py-0.5 rounded-full">
                            ● Accredited {p.type.toUpperCase()}
                          </span>
                          <h4 className="font-bold text-[#0A1628] text-sm tracking-tight leading-snug mt-1">{p.name}</h4>
                          <p className="text-[11px] text-gray-500 font-mono flex items-center gap-1 pt-0.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" /> {p.location}
                          </p>
                        </div>

                        {/* Direct dial badge */}
                        <a 
                          href={`tel:${p.contact}`} 
                          className="text-[10px] font-mono text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded px-2 py-1 leading-none font-bold"
                          onClick={e => e.stopPropagation()}
                        >
                          ☎ call Clinic
                        </a>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-center text-[10px] font-sans flex-wrap gap-2">
                        <div className="flex items-center gap-1 text-gray-500 font-mono">
                          <span>Plans Onbed:</span>
                          <span className="text-gray-800 font-bold uppercase">{p.approved_plans.length} tiers</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`font-bold font-mono px-2 py-0.5 rounded uppercase leading-none ${
                            isPlanApproved 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {isPlanApproved ? 'Direct Billing ✓' : 'Upgrade Demanded'}
                          </span>

                          <button
                            type="button"
                            onClick={() => triggerRouteSimulation(p.id, p.name)}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            🗺️ Chart GPS Route
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Right side Map Route Simulator */}
            <div className="bg-slate-950 text-white rounded-2xl p-6 border border-slate-900 h-[600px] flex flex-col justify-between shadow-2xl relative overflow-hidden">
              {/* Grid lines background layout */}
              <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px] pointer-events-none" />

              {(() => {
                if (!provActiveRoutingId) {
                  return (
                    <div className="my-auto text-center space-y-4">
                      <div className="bg-slate-900 p-4 rounded-full w-fit mx-auto border border-slate-850">
                        <Map className="h-8 w-8 text-[#0D9488]" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-200">Enroute Navigation Ready</h4>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto">
                          Select any accredited healthcare unit to calculate driving pathways, live delays, and dynamic distances.
                        </p>
                      </div>
                    </div>
                  );
                }

                const selectedClinic = providers.find(p => p.id === provActiveRoutingId);
                if (!selectedClinic) return null;

                return (
                  <div className="flex flex-col justify-between h-full space-y-4 z-10 w-full">
                    
                    {/* Destination Banner */}
                    <div className="border-b border-slate-850 pb-3 flex justify-between items-start gap-4">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-mono tracking-widest text-[#0D9488] uppercase font-bold">Kampala Transit Hub</span>
                        <h4 className="text-sm font-bold tracking-tight text-slate-100">{selectedClinic.name}</h4>
                      </div>

                      <div className="bg-slate-900 px-3 py-1 rounded text-right font-mono text-[10px] text-teal-400 border border-slate-850">
                        GPS Active Key
                      </div>
                    </div>

                    {/* Progress tracking States */}
                    {provRoutingStep === 1 && (
                      <div className="my-auto text-center space-y-4">
                        <div className="animate-spin h-6 w-6 border-2 border-teal-500 border-t-transparent rounded-full mx-auto" />
                        <span className="text-xs text-slate-400 block font-mono">
                          🛰️ Querying satellite nodes & traffic density vectors...
                        </span>
                      </div>
                    )}

                    {provRoutingStep === 2 && (
                      <div className="my-auto text-center space-y-4">
                        <div className="animate-pulse flex space-x-1.5 justify-center">
                          <span className="h-1.5 w-1.5 bg-teal-400 rounded-full" />
                          <span className="h-1.5 w-1.5 bg-teal-400 rounded-full" />
                          <span className="h-1.5 w-1.5 bg-teal-400 rounded-full" />
                        </div>
                        <span className="text-xs text-slate-300 block font-mono">
                          🚦 Plotting optimal path across Kampala Roundabouts...
                        </span>
                      </div>
                    )}

                    {provRoutingStep === 3 && (
                      <div className="flex-1 flex flex-col justify-between h-full space-y-3.5">
                        
                        {/* Dynamic Metrics display row */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl">
                            <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500 block">Est. Distance</span>
                            <span className="text-sm font-black text-slate-100 font-mono mt-0.5 block">{provDistance} km</span>
                          </div>
                          <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl">
                            <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500 block">Travel Duration</span>
                            <span className="text-sm font-black text-teal-400 font-mono mt-0.5 block">{provEta} min</span>
                          </div>
                          <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl">
                            <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500 block">Road Density</span>
                            <span className={`text-sm font-black font-mono mt-0.5 block ${
                              provTraffic === 'Clear' ? 'text-emerald-400' :
                              provTraffic === 'Moderate' ? 'text-teal-400' :
                              provTraffic === 'Heavy' ? 'text-amber-400' : 'text-red-400 animate-pulse'
                            }`}>{provTraffic}</span>
                          </div>
                        </div>

                        {/* Interactive Vector MAP SVG Canvas */}
                        <div className="flex-1 border border-slate-850 bg-slate-950 rounded-xl relative overflow-hidden flex items-center justify-center p-2 min-h-[220px]">
                          {/* Schematic roadmap overlay */}
                          <svg className="w-full h-full text-slate-800" viewBox="0 0 400 240">
                            {/* Road outlines */}
                            <path d="M 50 120 Q 200 40 350 120" fill="none" stroke="#1E293B" strokeWidth="12" strokeLinecap="round" />
                            <path d="M 50 120 Q 200 40 350 120" fill="none" stroke="#0F172A" strokeWidth="8" strokeLinecap="round" />

                            <path d="M 120 220 Q 200 120 280 20" fill="none" stroke="#1E293B" strokeWidth="10" strokeLinecap="round" />
                            <path d="M 120 220 Q 200 120 280 20" fill="none" stroke="#0F172A" strokeWidth="6" strokeLinecap="round" />

                            <path d="M 60 40 L 340 180" fill="none" stroke="#1E293B" strokeWidth="6" strokeDasharray="3 3" />

                            {/* Dynamic Calculated Vector Pathway */}
                            <path 
                              d="M 50 120 Q 200 40 350 120" 
                              fill="none" 
                              stroke="#0D9488" 
                              strokeWidth="4" 
                              strokeLinecap="round"
                              strokeDasharray="10, 5"
                              className="animate-[dash_10s_linear_infinite]"
                              id="gps-active-path"
                            />

                            {/* Street Names text */}
                            <text x="140" y="30" fill="#475569" fontSize="8" fontFamily="monospace" rotate="12">Yusuf Lule Road</text>
                            <text x="55" y="160" fill="#475569" fontSize="8" fontFamily="monospace" rotate="-20">Kira Road</text>
                            <text x="240" y="200" fill="#475569" fontSize="8" fontFamily="monospace"> Kampala Road</text>

                            {/* Origin Pin (Self) */}
                            <circle cx="50" cy="120" r="14" fill="#0A1628" stroke="#38BDF8" strokeWidth="2" />
                            <circle cx="50" cy="120" r="4" fill="#38BDF8" className="animate-ping" />
                            <text x="50" y="142" fill="#38BDF8" fontSize="8" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">My Location</text>

                            {/* Destination Pin (Hospital) */}
                            <circle cx="350" cy="120" r="14" fill="#0A1628" stroke="#F43F5E" strokeWidth="2" />
                            <circle cx="350" cy="120" r="5" fill="#F43F5E" />
                            <text x="350" y="142" fill="#F43F5E" fontSize="8" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">Medical Unit</text>

                            {/* Map pins detail cards mock */}
                            <rect x="15" y="10" width="112" height="15" rx="3" fill="#0F172A" stroke="#1E293B" strokeWidth="1" />
                            <text x="20" y="20" fill="#94A3B8" fontSize="6.5" fontFamily="monospace">START: {provUserLocation.split(',')[0]}</text>

                            <rect x="250" y="10" width="135" height="15" rx="3" fill="#0F172A" stroke="#1E293B" strokeWidth="1" />
                            <text x="255" y="20" fill="#F43F5E" fontSize="6.5" fontFamily="monospace">DEST: {selectedClinic.name.slice(0, 18)}...</text>
                          </svg>
                        </div>

                        {/* Interactive transit directions log */}
                        <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl space-y-1 text-[10px] font-mono text-slate-400">
                          <span className="text-[#0D9488] font-bold block text-[9.5px]">CHANNELS NAVIGATION CHEATSHEET</span>
                          <div className="flex justify-between">
                            <span>1. Exit {provUserLocation.split(',')[0]} towards Wandegeya:</span>
                            <span className="text-slate-100">0.5 km</span>
                          </div>
                          <div className="flex justify-between">
                            <span>2. Keep right onto {selectedClinic.name.includes('Mulago') ? 'Mulago Hill Rd' : 'Kira Road Link'}:</span>
                            <span className="text-slate-100">{(provDistance * 0.7).toFixed(1)} km</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-850 pt-1 mt-1 font-bold text-slate-300">
                            <span>Terminal Arrival Direct-Billing Queue:</span>
                            <span className="text-teal-400">Arrived ✓</span>
                          </div>
                        </div>

                      </div>
                    )}

                    {/* Report action bar */}
                    <div className="flex justify-between items-center bg-slate-900 p-2.5 rounded-xl border border-slate-850 text-[10px]">
                      <span className="text-slate-400 leading-none">For ambulance or urgent dispatch call direct line:</span>
                      <a href="tel:112" className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-2 py-1 rounded font-mono">
                        🔴 Dial 112
                      </a>
                    </div>

                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 7: AI CHAT ASSISTANT ==================== */}
      {activeTab === 'ai_chat' && (
        <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl relative overflow-hidden shadow-md space-y-6">
          <div className="absolute right-0 top-0 w-32 h-32 bg-teal-500/10 blur-2xl rounded-full pointer-events-none" />
          
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-teal-400" />
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-teal-400">Grounded Underwriting Agent</h4>
              <h3 className="text-sm font-bold text-slate-100">Live Health Policy AI Advisor</h3>
            </div>
          </div>
          
          <p className="text-[11px] text-slate-300 leading-normal max-w-xl">
            Ask details regarding covered diagnostics, specialist exclusions, co-pay requirements, or premium thresholds. This interface is powered by your server-side Gemini API.
          </p>

          <div className="bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col h-[400px]">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin text-xs">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-[#0D9488] text-white rounded-tr-none' 
                      : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-tl-none border border-slate-700 px-4 py-2.5 text-xs flex items-center gap-1.5 font-mono">
                    <div className="animate-spin h-3.5 w-3.5 border-2 border-teal-500 border-t-transparent rounded-full" />
                    <span>Gemini is thinking...</span>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSendChatMessage} className="border-t border-slate-850 p-3 flex gap-2">
              <input
                type="text"
                placeholder="Ask e.g. 'Is a root canal operation covered in standard silver plan?'..."
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                disabled={aiLoading}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-sans"
              />
              <button
                type="submit"
                disabled={aiLoading || !aiInput.trim()}
                className="bg-[#0D9488] hover:bg-[#0b7e74] disabled:bg-slate-800 disabled:text-slate-500 text-white font-mono text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-1 shrink-0"
              >
                Send Query
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== TAB 8: PROFILE SETTINGS ==================== */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-base font-extrabold text-[#0A1628]">Profile Settings</h3>
            <p className="text-xs text-gray-400">Update your national health policy registry records and upload verification photos.</p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-2xl text-xs font-sans">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">National Identification ID</label>
                <input
                  type="text"
                  required
                  value={settingsNationalId}
                  onChange={e => setSettingsNationalId(e.target.value.toUpperCase())}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:ring-1 focus:ring-[#0D9488] focus:border-[#0D9488]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Date of Birth</label>
                <input
                  type="date"
                  required
                  value={settingsDob}
                  onChange={e => setSettingsDob(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:ring-1 focus:ring-[#0D9488] focus:border-[#0D9488]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Gender</label>
                <select
                  value={settingsGender}
                  onChange={e => setSettingsGender(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:ring-1 focus:ring-[#0D9488] focus:border-[#0D9488]"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Phone Contact</label>
                <input
                  type="text"
                  required
                  value={settingsPhone}
                  onChange={e => setSettingsPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:ring-1 focus:ring-[#0D9488] focus:border-[#0D9488]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Home / Residential Address</label>
              <input
                type="text"
                required
                value={settingsAddress}
                onChange={e => setSettingsAddress(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:ring-1 focus:ring-[#0D9488] focus:border-[#0D9488]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Avatar Photo URL</label>
              <input
                type="text"
                placeholder="e.g. https://images.unsplash.com/..."
                value={settingsPhoto}
                onChange={e => setSettingsPhoto(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white outline-none focus:ring-1 focus:ring-[#0D9488] focus:border-[#0D9488] font-mono text-[11px]"
              />
            </div>

            {settingsError && (
              <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg font-medium leading-relaxed">
                {settingsError}
              </div>
            )}

            {settingsSuccess && (
              <div className="p-3 bg-teal-50 text-teal-700 border border-teal-100 rounded-lg font-bold leading-relaxed">
                {settingsSuccess}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="submit"
                className="bg-[#0A1628] hover:bg-slate-900 text-white text-xs font-bold px-6 py-2 rounded-lg shadow-sm"
              >
                Save Profile Registry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== TAB 9: 3D DIAGNOSTICS HOLOGRAM ==================== */}
      {activeTab === 'hologram' && (
        <MedicalHologramDashboard onRefreshData={onRefreshData} />
      )}

    </div>
  );
}
