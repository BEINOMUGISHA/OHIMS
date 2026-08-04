/**
 * src/lib/api.ts
 * ──────────────────────────────────────────────────────────────────────
 * OHIMS Uganda — Supabase-native API layer (v2).
 * All functions return a consistent { data, error } shape and never throw.
 * Raw database errors are translated into human-readable messages via errors.ts.
 * Idempotency: write operations that carry financial/state impact accept or
 * generate a unique payment_reference to prevent double-submission.
 * ──────────────────────────────────────────────────────────────────────
 */

import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';
import { translateError, safeCall, ApiResponse } from './errors';

// ── helpers ────────────────────────────────────────────────────────────

function generatePolicyId(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `POL-${year}-${rand}`;
}

function generateReceiptNumber(): string {
  return `RCP-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
}

async function writeAudit(
  userId: string | null,
  userName: string,
  action: string,
  entity: string,
  entityId: string
) {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    user_name: userName,
    action,
    entity,
    entity_id: entityId,
  });
}

async function addNotification(
  userId: string,
  message: string,
  type: 'info' | 'success' | 'alert' | 'error' = 'info'
) {
  await supabase.from('notifications').insert({ user_id: userId, message, type });
}

// ── AUTH ───────────────────────────────────────────────────────────────

export const authApi = {
  /**
   * Role-Based Registration with Access Code Validation.
   * Prevents impersonation: each role requires a secret access code.
   * Member → open registration (no code needed)
   * Staff  → requires STAFF-OHIMS-2026
   * Provider/Clinic → requires CLINIC-OHIMS-2026
   * Admin  → requires ADMIN-OHIMS-2026
   */
  register: async (payload: {
    name: string;
    email: string;
    password: string;
    phone: string;
    national_id: string;
    dob: string;
    gender: string;
    address: string;
    selected_plan_id: string;
    premium_frequency: string;
    role?: string;
    access_code?: string;
  }): Promise<ApiResponse<{ user: unknown; emailConfirmationRequired?: boolean; message?: string }>> => {
    return safeCall(async () => {
      const {
        name, email, password, phone, national_id,
        dob, gender, address, selected_plan_id, premium_frequency,
        role = 'member', access_code = '',
      } = payload;

      // ── Access Code Validation ─────────────────────────────────────
      const ROLE_ACCESS_CODES: Record<string, string> = {
        admin:    'ADMIN-OHIMS-2026',
        staff:    'STAFF-OHIMS-2026',
        provider: 'CLINIC-OHIMS-2026',
        member:   '',  // members can register freely
      };

      const validRoles = Object.keys(ROLE_ACCESS_CODES);
      if (!validRoles.includes(role)) {
        throw new Error(`Invalid role "${role}". Choose: Member, Staff, Clinic Provider, or Admin.`);
      }

      const requiredCode = ROLE_ACCESS_CODES[role];
      if (requiredCode && access_code.trim() !== requiredCode) {
        throw new Error(
          `Invalid access code for ${role} role. Please contact your OHIMS system administrator for the correct code.`
        );
      }

      // ── Supabase Auth Sign Up ──────────────────────────────────────
      let userId: string;
      let hasSession = false;

      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role, phone, national_id, dob, gender, address, selected_plan_id, premium_frequency },
        },
      });

      if (authErr) {
        const errLower = authErr.message.toLowerCase();
        if (errLower.includes('already registered') || errLower.includes('already exists')) {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (signInErr) throw new Error('An account with this email is already registered. Please sign in with your password.');
          userId = signInData.user.id;
          hasSession = true;
        } else {
          throw authErr;
        }
      } else {
        userId = authData.user!.id;
        hasSession = !!authData.session;
      }

      if (!hasSession) {
        return {
          user: null,
          emailConfirmationRequired: true,
          message: 'Registration received! Please check your inbox to activate your account.',
        };
      }

      // ── Save Profile with Correct Role ────────────────────────────
      const profileData = {
        id: userId, email, name, role, status: 'active',
        phone, national_id, dob: dob || null, gender, address,
      };

      const { error: profErr } = await supabase.from('profiles').upsert(profileData);
      if (profErr) console.warn('Profile upsert warning:', profErr.message);

      // ── Only create policy for Member role ────────────────────────
      if (role === 'member') {
        const { data: existingPolicies } = await supabase.from('policies').select('id').eq('user_id', userId);

        if (!existingPolicies || existingPolicies.length === 0) {
          const { data: plan } = await supabase.from('plans').select('*').eq('id', selected_plan_id).single();
          const planLimit = plan?.coverage_limit ?? 5000000;
          const planRate = plan?.premium_amount ?? 45000;
          const policyId = generatePolicyId();
          const startDate = new Date().toISOString().split('T')[0];
          const endDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

          await supabase.from('policies').insert({
            id: policyId, user_id: userId, plan_id: selected_plan_id,
            status: 'active', start_date: startDate, end_date: endDate,
            premium_rate: planRate, coverage_limit: planLimit, remaining_coverage: planLimit,
          });

          const premDue = new Date();
          premDue.setDate(premDue.getDate() + 30);
          const paymentRef = uuidv4();
          await supabase.from('premiums').insert({
            policy_id: policyId, amount: planRate, status: 'unpaid',
            due_date: premDue.toISOString().split('T')[0], payment_reference: paymentRef,
          });

          await addNotification(userId, `Welcome to OHIMS Uganda! Your policy ${policyId} is now active. Your first premium is due in 30 days.`, 'success');
        }
      } else {
        // Staff, Admin, Provider welcome notification
        const roleLabel = role === 'admin' ? 'Administrator' : role === 'staff' ? 'Staff Officer' : 'Clinic Provider';
        await addNotification(userId, `Welcome to OHIMS Uganda! Your ${roleLabel} account is now active.`, 'success');
      }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
      return { user: profile || profileData };
    });
  },



  /**
   * Sign in with email + password via Supabase Auth.
   * Auto-heals missing profiles from auth user metadata.
   */
  login: async (email: string, password: string): Promise<ApiResponse<{ token: string; user: unknown }>> => {
    return safeCall(async () => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const userId = data.user.id;
      let { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();

      if (!profile) {
        const userMeta = data.user.user_metadata || {};
        const newProfile = {
          id: userId, email: data.user.email || email,
          name: userMeta.name || email.split('@')[0], role: userMeta.role || 'member',
          status: 'active', phone: userMeta.phone || '', national_id: userMeta.national_id || '',
          address: userMeta.address || 'Kampala, Uganda', dob: userMeta.dob || null, gender: userMeta.gender || 'male',
        };
        await supabase.from('profiles').upsert(newProfile);
        profile = newProfile as any;
      }

      await writeAudit(userId, profile.name, 'USER_LOGIN', 'profiles', userId);
      return { token: userId, user: profile };
    });
  },

  /** Restore session from stored token. */
  getMe: async (): Promise<ApiResponse<unknown>> => {
    return safeCall(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      let { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();

      if (!profile && session.user) {
        const userMeta = session.user.user_metadata || {};
        const newProfile = {
          id: session.user.id, email: session.user.email || '',
          name: userMeta.name || session.user.email?.split('@')[0] || 'User',
          role: userMeta.role || 'member', status: 'active',
          phone: userMeta.phone || '', national_id: userMeta.national_id || '',
          address: userMeta.address || '', dob: userMeta.dob || null, gender: userMeta.gender || 'male',
        };
        await supabase.from('profiles').upsert(newProfile);
        profile = newProfile as any;
      }

      return profile ?? null;
    });
  },

  /** Sign out and clear local session. */
  logout: async (): Promise<ApiResponse<null>> => {
    return safeCall(async () => {
      await supabase.auth.signOut();
      return null;
    });
  },

  /** Reset password — updates Supabase Auth password. */
  resetPassword: async (email: string, newPassword: string): Promise<ApiResponse<{ message: string }>> => {
    return safeCall(async () => {
      const { data: profile } = await supabase.from('profiles').select('id, name').eq('email', email).single();
      if (!profile) throw new Error('No account found with that email address.');

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      await writeAudit(profile.id, profile.name, 'PASSWORD_RESET', 'profiles', profile.id);
      return { message: 'Password reset successful! You can now sign in with your new password.' };
    });
  },
};

// ── PLANS ──────────────────────────────────────────────────────────────

export const plansApi = {
  list: async (): Promise<ApiResponse<unknown[]>> => {
    return safeCall(async () => {
      const { data, error } = await supabase.from('plans').select('*').order('premium_amount', { ascending: true });
      if (error) throw error;
      return data ?? [];
    });
  },

  create: async (payload: Record<string, unknown>, actorName: string): Promise<ApiResponse<unknown>> => {
    return safeCall(async () => {
      const { data, error } = await supabase.from('plans').insert({ ...payload, id: `plan-${uuidv4().slice(0, 8)}` }).select().single();
      if (error) throw error;
      await writeAudit(null, actorName, 'PLAN_CREATED', 'plans', (data as any).id);
      return data;
    });
  },

  update: async (id: string, payload: Record<string, unknown>, actorName: string): Promise<ApiResponse<unknown>> => {
    return safeCall(async () => {
      const { data, error } = await supabase.from('plans').update(payload).eq('id', id).select().single();
      if (error) throw error;
      await writeAudit(null, actorName, 'PLAN_UPDATED', 'plans', id);
      return data;
    });
  },
};

// ── USERS / MEMBER MANAGEMENT ─────────────────────────────────────────

export const usersApi = {
  list: async (): Promise<ApiResponse<unknown[]>> => {
    return safeCall(async () => {
      const { data, error } = await supabase.from('profiles').select('id, name, email, role, phone, created_at, status').order('created_at');
      if (error) throw error;
      return data ?? [];
    });
  },

  listMembers: async (search?: string): Promise<ApiResponse<unknown[]>> => {
    return safeCall(async () => {
      let q = supabase
        .from('profiles')
        .select(`
          id, name, email, role, phone, national_id, gender, address, dob, photo, created_at, status,
          policies (
            id, status, plan_id, coverage_limit, remaining_coverage, start_date, end_date, premium_rate,
            plans ( name ),
            premiums ( id, amount, status, due_date ),
            beneficiaries ( id, name, relationship )
          )
        `)
        .eq('role', 'member')
        .order('created_at', { ascending: false });
      if (search) {
        q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,national_id.ilike.%${search}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    });
  },

  suspend: async (userId: string, actorId: string, actorName: string): Promise<ApiResponse<null>> => {
    return safeCall(async () => {
      const { error } = await supabase.from('profiles').update({ status: 'suspended' }).eq('id', userId);
      if (error) throw error;
      await supabase.from('policies').update({ status: 'suspended' }).eq('user_id', userId).eq('status', 'active');
      await addNotification(userId, 'Your OHIMS account has been suspended. Please contact support for assistance.', 'alert');
      await writeAudit(actorId, actorName, 'MEMBER_SUSPENDED', 'profiles', userId);
      return null;
    });
  },

  reinstate: async (userId: string, actorId: string, actorName: string): Promise<ApiResponse<null>> => {
    return safeCall(async () => {
      const { error } = await supabase.from('profiles').update({ status: 'active' }).eq('id', userId);
      if (error) throw error;
      await supabase.from('policies').update({ status: 'active' }).eq('user_id', userId).eq('status', 'suspended');
      await addNotification(userId, 'Your OHIMS account has been reinstated. Coverage is now restored.', 'success');
      await writeAudit(actorId, actorName, 'MEMBER_REINSTATED', 'profiles', userId);
      return null;
    });
  },
};

// ── MEMBERS ────────────────────────────────────────────────────────────

export const membersApi = {
  list: async (): Promise<ApiResponse<unknown[]>> => {
    return safeCall(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          policies (
            id, status, plan_id, coverage_limit, remaining_coverage,
            start_date, end_date, premium_rate,
            plans ( name, premium_amount ),
            beneficiaries ( id, name, relationship, dob ),
            premiums ( id, amount, status, due_date, paid_date, receipt_number )
          )
        `)
        .eq('role', 'member')
        .order('created_at');
      if (error) throw error;
      return data ?? [];
    });
  },

  get: async (userId: string): Promise<ApiResponse<unknown>> => {
    return safeCall(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          policies (
            id, status, plan_id, coverage_limit, remaining_coverage,
            start_date, end_date, premium_rate,
            plans ( name, premium_amount ),
            beneficiaries ( id, name, relationship, dob ),
            premiums ( id, amount, status, due_date, paid_date, receipt_number )
          )
        `)
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data;
    });
  },

  addBeneficiary: async (
    policyId: string,
    ben: { name: string; relationship: string; dob: string },
    actorName: string
  ): Promise<ApiResponse<unknown>> => {
    return safeCall(async () => {
      const { data, error } = await supabase
        .from('beneficiaries')
        .insert({ policy_id: policyId, ...ben })
        .select()
        .single();
      if (error) throw error;
      await writeAudit(null, actorName, 'BENEFICIARY_ADDED', 'beneficiaries', (data as any).id);
      return data;
    });
  },

  deleteBeneficiary: async (benId: string, actorName: string): Promise<ApiResponse<null>> => {
    return safeCall(async () => {
      const { error } = await supabase.from('beneficiaries').delete().eq('id', benId);
      if (error) throw error;
      await writeAudit(null, actorName, 'BENEFICIARY_REMOVED', 'beneficiaries', benId);
      return null;
    });
  },

  updateProfile: async (userId: string, payload: Record<string, unknown>): Promise<ApiResponse<unknown>> => {
    return safeCall(async () => {
      const { data, error } = await supabase.from('profiles').update(payload).eq('id', userId).select().single();
      if (error) throw error;
      return data;
    });
  },
};

// ── POLICIES ───────────────────────────────────────────────────────────

export const policiesApi = {
  list: async (): Promise<ApiResponse<unknown[]>> => {
    return safeCall(async () => {
      const { data, error } = await supabase
        .from('policies')
        .select(`
          *,
          profiles ( name, email, national_id, phone ),
          plans ( name, premium_amount ),
          beneficiaries ( id, name, relationship, dob ),
          premiums ( id, amount, status, due_date, paid_date, receipt_number )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    });
  },

  updateStatus: async (
    policyId: string,
    status: string,
    actorId: string,
    actorName: string
  ): Promise<ApiResponse<unknown>> => {
    return safeCall(async () => {
      const { data, error } = await supabase
        .from('policies').update({ status }).eq('id', policyId).select().single();
      if (error) throw error;
      await writeAudit(actorId, actorName, `POLICY_${status.toUpperCase()}`, 'policies', policyId);
      const msgs: Record<string, string> = {
        suspended: `Your policy ${policyId} has been suspended. Please contact OHIMS support.`,
        active: `Your policy ${policyId} has been reactivated. Coverage is now restored.`,
        cancelled: `Your policy ${policyId} has been cancelled.`,
      };
      if ((data as any)?.user_id && msgs[status]) {
        await addNotification((data as any).user_id, msgs[status], status === 'active' ? 'success' : 'alert');
      }
      return data;
    });
  },

  renew: async (policyId: string, actorId: string, actorName: string): Promise<ApiResponse<unknown>> => {
    return safeCall(async () => {
      const newEnd = new Date();
      newEnd.setFullYear(newEnd.getFullYear() + 1);
      const { data, error } = await supabase
        .from('policies')
        .update({ end_date: newEnd.toISOString().split('T')[0], status: 'active' })
        .eq('id', policyId).select().single();
      if (error) throw error;

      const premDue = new Date();
      premDue.setDate(premDue.getDate() + 30);
      const paymentRef = uuidv4();
      await supabase.from('premiums').insert({
        policy_id: policyId, amount: (data as any).premium_rate, status: 'unpaid',
        due_date: premDue.toISOString().split('T')[0], payment_reference: paymentRef,
      });

      await writeAudit(actorId, actorName, 'POLICY_RENEWED', 'policies', policyId);
      if ((data as any)?.user_id) {
        await addNotification(
          (data as any).user_id,
          `Your policy ${policyId} has been renewed until ${newEnd.toISOString().split('T')[0]}.`,
          'success'
        );
      }
      return data;
    });
  },
};

