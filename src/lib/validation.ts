/**
 * src/lib/validation.ts
 * ─────────────────────────────────────────────────────────────
 * OHIMS Uganda — Shared Zod validation schemas.
 * Used identically on the client (instant feedback) and inside
 * Supabase Edge Functions so bad data can never slip through.
 *
 * NOTE: This file targets Zod v4 (bundled with "zod" ≥ 4.0).
 * Zod v4 removed the `errorMap` option on .enum(); use the
 * second positional `error` param or a plain message string.
 * `invalid_type_error` on z.number() is also replaced by
 * `error` in v4 — we use a custom refine/pipe instead.
 * ─────────────────────────────────────────────────────────────
 */

import { z } from 'zod';

// ── Primitives ─────────────────────────────────────────────────

/** Ugandan phone numbers: 07XXXXXXXX or 03XXXXXXXX (10 digits) */
const ugandanPhone = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^(07|03)\d{8}$/, 'Phone must be in format 07XXXXXXXX or 03XXXXXXXX');

/** National Identification Number — 14 alphanumeric chars */
const nationalId = z
  .string()
  .min(1, 'National ID is required')
  .regex(/^[A-Za-z0-9]{14}$/, 'National ID must be exactly 14 alphanumeric characters');

/** Positive currency amount in UGX */
const ugxAmount = z
  .number()
  .refine((n) => !isNaN(n), 'Amount must be a number')
  .refine((n) => n > 0, 'Amount must be greater than zero')
  .refine((n) => n <= 999_999_999, 'Amount exceeds maximum allowed value');

/** ISO date string YYYY-MM-DD */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

// ── Auth Schemas ───────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  phone: ugandanPhone,
  national_id: nationalId,
  dob: isoDate.optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other']).refine(Boolean, 'Please select a gender'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  selected_plan_id: z.string().min(1, 'Please select an insurance plan'),
  premium_frequency: z.enum(['monthly', 'quarterly', 'annually']),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ── Claims Schemas ─────────────────────────────────────────────

export const claimSubmitSchema = z.object({
  diagnosis: z.string().min(3, 'Diagnosis must be at least 3 characters').max(500),
  treatment: z.string().min(3, 'Treatment description must be at least 3 characters').max(1000),
  amount_claimed: ugxAmount,
  notes: z.string().max(2000).optional().or(z.literal('')),
  provider_id: z.string().uuid('Please select a valid provider').optional().or(z.literal('')),
});

export const claimReviewSchema = z.object({
  status: z.enum(['under_review', 'approved', 'rejected']),
  amount_approved: ugxAmount.or(z.literal(0)),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

// ── Beneficiary Schema ─────────────────────────────────────────

export const beneficiarySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  relationship: z.enum(['spouse', 'child', 'parent', 'sibling', 'other']),
  dob: isoDate.optional().or(z.literal('')),
  national_id: nationalId.optional().or(z.literal('')),
});

// ── Provider Schemas ───────────────────────────────────────────

export const providerSchema = z.object({
  name: z.string().min(2, 'Provider name must be at least 2 characters').max(200),
  type: z.enum(['hospital', 'clinic', 'lab', 'pharmacy']),
  location: z.string().min(5, 'Location must be at least 5 characters').max(300),
  contact: z.string().min(5, 'Contact information is required').max(200),
  accreditation_status: z.enum(['accredited', 'suspended', 'pending']).optional(),
});

export const ninLookupSchema = z.object({
  national_id: nationalId,
});

// ── Insurance Plan Schema ──────────────────────────────────────

export const planSchema = z.object({
  name: z.string().min(2, 'Plan name must be at least 2 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000),
  premium_amount: ugxAmount,
  coverage_limit: ugxAmount,
  benefits: z.array(z.string().min(1)).min(1, 'At least one benefit is required'),
  exclusions: z.array(z.string().min(1)),
  status: z.enum(['active', 'inactive']),
});

// ── Premium Payment Schema ─────────────────────────────────────

export const mobileMoneySchema = z.object({
  phone: ugandanPhone,
  network: z.enum(['mtn', 'airtel']),
});

// ── Profile Update Schema ──────────────────────────────────────

export const profileUpdateSchema = z.object({
  phone: ugandanPhone.optional().or(z.literal('')),
  address: z.string().min(5, 'Address must be at least 5 characters').optional().or(z.literal('')),
  dob: isoDate.optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other']).optional(),
  national_id: nationalId.optional().or(z.literal('')),
});

// ── System Settings Schema ─────────────────────────────────────

export const systemSettingsSchema = z.object({
  allowAutoApprovalOfLowClaims: z.boolean(),
  lowClaimThreshold: z.number().nonnegative('Threshold must be 0 or more'),
  autoSlaDays: z.number().int().min(1, 'SLA days must be at least 1').max(90),
  requireProviderAccreditation: z.boolean(),
  allowSelfClaimSubmission: z.boolean(),
});

// ── Utility: safe parse + flatten errors ───────────────────────

/**
 * Parses data against a schema and returns fieldErrors map.
 * Returns null if validation passes.
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { errors: Record<string, string>; data: null } | { errors: null; data: T } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { errors: null, data: result.data };
  }
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.');
    if (!errors[key]) errors[key] = issue.message;
  }
  return { errors, data: null };
}

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ClaimSubmitInput = z.infer<typeof claimSubmitSchema>;
export type ClaimReviewInput = z.infer<typeof claimReviewSchema>;
export type BeneficiaryInput = z.infer<typeof beneficiarySchema>;
export type ProviderInput = z.infer<typeof providerSchema>;
export type NINLookupInput = z.infer<typeof ninLookupSchema>;
export type PlanInput = z.infer<typeof planSchema>;
export type MobileMoneyInput = z.infer<typeof mobileMoneySchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type SystemSettingsInput = z.infer<typeof systemSettingsSchema>;
