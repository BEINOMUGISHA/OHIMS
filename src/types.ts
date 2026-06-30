/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'staff' | 'provider' | 'policyholder';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  phone: string;
  created_at: string;
}

export interface Member {
  id: string;
  user_id: string;
  national_id: string;
  dob: string;
  gender: string;
  address: string;
  photo?: string;
}

export interface InsurancePlan {
  id: string;
  name: string;
  description: string;
  premium_amount: number;
  coverage_limit: number;
  benefits: string[];
  exclusions: string[];
  status: 'active' | 'inactive';
}

export type PolicyStatus = 'active' | 'suspended' | 'terminated' | 'expired';
export type PremiumFrequency = 'monthly' | 'quarterly' | 'annually';

export interface Policy {
  id: string;
  member_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: PolicyStatus;
  premium_frequency: PremiumFrequency;
}

export interface Beneficiary {
  id: string;
  policy_id: string;
  name: string;
  relationship: string;
  dob: string;
}

export type PremiumStatus = 'paid' | 'pending' | 'overdue';

export interface Premium {
  id: string;
  policy_id: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  status: PremiumStatus;
  receipt_number?: string;
}

export type ClaimStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid';

export interface Claim {
  id: string;
  policy_id: string;
  provider_id: string; // "member" if submitted by policyholder directly, or provider_id
  diagnosis: string;
  treatment: string;
  amount_claimed: number;
  amount_approved: number;
  status: ClaimStatus;
  submitted_at: string;
  reviewed_at?: string;
  notes?: string;
  is_flagged?: boolean;
  flag_reason?: string;
}

export interface ClaimDocument {
  id: string;
  claim_id: string;
  file_path: string;
  uploaded_at: string;
}

export type ProviderType = 'hospital' | 'clinic' | 'lab' | 'pharmacy';
export type AccreditationStatus = 'accredited' | 'suspended' | 'pending';

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  location: string;
  accreditation_status: AccreditationStatus;
  contact: string;
  approved_plans?: string[]; // array of insurance_plan IDs linked
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: 'info' | 'alert' | 'success';
  read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity: string;
  entity_id: string;
  timestamp: string;
}

export interface SystemSettings {
  allowAutoApprovalOfLowClaims: boolean;
  lowClaimThreshold: number;
  autoSlaDays: number;
  requireProviderAccreditation: boolean;
  allowSelfClaimSubmission: boolean;
}