// ── CLAIMS ─────────────────────────────────────────────────────────────

export const claimsApi = {
  list: async (filters?: { policy_id?: string; provider_id?: string; status?: string }): Promise<ApiResponse<unknown[]>> => {
    return safeCall(async () => {
      let q = supabase
        .from('claims')
        .select(`
          *,
          policies (
            id, user_id,
            profiles ( name, email ),
            plans ( name )
          ),
          providers ( id, name, type )
        `)
        .order('date_filed', { ascending: false });

      if (filters?.policy_id) q = q.eq('policy_id', filters.policy_id);
      if (filters?.provider_id) q = q.eq('provider_id', filters.provider_id);
      if (filters?.status) q = q.eq('status', filters.status);

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    });
  },

  /**
   * Submit a claim with idempotency guarantee.
   * A client-generated idempotency_ref prevents duplicate submissions on retry.
   */
  submit: async (payload: {
    policy_id: string;
    provider_id?: string;
    diagnosis: string;
    treatment: string;
    amount_claimed: number;
    notes?: string;
    actorId: string;
    actorName: string;
    /** Client-generated UUID for idempotency — generates one if not provided */
    idempotency_ref?: string;
  }): Promise<ApiResponse<unknown>> => {
    return safeCall(async () => {
      const { actorId, actorName, idempotency_ref, ...insertData } = payload;
      const ref = idempotency_ref || uuidv4();

      const { data: settings } = await supabase
        .from('system_settings').select('allow_auto_approval, low_claim_threshold').eq('id', 1).single();

      const autoApprove =
        settings?.allow_auto_approval &&
        insertData.amount_claimed <= (settings?.low_claim_threshold ?? 500000);

      const { data, error } = await supabase
        .from('claims')
        .insert({
          ...insertData,
          status: autoApprove ? 'approved' : 'submitted',
          amount_approved: autoApprove ? insertData.amount_claimed : 0,
          idempotency_ref: ref,
        })
        .select()
        .single();
      if (error) throw error;

      await writeAudit(actorId, actorName, 'CLAIM_SUBMITTED', 'claims', (data as any).id);

      const { data: pol } = await supabase.from('policies').select('user_id').eq('id', insertData.policy_id).single();
      if (pol?.user_id) {
        const msg = autoApprove
          ? `Your claim for ${insertData.diagnosis} (UGX ${insertData.amount_claimed.toLocaleString()}) was auto-approved.`
          : `Your claim for ${insertData.diagnosis} (UGX ${insertData.amount_claimed.toLocaleString()}) has been submitted and is under review.`;
        await addNotification(pol.user_id, msg, autoApprove ? 'success' : 'info');
      }

      return data;
    });
  },

  review: async (
    claimId: string,
    payload: { status: string; amount_approved: number; notes?: string },
    actorId: string,
    actorName: string
  ): Promise<ApiResponse<unknown>> => {
    return safeCall(async () => {
      const { data, error } = await supabase
        .from('claims')
        .update({ ...payload, reviewer_id: actorId })
        .eq('id', claimId)
        .select()
        .single();
      if (error) throw error;

      await writeAudit(actorId, actorName, `CLAIM_${payload.status.toUpperCase()}`, 'claims', claimId);

      const { data: pol } = await supabase.from('policies').select('user_id').eq('id', (data as any).policy_id).single();
      if (pol?.user_id) {
        const statusLabels: Record<string, string> = {
          approved: `approved for UGX ${payload.amount_approved.toLocaleString()}`,
          rejected: 'rejected',
          under_review: 'moved to Under Review',
        };
        await addNotification(
          pol.user_id,
          `Your claim ${claimId} has been ${statusLabels[payload.status] ?? payload.status}.`,
          payload.status === 'approved' ? 'success' : payload.status === 'rejected' ? 'alert' : 'info'
        );
      }
      return data;
    });
  },

  pay: async (claimId: string, actorId: string, actorName: string): Promise<ApiResponse<unknown>> => {
    return safeCall(async () => {
      const { data, error } = await supabase
        .from('claims').update({ status: 'paid' }).eq('id', claimId).select().single();
      if (error) throw error;

      await writeAudit(actorId, actorName, 'CLAIM_PAYMENT_ISSUED', 'claims', claimId);

      const { data: pol } = await supabase.from('policies').select('user_id').eq('id', (data as any).policy_id).single();
      if (pol?.user_id) {
        await addNotification(
          pol.user_id,
          `Payment for claim ${claimId} has been disbursed. Amount: UGX ${(data as any).amount_approved?.toLocaleString() ?? 0}.`,
          'success'
        );
      }
      return data;
    });
  },

  uploadDocument: async (claimId: string, file: File, actorId: string): Promise<ApiResponse<unknown>> => {
    return safeCall(async () => {
      const ext = file.name.split('.').pop();
      const path = `${actorId}/${claimId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('claim-documents').upload(path, file, { upsert: false });
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
      const { data, error } = await supabase
        .from('claim_documents')
        .insert({ claim_id: claimId, file_path: path, file_name: file.name, file_size: file.size })
        .select().single();
      if (error) throw error;
      return data;
    });
  },

  getDocuments: async (claimId: string): Promise<ApiResponse<unknown[]>> => {
    return safeCall(async () => {
      const { data, error } = await supabase
        .from('claim_documents').select('*').eq('claim_id', claimId).order('uploaded_at', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return [];
      const withUrls = await Promise.all(
        data.map(async (doc: any) => {
          const { data: urlData } = await supabase.storage
            .from('claim-documents').createSignedUrl(doc.file_path, 3600);
          return { ...doc, signed_url: urlData?.signedUrl ?? null };
        })
      );
      return withUrls;
    });
  },

  deleteDocument: async (docId: string, filePath: string): Promise<ApiResponse<null>> => {
    return safeCall(async () => {
      await supabase.storage.from('claim-documents').remove([filePath]);
      const { error } = await supabase.from('claim_documents').delete().eq('id', docId);
      if (error) throw error;
      return null;
    });
  },
};

// ── PREMIUMS ───────────────────────────────────────────────────────────

export const premiumsApi = {
  list: async (policyId?: string): Promise<ApiResponse<unknown[]>> => {
    return safeCall(async () => {
      let q = supabase
        .from('premiums')
        .select(`
          *,
          policies (
            id, user_id,
            profiles ( name, email ),
            plans ( name )
          )
        `)
        .order('due_date', { ascending: false });

      if (policyId) q = q.eq('policy_id', policyId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    });
  },

  pay: async (
    premiumId: string,
    actorId: string,
    actorName: string,
    paymentRef?: string
  ): Promise<ApiResponse<unknown>> => {
    return safeCall(async () => {
      const receipt = generateReceiptNumber();
      const ref = paymentRef || uuidv4();
      const { data, error } = await supabase
        .from('premiums')
        .update({ status: 'paid', paid_date: new Date().toISOString(), receipt_number: receipt, payment_reference: ref })
        .eq('id', premiumId)
        .select()
        .single();
      if (error) throw error;

      await writeAudit(actorId, actorName, 'PREMIUM_PAID', 'premiums', premiumId);

      const { data: pol } = await supabase.from('policies').select('user_id').eq('id', (data as any).policy_id).single();
      if (pol?.user_id) {
        await addNotification(
          pol.user_id,
          `Your premium payment of UGX ${(data as any).amount?.toLocaleString()} has been confirmed. Receipt: ${receipt}`,
          'success'
        );
      }
      return { ...(data as any), receipt_number: receipt };
    });
  },

  /**
   * Mobile money payment with explicit step simulation.
   * Uses a client-generated paymentRef so retries are idempotent.
   */
  payMobileMoney: async (
    premiumId: string,
    phone: string,
    network: 'mtn' | 'airtel',
    actorId: string,
    actorName: string,
    paymentRef?: string
  ): Promise<ApiResponse<{ receipt_number: string; amount: number; status: string }>> => {
    const cleaned = phone.replace(/\s/g, '');
    if (!/^(07|03)\d{8}$/.test(cleaned)) {
      return {
        data: null,
        error: `Invalid ${network.toUpperCase()} phone number. Use format 07XXXXXXXX.`,
      };
    }
    const ref = paymentRef || uuidv4();
    // Simulate mobile money gateway delay
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return premiumsApi.pay(premiumId, actorId, actorName, ref) as any;
  },

  sendReminders: async (actorId: string, actorName: string): Promise<ApiResponse<{ reminders_sent: number; per_item: Array<{ id: string; success: boolean; error?: string }> }>> => {
    return safeCall(async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + 7);

      const { data: overdue } = await supabase
        .from('premiums')
        .select('id, policy_id, amount, due_date, policies(user_id)')
        .eq('status', 'unpaid')
        .lte('due_date', cutoff.toISOString().split('T')[0]);

      let sent = 0;
      const perItem: Array<{ id: string; success: boolean; error?: string }> = [];

      if (overdue) {
        for (const prem of overdue) {
          const uid = (prem as any).policies?.user_id;
          if (uid) {
            try {
              await addNotification(
                uid,
                `Reminder: Your premium of UGX ${(prem as any).amount?.toLocaleString()} is due on ${(prem as any).due_date}. Please pay to keep your coverage active.`,
                'alert'
              );
              sent++;
              perItem.push({ id: prem.id, success: true });
            } catch (e) {
              perItem.push({ id: prem.id, success: false, error: e instanceof Error ? e.message : 'Unknown error' });
            }
          }
        }
      }

      await writeAudit(actorId, actorName, 'PREMIUM_REMINDERS_SENT', 'premiums', 'bulk');
      return { reminders_sent: sent, per_item: perItem };
    });
  },
};

// ── PROVIDERS ──────────────────────────────────────────────────────────

export const providersApi = {
  list: async (): Promise<ApiResponse<unknown[]>> => {
    return safeCall(async () => {
      const { data, error } = await supabase.from('providers').select('*').order('name');
      if (error) throw error;
      return data ?? [];
    });
  },

  create: async (payload: Record<string, unknown>, actorId: string, actorName: string): Promise<ApiResponse<unknown>> => {
    return safeCall(async () => {
      const { data, error } = await supabase.from('providers').insert(payload).select().single();
      if (error) throw error;
      await writeAudit(actorId, actorName, 'PROVIDER_REGISTERED', 'providers', (data as any).id);
      return data;
    });
  },

  update: async (id: string, payload: Record<string, unknown>, actorId: string, actorName: string): Promise<ApiResponse<unknown>> => {
    return safeCall(async () => {
      const { data, error } = await supabase.from('providers').update(payload).eq('id', id).select().single();
      if (error) throw error;
      await writeAudit(actorId, actorName, 'PROVIDER_UPDATED', 'providers', id);
      return data;
    });
  },

  /**
   * NIN eligibility lookup — every call is audit-logged (read access, not just writes).
   */
  checkEligibility: async (nationalId: string, actorId?: string, actorName?: string): Promise<ApiResponse<unknown>> => {
    return safeCall(async () => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          id, name, email, phone, dob, gender, national_id, photo,
          policies (
            id, status, plan_id, coverage_limit, remaining_coverage,
            start_date, end_date, premium_rate,
            plans ( name, description, benefits, exclusions ),
            beneficiaries ( id, name, relationship )
          )
        `)
        .eq('national_id', nationalId.trim())
        .single();

      // Audit every lookup
      await writeAudit(
        actorId ?? null,
        actorName ?? 'SYSTEM',
        'NIN_ELIGIBILITY_LOOKUP',
        'profiles',
        nationalId.trim()
      );

      if (error || !profile) return null;

      const policies: any[] = (profile as any).policies ?? [];
      const active = policies.find((p: any) => p.status === 'active');
      return {
        member: {
          id: profile.id, name: (profile as any).name, email: (profile as any).email,
          phone: (profile as any).phone, dob: (profile as any).dob, gender: (profile as any).gender,
          national_id: (profile as any).national_id, photo: (profile as any).photo,
        },
        policy: active ?? null,
        is_eligible: !!active,
        beneficiaries: active?.beneficiaries ?? [],
      };
    });
  },
};

