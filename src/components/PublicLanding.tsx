/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, Sparkles, AlertCircle, HelpCircle, Check, ArrowRight, Activity, DollarSign } from 'lucide-react';
import { InsurancePlan } from '../types';

interface PublicLandingProps {
  plans: InsurancePlan[];
  onOpenAuth: () => void;
}

export default function PublicLanding({ plans, onOpenAuth }: PublicLandingProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[1]?.id || 'plan-standard');
  const activePlan = plans.find(p => p.id === selectedPlanId) || plans[0];

  const faqs = [
    {
      q: "How does the claims submission review workflow operate?",
      a: "When you visit any accredited partner healthcare hospital, they can submit claims directly via our Provider Portal. If you pay out-of-pocket, you can also log into your Policyholder Dashboard and file a self-claim with receipt images. Claims under $150 are instantly auto-approved under our Efficiency SLA guidelines!"
    },
    {
      q: "What causes a policy benefits package to become suspended?",
      a: "To ensure operational financial fairness and viability, premiums must be cleared per your designated cycle (Monthly, Quarterly, or Annually). When a payment falls overdue, the system places the policy in SUSPENDED status. Once outstanding balances are cleared, benefits are re-established instantly."
    },
    {
      q: "How does the system detect duplicates or suspicious clinical claims?",
      a: "Our backend utilizes active Fraud Triage validation. If a claim matches an identical treatment code and amount for the same patient within a 2-hour window, or exceeds the plan's overall coverage limit, it is auto-flagged for manual review."
    },
    {
      q: "Where can I find my active digital policy card?",
      a: "Once you sign up and clear your initial premium charge, your digital policy card goes live instantly in your dashboard complete with full QR code and membership details."
    }
  ];

  return (
    <div className="bg-slate-50 min-h-screen">
      
      {/* Hero Header */}
      <section className="bg-gradient-to-br from-[#0A1628] via-[#0E1F35] to-[#0A1628] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center space-x-2 bg-teal-500/10 border border-teal-500/20 px-3 py-1 rounded-full text-teal-400 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Online Health Insurance Management System (OHIMS): Uganda National Platform</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Digitized, Transparent & <span className="text-[#0D9488]">Accountable</span> Health Coverage
          </h1>
          <p className="text-sm md:text-base text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Eliminating delays, manual paperwork, and fraud. Log in to manage policies, track claims in real-time, check coverage benefits, or partner as an accredited clinic.
          </p>
          <div className="flex justify-center space-x-4 pt-4">
            <button
              onClick={onOpenAuth}
              className="bg-[#0D9488] hover:bg-[#0b7e74] text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              Get Started Now <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="#compare-section"
              className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-md border border-gray-700 transition-colors"
            >
              Compare Plans
            </a>
          </div>
        </div>
      </section>

      {/* Quick Visual Stats */}
      <section className="max-w-7xl mx-auto px-4 -mt-10 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-100 flex items-center space-x-4">
            <div className="bg-teal-50 p-3 rounded-xl text-[#0D9488]">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-gray-400 font-mono uppercase tracking-wider block">Claim Triage SLA</span>
              <span className="text-xl font-extrabold text-[#0A1628]">Under 15 Minutes</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-100 flex items-center space-x-4">
            <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-gray-400 font-mono uppercase tracking-wider block">Security & Audits</span>
              <span className="text-xl font-extrabold text-[#0A1628]">100% Traceability</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-100 flex items-center space-x-4">
            <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-gray-400 font-mono uppercase tracking-wider block">Accredited Network</span>
              <span className="text-xl font-extrabold text-[#0A1628]">Mulago, Case, Kampala</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Plan Specification Viewer Section */}
      <section id="compare-section" className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-[#0A1628]">Compare Coverage benefits Tiers</h2>
          <p className="text-sm text-gray-500 max-w-xl mx-auto">
            Choose a plan tailored to your premium capacity. Select a tier below to explore details of covered benefits and system exclusion rules.
          </p>
        </div>

        {/* Selection Tabs */}
        <div className="flex justify-center bg-slate-200 p-1 rounded-xl max-w-md mx-auto mb-8 border border-slate-200">
          {plans.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPlanId(p.id)}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${selectedPlanId === p.id ? 'bg-[#0A1628] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {p.name.split(' (')[0]}
            </button>
          ))}
        </div>

        {/* Selected Plan Details block */}
        {activePlan && (
          <div className="bg-white rounded-3xl p-6 md:p-10 shadow-lg border border-slate-100 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-5">
              <div className="inline-flex bg-teal-50 text-[#0D9488] text-xs font-semibold px-3 py-1 rounded-full border border-teal-100">
                Active Tier Coverage
              </div>
              <h3 className="text-2xl font-black text-[#0A1628]">{activePlan.name}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{activePlan.description}</p>
              
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400 font-semibold">Monthly premium Due:</span>
                  <span className="text-xl font-bold text-[#0D9488]">UGX {activePlan.premium_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400 font-semibold font-sans">Policy Coverage Limit:</span>
                  <span className="text-xl font-bold text-[#0A1628]">UGX {activePlan.coverage_limit.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={onOpenAuth}
                className="w-full bg-[#0D9488] hover:bg-[#0b7e74] text-white text-xs font-bold py-3 rounded-lg shadow-sm transition-colors text-center"
              >
                Enroll & Complete Onboarding
              </button>
            </div>

            {/* Benefits vs Exclusions */}
            <div className="space-y-6 bg-slate-50/70 p-6 rounded-2xl border border-slate-100">
              <div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md mb-3 block w-fit">
                  ✓ COVERED BENEFITS INCLUDED
                </span>
                <ul className="text-xs text-gray-600 space-y-2">
                  {activePlan.benefits.map((b, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-100 px-2.5 py-1 rounded-md mb-3 block w-fit">
                  ✗ CLINICAL EXCLUSIONS
                </span>
                <ul className="text-xs text-gray-500 space-y-2">
                  {activePlan.exclusions.map((e, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <AlertCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Frequently Asked Questions */}
      <section className="bg-white py-14 border-t border-slate-100 mt-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center space-y-2 mb-10">
            <h2 className="text-2xl font-bold text-[#0A1628] tracking-tight">Platform FAQs & Resources</h2>
            <p className="text-xs text-gray-400">Everything you need to know about navigating the Online Health Insurance Management System (OHIMS) platform.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {faqs.map((f, i) => (
              <div key={i} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2 hover:bg-slate-100/50 transition-colors">
                <h4 className="font-bold text-sm text-[#0A1628] flex items-start gap-1.5 leading-snug">
                  <HelpCircle className="h-4 w-4 text-[#0D9488] shrink-0 mt-0.5" />
                  <span>{f.q}</span>
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed pl-5.5">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
