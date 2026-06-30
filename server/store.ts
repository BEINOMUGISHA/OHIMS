/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  Member,
  InsurancePlan,
  Policy,
  Beneficiary,
  Premium,
  Claim,
  ClaimDocument,
  Provider,
  Notification,
  AuditLog,
  SystemSettings,
  PremiumFrequency,
  PremiumStatus,
  ClaimStatus
} from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DBLayout {
  users: User[];
  members: Member[];
  plans: InsurancePlan[];
  policies: Policy[];
  beneficiaries: Beneficiary[];
  premiums: Premium[];
  claims: Claim[];
  documents: ClaimDocument[];
  providers: Provider[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Full seed data definition matching requirements
const DEFAULT_PLANS: InsurancePlan[] = [
  {
    id: 'plan-basic',
    name: 'Bronze Starter (Basic)',
    description: 'Affordable health coverage designed search engine for essential clinical and outpatient diagnostics perfect for students and young entrepreneurs.',
    premium_amount: 50000,
    coverage_limit: 5000000,
    benefits: [
      'General Outpatient Care & Consultations',
      'Essential Laboratory Tests & Diagnostics',
      'Generic Prescription Drug Dispensing',
      'Basic Dental Relief & Extraction Services'
    ],
    exclusions: [
      'Inpatient Elective & Complex Surgeries',
      'Specialist Medical Opinion Consultations',
      'Cosmetic and Orthodontic Treatments',
      'Advanced Neonatal or Maternity Services'
    ],
    status: 'active'
  },
  {
    id: 'plan-standard',
    name: 'Silver Wellness (Standard)',
    description: 'Comprehensive mid-tier medical cover providing robust protective coverage in major hospitals and clinical wards with standard maternity support.',
    premium_amount: 180000,
    coverage_limit: 30000000,
    benefits: [
      'General & Pediatric Outpatient Care',
      'Inpatient Hospital Admissions (up to 5 days)',
      'Approved Specialist Consultations & Visits',
      'Full Digital Radiology, Scans and Lab Workups',
      'Standard Maternity Care & Child Immunization',
      'Optical Checkups & Lens Cover (UGX 1,000,000 sub-limit)',
      'Brand-Name Pharmacy Drugs (up to UGX 2,000,000/year)'
    ],
    exclusions: [
      'Elective Cosmetic Interventions',
      'Highly Experimental Advanced Treatments',
      'Foreign Medical Tourism or Air Ambulance',
      'End-Stage Organ Transplantation Procedures'
    ],
    status: 'active'
  },
  {
    id: 'plan-premium',
    name: 'Gold Care Plus (Premium)',
    description: 'Elite healthcare coverage offering immediate, restriction-free private admissions, worldwide specialists, critical support care, and absolute peace of mind.',
    premium_amount: 450000,
    coverage_limit: 150000000,
    benefits: [
      'Immediate Private Ward Inpatient Admissions',
      'Global Medical Specialist Direct Consulting',
      'Advanced Elective & General Surgical Operations',
      'Full Optics, Hearing Aids and Root Canal Dentistry',
      'Comprehensive Maternity, Doula & Obstetric Cover',
      'Chemotherapy, Dialysis, and Chronic Management',
      'Executive Annual Preventive Wellness Checks',
      'Intensive Care Unit (ICU) and Emergency Air Support'
    ],
    exclusions: [
      'Purely Cosmetic Procedures (Non-reconstructive)',
      'Experimental Treatments unrecognized by WHO standards'
    ],
    status: 'active'
  }
];

const DEFAULT_PROVIDERS: Provider[] = [
  {
    id: 'prov-mulago',
    name: 'Mulago National Referral Hospital',
    type: 'hospital',
    location: 'Mulago Hill Road, Kampala',
    accreditation_status: 'accredited',
    contact: '+256 414 554321',
    approved_plans: ['plan-basic', 'plan-standard', 'plan-premium']
  },
  {
    id: 'prov-kampala',
    name: 'Kampala Hospital Limited',
    type: 'hospital',
    location: 'Makindo Road, Kololo, Kampala',
    accreditation_status: 'accredited',
    contact: '+256 312 210100',
    approved_plans: ['plan-standard', 'plan-premium']
  },
  {
    id: 'prov-case',
    name: 'Case Medical Centre',
    type: 'clinic',
    location: 'Buganda Road, Kampala',
    accreditation_status: 'accredited',
    contact: '+256 414 250362',
    approved_plans: ['plan-basic', 'plan-standard', 'plan-premium']
  },
  {
    id: 'prov-citypharm',
    name: 'City Pharmacy & Clinical Labs',
    type: 'pharmacy',
    location: 'Kampala Road, Kampala',
    accreditation_status: 'accredited',
    contact: '+256 414 345678',
    approved_plans: ['plan-basic', 'plan-standard']
  }
];

export const DEFAULT_SETTINGS: SystemSettings = {
  allowAutoApprovalOfLowClaims: true,
  lowClaimThreshold: 500000,
  autoSlaDays: 5,
  requireProviderAccreditation: true,
  allowSelfClaimSubmission: true
};

class LocalDatabase {
  private db: DBLayout = {
    users: [],
    members: [],
    plans: [],
    policies: [],
    beneficiaries: [],
    premiums: [],
    claims: [],
    documents: [],
    providers: [],
    notifications: [],
    auditLogs: [],
    settings: DEFAULT_SETTINGS
  };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.db = JSON.parse(raw);
        // Ensure schemas align or settings exist
        if (!this.db.settings) {
          this.db.settings = DEFAULT_SETTINGS;
        }
      } else {
        this.initializeSeedData();
      }
    } catch (e) {
      console.error('Error loading database file. Initializing default.', e);
      this.initializeSeedData();
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.db, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing database file', e);
    }
  }

  private initializeSeedData() {
    console.log('--- DB Seed: Initializing dynamic demo data ---');
    this.db.plans = [...DEFAULT_PLANS];
    this.db.providers = [...DEFAULT_PROVIDERS];
    this.db.settings = { ...DEFAULT_SETTINGS };

    // Create 4 standard platform staff logins (one for each role, plus extra)
    // 1. Admin
    const adminUser: User = {
      id: 'usr-admin',
      name: 'Deborah Namuwonge',
      email: 'admin@ohims.gov.ug',
      password_hash: hashPassword('admin123'),
      role: 'admin',
      phone: '+256 772 100200',
      created_at: new Date('2026-01-10T08:00:00Z').toISOString()
    };
    
    // 2. Staff
    const staffUser: User = {
      id: 'usr-staff',
      name: 'Ahumuza Brian',
      email: 'staff@ohims.gov.ug',
      password_hash: hashPassword('staff123'),
      role: 'staff',
      phone: '+256 701 550660',
      created_at: new Date('2026-01-11T09:30:00Z').toISOString()
    };

    // 3. Provider User (Mulago Hospital Contact)
    const providerUser1: User = {
      id: 'usr-prov-mulago',
      name: 'Dr. Joseph Okello',
      email: 'mulago@ohims.gov.ug',
      password_hash: hashPassword('provider123'),
      role: 'provider',
      phone: '+256 774 220330',
      created_at: new Date('2026-01-15T11:00:00Z').toISOString()
    };

    const providerUser2: User = {
      id: 'usr-prov-case',
      name: 'Dr. Sarah Nabatanzi',
      email: 'case@ohims.gov.ug',
      password_hash: hashPassword('provider123'),
      role: 'provider',
      phone: '+256 752 440440',
      created_at: new Date('2026-01-16T14:45:00Z').toISOString()
    };

    this.db.users.push(adminUser, staffUser, providerUser1, providerUser2);

    // Seed 5 Members (each has a user account, policy and some premiums/claims)
    const membersData = [
      {
        id: 'mem-1',
        name: 'Mugisha Innocent (User)',
        email: 'beinomugishainnocent2001@gmail.com',// Matches the developer email from metadata for smooth login testing!
        phone: '+256 789 123456',
        national_id: 'CM0102198U890P',
        dob: '2001-09-12',
        gender: 'male',
        address: 'Kireka Ward B, Kira Municipality, Kampala',
        planId: 'plan-premium',
        premiumStatus: 'paid',
        paymentFreq: 'quarterly'
      },
      {
        id: 'mem-2',
        name: 'Babirye Florence',
        email: 'florence.bab@gmail.com',
        phone: '+256 702 345678',
        national_id: 'CF9512398T671F',
        dob: '1995-11-22',
        gender: 'female',
        address: 'Ntinda Complex Block C, Kampala',
        planId: 'plan-standard',
        premiumStatus: 'pending',
        paymentFreq: 'monthly'
      },
      {
        id: 'mem-3',
        name: 'Ssekabira David',
        email: 'david.ssek@outlook.com',
        phone: '+256 754 987654',
        national_id: 'CM8804321A112X',
        dob: '1988-04-05',
        gender: 'male',
        address: 'Bunga Ggaba Area, Makindye Division, Kampala',
        planId: 'plan-standard',
        premiumStatus: 'overdue',
        paymentFreq: 'monthly'
      },
      {
        id: 'mem-4',
        name: 'Nakamya Resty',
        email: 'nakamya.resty@yahoo.com',
        phone: '+256 776 112233',
        national_id: 'CF0011234B345L',
        dob: '2000-01-15',
        gender: 'female',
        address: 'Luzira Stage 4, Nakawa Division, Kampala',
        planId: 'plan-basic',
        premiumStatus: 'paid',
        paymentFreq: 'annually'
      },
      {
        id: 'mem-5',
        name: 'Ssewankambo Andrew',
        email: 'andrew.ssew@gmail.com',
        phone: '+256 705 445566',
        national_id: 'CM9207865Y899G',
        dob: '1992-07-31',
        gender: 'male',
        address: 'Kabusu Road, Rubaga Division, Kampala',
        planId: 'plan-basic',
        premiumStatus: 'paid',
        paymentFreq: 'monthly'
      }
    ];

    membersData.forEach((item, index) => {
      // 1. Add User
      const u: User = {
        id: `usr-member-${index + 1}`,
        name: item.name,
        email: item.email,
        password_hash: hashPassword('member123'), // standard password
        role: 'policyholder',
        phone: item.phone,
        created_at: new Date('2026-02-01T10:00:00Z').toISOString()
      };
      this.db.users.push(u);

      // 2. Add Member
      const m: Member = {
        id: item.id,
        user_id: u.id,
        national_id: item.national_id,
        dob: item.dob,
        gender: item.gender,
        address: item.address
      };
      this.db.members.push(m);

      // 3. Add Policy
      const start = new Date('2026-02-01T00:00:00Z');
      const end = new Date('2027-02-01T00:00:00Z');
      const p: Policy = {
        id: `pol-${index + 1}`,
        member_id: m.id,
        plan_id: item.planId,
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        status: item.premiumStatus === 'overdue' ? 'suspended' : 'active',
        premium_frequency: item.paymentFreq as PremiumFrequency
      };
      this.db.policies.push(p);

      // 4. Beneficiaries (at least 1 per policy representing essential enrollment)
      this.db.beneficiaries.push({
        id: `ben-${index + 1}-1`,
        policy_id: p.id,
        name: `${item.name.split(' ')[0]} Junior`,
        relationship: 'Child',
        dob: '2020-05-15'
      });

      // 5. Add premiums (Paid and Overdue/Pending)
      const selectedPlan = DEFAULT_PLANS.find(dp => dp.id === item.planId) || DEFAULT_PLANS[0];
      const cost = p.premium_frequency === 'annually' 
        ? selectedPlan.premium_amount * 12 
        : p.premium_frequency === 'quarterly' 
          ? selectedPlan.premium_amount * 3 
          : selectedPlan.premium_amount;

      // History installment (Paid receipt)
      this.db.premiums.push({
        id: `prem-${index + 1}-history`,
        policy_id: p.id,
        amount: cost,
        due_date: '2026-02-01',
        paid_date: '2026-01-30',
        status: 'paid',
        receipt_number: `REC-2026-${1000 + index}`
      });

      // Upcoming/current installment
      this.db.premiums.push({
        id: `prem-${index + 1}-current`,
        policy_id: p.id,
        amount: cost,
        due_date: p.premium_frequency === 'monthly' ? '2026-06-01' : '2026-08-01',
        paid_date: item.premiumStatus === 'paid' ? '2026-05-28' : undefined,
        status: item.premiumStatus as PremiumStatus,
        receipt_number: item.premiumStatus === 'paid' ? `REC-2026-${2000 + index}` : undefined
      });
    });

    // Seed 10 Claims across different statuses and conditions (required audit trail + SLAs)
    // 1-3. Approved Claims
    // 4-6. Paid Claims
    // 7-8. Submitted / Under Review Claims
    // 9. Rejected Claim
    // 10. Flagged suspicious Claim
    const claimTemplates = [
      {
        id: 'clm-1',
        policyId: 'pol-1', // Premium plan (Mugisha Innocent)
        providerId: 'prov-mulago',
        diagnosis: 'Malaria Fever - Moderate severe',
        treatment: 'Intravenous Artesunate & Standard Nursing Ward Admission',
        claimed: 350000, // Below UGX 500k threshold auto-approved SLA demo
        approved: 350000,
        status: 'paid',
        submitted: '2026-04-10T08:15:00Z',
        reviewed: '2026-04-10T10:00:00Z',
        notes: 'Claim passed validation checks. Instantly auto-approved due to low-claim value threshold.',
        isFlagged: false
      },
      {
        id: 'clm-2',
        policyId: 'pol-1',
        providerId: 'prov-kampala',
        diagnosis: 'Dental Pulp Pain',
        treatment: 'Premolar Root Canal Treatment & Local Anaesthetic Intervention',
        claimed: 1800000,
        approved: 1800000,
        status: 'paid',
        submitted: '2026-04-18T10:00:00Z',
        reviewed: '2026-04-19T11:30:00Z',
        notes: 'Clinical necessity verified by practitioner. Fully disbursed to provider.',
        isFlagged: false
      },
      {
        id: 'clm-3',
        policyId: 'pol-2', // Standard plan
        providerId: 'prov-case',
        diagnosis: 'Acute Gastroenteritis',
        treatment: 'Saline Rehydration, Bed Care Admissions, Oral Suppressants',
        claimed: 1200000,
        approved: 1200000,
        status: 'approved',
        submitted: '2026-05-20T09:00:00Z',
        reviewed: '2026-05-21T15:20:00Z',
        notes: 'Co-pay not applicable. Approved for payout processing.',
        isFlagged: false
      },
      {
        id: 'clm-4',
        policyId: 'pol-4', // Basic plan
        providerId: 'prov-case',
        diagnosis: 'Respiratory Dry Cough & Bronchitis',
        treatment: 'Expectorants, Salbutamol Inhaler, Chest Auscultation Consultation',
        claimed: 250000,
        approved: 250000,
        status: 'paid',
        submitted: '2026-03-05T14:00:00Z',
        reviewed: '2026-03-05T14:15:00Z',
        notes: 'Outpatient basic package fully covered. Completed.',
        isFlagged: false
      },
      {
        id: 'clm-5',
        policyId: 'pol-5',
        providerId: 'prov-citypharm',
        diagnosis: 'Prescription Drug Purchase',
        treatment: 'Supplying Antibiotics, Anti-pyretics, and Multivitamins',
        claimed: 150000,
        approved: 150000,
        status: 'paid',
        submitted: '2026-03-12T16:30:00Z',
        reviewed: '2026-03-12T16:45:00Z',
        notes: 'Pharmacy invoice checks completed successfully.',
        isFlagged: false
      },
      {
        id: 'clm-6',
        policyId: 'pol-1',
        providerId: 'prov-kampala',
        diagnosis: 'Ophthalmology Consultation',
        treatment: 'Visual Acuity Refraction Index & Standard Bi-focal Lens Supply',
        claimed: 1400000,
        approved: 1400000,
        status: 'approved',
        submitted: '2026-05-29T11:00:00Z',
        reviewed: '2026-06-01T10:45:00Z',
        notes: 'Optical allowance remaining: UGX 3,000,000. Full coverage granted.',
        isFlagged: false
      },
      {
        id: 'clm-7',
        policyId: 'pol-2',
        providerId: 'prov-mulago',
        diagnosis: 'Strep Throat Outbreak Checkup',
        treatment: 'Swab Analysis Diagnostic and Amoxicillin Course',
        claimed: 420000,
        approved: 0,
        status: 'under_review',
        submitted: '2026-06-02T09:30:00Z',
        notes: 'Submitted via provider portal. Verification queue.',
        isFlagged: false
      },
      {
        id: 'clm-8',
        policyId: 'pol-4',
        providerId: 'prov-citypharm',
        diagnosis: 'Chronic Asthma Supply',
        treatment: 'Fluticasone Inhaler Refill',
        claimed: 380000,
        approved: 0,
        status: 'submitted',
        submitted: '2026-06-03T15:10:00Z',
        notes: 'Claim incoming from pharmacy ledger system.',
        isFlagged: false
      },
      {
        id: 'clm-9',
        policyId: 'pol-4', // Basic plan
        providerId: 'prov-kampala',
        diagnosis: 'Specialist ENT Scan Request & Elective Audiometer Therapy',
        treatment: 'High-frequency Audiology scan and therapeutic consultation',
        claimed: 2400000,
        approved: 0,
        status: 'rejected',
        submitted: '2026-04-15T09:00:00Z',
        reviewed: '2026-04-15T16:00:00Z',
        notes: 'Claim rejected. Plan basic coverage exclusions apply: Section 7 (Specialist Consultations & Advanced Audiological Scanning).',
        isFlagged: false
      },
      {
        id: 'clm-10',
        policyId: 'pol-5', // Basic plan (Ssewankambo Andrew)
        providerId: 'prov-mulago',
        diagnosis: 'Accidental Bruising & Fracture Treatment Claim (Duplicate attempt)',
        treatment: 'Repeat application request of clinical cast and orthopedic inspection fees',
        claimed: 6500000, // Exceeds basic coverage limit of UGX 5,000,000
        approved: 0,
        status: 'under_review',
        submitted: '2026-06-03T08:00:00Z',
        notes: 'SLA priority HIGH. Flagged automatically for audits.',
        isFlagged: true,
        flagReason: 'FLAGGED FOR REVIEW: Sum requested (UGX 6,500,000.00) exceeds current total remaining balance available on Basic Plan limit (UGX 5,000,000.00).'
      }
    ];

    claimTemplates.forEach(t => {
      this.db.claims.push({
        id: t.id,
        policy_id: t.policyId,
        provider_id: t.providerId,
        diagnosis: t.diagnosis,
        treatment: t.treatment,
        amount_claimed: t.claimed,
        amount_approved: t.approved,
        status: t.status as ClaimStatus,
        submitted_at: t.submitted,
        reviewed_at: t.reviewed,
        notes: t.notes,
        is_flagged: t.isFlagged,
        flag_reason: t.flagReason
      });

      // Claim document list (simulate clinical files)
      this.db.documents.push({
        id: `doc-${t.id}-bill`,
        claim_id: t.id,
        file_path: `/uploads/diagnostics-${t.id}.pdf`,
        uploaded_at: t.submitted
      });
    });

    // Seed Initial System Notifications
    this.db.notifications.push(
      {
        id: 'not-1',
        user_id: 'usr-member-1', // Innocent
        message: 'Your Silver Standard Policy card is active! Log in to check details.',
        type: 'success',
        read: false,
        created_at: new Date('2026-02-01T10:15:00Z').toISOString()
      },
      {
        id: 'not-2',
        user_id: 'usr-member-3', // David (overdue)
        message: 'ALERT: Your monthly premium of UGX 180,000 was due on June 1st. Please fulfill to unlock suspended benefits.',
        type: 'alert',
        read: false,
        created_at: new Date('2026-06-02T08:00:00Z').toISOString()
      },
      {
        id: 'not-3',
        user_id: 'usr-staff',
        message: 'Suspicious Claim System Alert: Multiple repeat attempts found on basic member ID Ssewankambo Andrew (mem-5).',
        type: 'alert',
        read: false,
        created_at: new Date('2026-06-03T08:05:00Z').toISOString()
      }
    );

    // Initial Audit Logs (recreates transparency & clinical record audits)
    this.db.auditLogs.push(
      {
        id: 'aud-1',
        user_id: 'usr-admin',
        user_name: 'Deborah Namuwonge',
        action: 'CREATED_SYSTEM_PLANS',
        entity: 'insurance_plans',
        entity_id: 'multi',
        timestamp: new Date('2026-01-10T09:00:00Z').toISOString()
      },
      {
        id: 'aud-2',
        user_id: 'usr-admin',
        user_name: 'Deborah Namuwonge',
        action: 'ACCREDITED_PROVIDER',
        entity: 'providers',
        entity_id: 'prov-mulago',
        timestamp: new Date('2026-01-15T12:00:00Z').toISOString()
      },
      {
        id: 'aud-3',
        user_id: 'usr-member-1',
        user_name: 'Mugisha Innocent (User)',
        action: 'SUBMITTED_CLAIM',
        entity: 'claims',
        entity_id: 'clm-1',
        timestamp: new Date('2026-04-10T08:15:00Z').toISOString()
      },
      {
        id: 'aud-4',
        user_id: 'usr-staff',
        user_name: 'Ahumuza Brian',
        action: 'REJECTED_CLAIM_OUT_OF_BENEFITS',
        entity: 'claims',
        entity_id: 'clm-9',
        timestamp: new Date('2026-04-15T16:00:00Z').toISOString()
      }
    );

    this.save();
    console.log('--- DB Seed Complete: Seeded Successfully ---');
  }

  // Transaction API Helpers
  public query<K extends keyof DBLayout>(table: K): DBLayout[K] {
    return this.db[table];
  }

  public updateTable<K extends keyof DBLayout>(table: K, data: DBLayout[K]) {
    this.db[table] = data;
    this.save();
  }

  public insert<K extends keyof DBLayout>(table: K, record: any) {
    (this.db[table] as any[]).push(record);
    this.save();
    return record;
  }

  public writeAudit(userId: string, userName: string, action: string, entity: string, entityId: string) {
    const log: AuditLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user_id: userId,
      user_name: userName,
      action,
      entity,
      entity_id: entityId,
      timestamp: new Date().toISOString()
    };
    this.insert('auditLogs', log);
    return log;
  }

  public addNotification(userId: string, message: string, type: 'info' | 'alert' | 'success') {
    const not: Notification = {
      id: `not-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user_id: userId,
      message,
      type,
      read: false,
      created_at: new Date().toISOString()
    };
    this.insert('notifications', not);
    return not;
  }
}

export const dbInstance = new LocalDatabase();