// ── NOTIFICATIONS ──────────────────────────────────────────────────────

export const notificationsApi = {
  list: async (userId: string): Promise<ApiResponse<unknown[]>> => {
    return safeCall(async () => {
      const { data, error } = await supabase
        .from('notifications').select('*').eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    });
  },

  markRead: async (id: string): Promise<ApiResponse<null>> => {
    return safeCall(async () => {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
      if (error) throw error;
      return null;
    });
  },

  clearAll: async (userId: string): Promise<ApiResponse<null>> => {
    return safeCall(async () => {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
      if (error) throw error;
      return null;
    });
  },
};

// ── AUDIT LOGS ─────────────────────────────────────────────────────────

export const auditApi = {
  list: async (limit = 200): Promise<ApiResponse<unknown[]>> => {
    return safeCall(async () => {
      const { data, error } = await supabase
        .from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(limit);
      if (error) throw error;
      return data ?? [];
    });
  },
};

// ── SYSTEM SETTINGS ────────────────────────────────────────────────────

export const settingsApi = {
  get: async (): Promise<ApiResponse<{
    allowAutoApprovalOfLowClaims: boolean;
    lowClaimThreshold: number;
    autoSlaDays: number;
    requireProviderAccreditation: boolean;
    allowSelfClaimSubmission: boolean;
  }>> => {
    return safeCall(async () => {
      const { data, error } = await supabase.from('system_settings').select('*').eq('id', 1).single();
      if (error) throw error;
      return {
        allowAutoApprovalOfLowClaims: data.allow_auto_approval,
        lowClaimThreshold: data.low_claim_threshold,
        autoSlaDays: data.auto_sla_days,
        requireProviderAccreditation: data.require_accreditation,
        allowSelfClaimSubmission: data.allow_self_submit,
      };
    });
  },

  update: async (
    payload: {
      allowAutoApprovalOfLowClaims: boolean;
      lowClaimThreshold: number;
      autoSlaDays: number;
      requireProviderAccreditation: boolean;
      allowSelfClaimSubmission: boolean;
    },
    actorId: string,
    actorName: string
  ): Promise<ApiResponse<typeof payload>> => {
    return safeCall(async () => {
      const { error } = await supabase.from('system_settings').update({
        allow_auto_approval: payload.allowAutoApprovalOfLowClaims,
        low_claim_threshold: payload.lowClaimThreshold,
        auto_sla_days: payload.autoSlaDays,
        require_accreditation: payload.requireProviderAccreditation,
        allow_self_submit: payload.allowSelfClaimSubmission,
      }).eq('id', 1);
      if (error) throw error;
      await writeAudit(actorId, actorName, 'SETTINGS_UPDATED', 'system_settings', '1');
      return payload;
    });
  },
};

// ── ANALYTICS ──────────────────────────────────────────────────────────

export const analyticsApi = {
  get: async (): Promise<ApiResponse<unknown>> => {
    return safeCall(async () => {
      const [
        { count: totalMembers },
        { count: activePolicies },
        { count: claimsTotal },
        { data: claimAmounts },
        { data: premiumAmounts },
        { count: pendingClaims },
        { count: totalProviders },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'member'),
        supabase.from('policies').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('claims').select('*', { count: 'exact', head: true }),
        supabase.from('claims').select('amount_approved').in('status', ['approved', 'paid']),
        supabase.from('premiums').select('amount').eq('status', 'paid'),
        supabase.from('claims').select('*', { count: 'exact', head: true }).in('status', ['submitted', 'under_review']),
        supabase.from('providers').select('*', { count: 'exact', head: true }).eq('accreditation_status', 'accredited'),
      ]);

      const totalClaimsPaid = (claimAmounts ?? []).reduce((s: number, r: any) => s + (r.amount_approved || 0), 0);
      const totalPremiumsCollected = (premiumAmounts ?? []).reduce((s: number, r: any) => s + (r.amount || 0), 0);

      const { data: statusData } = await supabase.from('claims').select('status');
      const statusCounts: Record<string, number> = {};
      (statusData ?? []).forEach((r: any) => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });

      const months: string[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(d.toISOString().slice(0, 7));
      }

      const monthlyTrends = await Promise.all(
        months.map(async (month) => {
          const start = `${month}-01`;
          const end = new Date(month + '-01');
          end.setMonth(end.getMonth() + 1);
          const endStr = end.toISOString().split('T')[0];
          const [{ count: claims }, { data: premData }] = await Promise.all([
            supabase.from('claims').select('*', { count: 'exact', head: true }).gte('date_filed', start).lt('date_filed', endStr),
            supabase.from('premiums').select('amount').eq('status', 'paid').gte('paid_date', start).lt('paid_date', endStr),
          ]);
          const revenue = (premData ?? []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
          return {
            month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            claims: claims ?? 0,
            revenue,
          };
        })
      );

      return {
        totalMembers: totalMembers ?? 0,
        activePolicies: activePolicies ?? 0,
        claimsTotal: claimsTotal ?? 0,
        totalClaimsPaid,
        totalPremiumsCollected,
        pendingClaims: pendingClaims ?? 0,
        accreditedProviders: totalProviders ?? 0,
        claimStatusBreakdown: statusCounts,
        monthlyTrends,
      };
    });
  },
};

// ── AI CHAT ────────────────────────────────────────────────────────────

export const aiApi = {
  chat: async (message: string, history: Array<{ role: string; content: string }>): Promise<ApiResponse<string>> => {
    return safeCall(async () => {
      const { data, error } = await supabase.functions.invoke('ai-chat', { body: { message, history } });
      if (error) throw error;
      return data.reply as string;
    }).then((result) => {
      if (result.error) {
        // Graceful offline fallback
        return {
          data: `I'm currently operating in offline mode. Your message has been noted. For live AI assistance, ensure the Supabase Edge Function "ai-chat" is deployed with your GEMINI_API_KEY set.`,
          error: null,
        };
      }
      return result;
    });
  },
};
