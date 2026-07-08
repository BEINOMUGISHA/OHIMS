/**
 * src/lib/api.ts
 * ──────────────────────────────────────────────────────────────────────
 * OHIMS Uganda — Supabase-native API layer.
 * Replaces all Express /api/* routes with direct Supabase client calls.
 * All data shapes are identical to the previous Express responses so
 * components need ZERO JSX changes — only their fetch() calls swap out.
 * ──────────────────────────────────────────────────────────────────────
 */

import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

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
   * Register a new member.
   * Creates a Supabase Auth user then upserts profile + policy + premium.
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
  }) => {
    const {
      name, email, password, phone, national_id,
      dob, gender, address, selected_plan_id, premium_frequency,
    } = payload;

    // 1. Create Supabase Auth user, passing all onboarding details in metadata options
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'member',
          phone,
          national_id,
          dob,
          gender,
          address,
          selected_plan_id,
          premium_frequency,
        }
      },
    });
    if (authErr) throw new Error(authErr.message);
    const userId = authData.user!.id;

    // 2. Wait a brief moment to ensure trigger fn_handle_new_user completes execution
    await new Promise(resolve => setTimeout(resolve, 600));

    // 3. Return the full profile (created automatically by the secure database trigger)
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    return { user: profile || { id: userId, name, email, role: 'member' } };
  },

  /**
   * Sign in with email + password via Supabase Auth.
   * Returns the user profile; session is stored automatically.
   */
  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    const userId = data.user.id;
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (pErr || !profile) throw new Error('Profile not found');

    await writeAudit(userId, profile.name, 'USER_LOGIN', 'profiles', userId);
    // token = user id (used by App.tsx to restore session on reload)
    return { token: userId, user: profile };
  },

  /** Restore session from stored token (user id). */
  getMe: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    return profile ?? null;
  },

  /** Sign out and clear local session. */
  logout: async () => {
    await supabase.auth.signOut();
  },

  /** Reset password — updates Supabase Auth password. */
  resetPassword: async (email: string, newPassword: string) => {
    // Find profile to verify email exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('email', email)
      .single();
    if (!profile) throw new Error('No account found with that email address.');

    // Use Supabase admin updateUser via session (requires user to be signed in).
    // For a demo reset flow we update via auth API:
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);

    await writeAudit(profile.id, profile.name, 'PASSWORD_RESET', 'profiles', profile.id);
    return { message: 'Password reset successful! You can now sign in with your new password.' };
  },
};

// ── PLANS ──────────────────────────────────────────────────────────────

export const plansApi = {
  list: async () => {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('premium_amount', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  create: async (payload: Record<string, unknown>, actorName: string) => {
    const { data, error } = await supabase
      .from('plans')
      .insert({ ...payload, id: `plan-${uuidv4().slice(0, 8)}` })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(null, actorName, 'PLAN_CREATED', 'plans', data.id);
    return data;
  },

  update: async (id: string, payload: Record<string, unknown>, actorName: string) => {
    const { data, error } = await supabase
      .from('plans')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(null, actorName, 'PLAN_UPDATED', 'plans', id);
    return data;
  },
};

// ── USERS (sandbox switcher) ───────────────────────────────────────────

export const usersApi = {
  list: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, role, phone, created_at')
      .order('created_at');
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};

// ── MEMBERS ────────────────────────────────────────────────────────────

export const membersApi = {
  /** Returns profiles joined with their active policy + plan details. */
  list: async () => {
    const { data: profiles, error } = await supabase
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
    if (error) throw new Error(error.message);
    return profiles ?? [];
  },

  get: async (userId: string) => {
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
    if (error) throw new Error(error.message);
    return data;
  },

  addBeneficiary: async (
    policyId: string,
    ben: { name: string; relationship: string; dob: string },
    actorName: string
  ) => {
    const { data, error } = await supabase
      .from('beneficiaries')
      .insert({ policy_id: policyId, ...ben })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(null, actorName, 'BENEFICIARY_ADDED', 'beneficiaries', data.id);
    return data;
  },

  deleteBeneficiary: async (benId: string, actorName: string) => {
    const { error } = await supabase.from('beneficiaries').delete().eq('id', benId);
    if (error) throw new Error(error.message);
    await writeAudit(null, actorName, 'BENEFICIARY_REMOVED', 'beneficiaries', benId);
  },
};

// ── POLICIES ───────────────────────────────────────────────────────────

export const policiesApi = {
  list: async () => {
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
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  updateStatus: async (
    policyId: string,
    status: string,
    actorId: string,
    actorName: string
  ) => {
    const { data, error } = await supabase
      .from('policies')
      .update({ status })
      .eq('id', policyId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(actorId, actorName, `POLICY_${status.toUpperCase()}`, 'policies', policyId);

    // Notify the member
    if (data?.user_id) {
      const msgs: Record<string, string> = {
        suspended: `Your policy ${policyId} has been suspended. Please contact OHIMS support.`,
        active: `Your policy ${policyId} has been reactivated. Coverage is now restored.`,
        cancelled: `Your policy ${policyId} has been cancelled.`,
      };
      if (msgs[status]) {
        await addNotification(data.user_id, msgs[status], status === 'active' ? 'success' : 'alert');
      }
    }
    return data;
  },

  renew: async (policyId: string, actorId: string, actorName: string) => {
    // Extend end_date by 1 year from today
    const newEnd = new Date();
    newEnd.setFullYear(newEnd.getFullYear() + 1);

    const { data, error } = await supabase
      .from('policies')
      .update({ end_date: newEnd.toISOString().split('T')[0], status: 'active' })
      .eq('id', policyId)
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Create a new premium invoice
    const premDue = new Date();
    premDue.setDate(premDue.getDate() + 30);
    await supabase.from('premiums').insert({
      policy_id: policyId,
      amount: data.premium_rate,
      status: 'unpaid',
      due_date: premDue.toISOString().split('T')[0],
    });

    await writeAudit(actorId, actorName, 'POLICY_RENEWED', 'policies', policyId);
    if (data?.user_id) {
      await addNotification(
        data.user_id,
        `Your policy ${policyId} has been renewed until ${newEnd.toISOString().split('T')[0]}.`,
        'success'
      );
    }
    return data;
  },
};

// ── CLAIMS ─────────────────────────────────────────────────────────────

export const claimsApi = {
  list: async (filters?: { policy_id?: string; provider_id?: string; status?: string }) => {
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
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  submit: async (payload: {
    policy_id: string;
    provider_id?: string;
    diagnosis: string;
    treatment: string;
    amount_claimed: number;
    notes?: string;
    actorId: string;
    actorName: string;
  }) => {
    const { actorId, actorName, ...insertData } = payload;

    // Auto-approval check
    const { data: settings } = await supabase
      .from('system_settings')
      .select('allow_auto_approval, low_claim_threshold')
      .eq('id', 1)
      .single();

    const autoApprove =
      settings?.allow_auto_approval &&
      insertData.amount_claimed <= (settings?.low_claim_threshold ?? 500000);

    const { data, error } = await supabase
      .from('claims')
      .insert({
        ...insertData,
        status: autoApprove ? 'approved' : 'submitted',
        amount_approved: autoApprove ? insertData.amount_claimed : 0,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await writeAudit(actorId, actorName, 'CLAIM_SUBMITTED', 'claims', data.id);

    // Notify member
    const { data: pol } = await supabase
      .from('policies')
      .select('user_id')
      .eq('id', insertData.policy_id)
      .single();

    if (pol?.user_id) {
      const msg = autoApprove
        ? `Your claim for ${insertData.diagnosis} (UGX ${insertData.amount_claimed.toLocaleString()}) was auto-approved.`
        : `Your claim for ${insertData.diagnosis} (UGX ${insertData.amount_claimed.toLocaleString()}) has been submitted and is under review.`;
      await addNotification(pol.user_id, msg, autoApprove ? 'success' : 'info');
    }

    return data;
  },

  review: async (
    claimId: string,
    payload: { status: string; amount_approved: number; notes?: string },
    actorId: string,
    actorName: string
  ) => {
    const { data, error } = await supabase
      .from('claims')
      .update({ ...payload, reviewer_id: actorId })
      .eq('id', claimId)
      .select()
      .single();
    if (error) throw new Error(error.message);

    await writeAudit(actorId, actorName, `CLAIM_${payload.status.toUpperCase()}`, 'claims', claimId);

    // Notify member
    const { data: pol } = await supabase
      .from('policies')
      .select('user_id')
      .eq('id', data.policy_id)
      .single();

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
  },

  pay: async (claimId: string, actorId: string, actorName: string) => {
    const { data, error } = await supabase
      .from('claims')
      .update({ status: 'paid' })
      .eq('id', claimId)
      .select()
      .single();
    if (error) throw new Error(error.message);

    await writeAudit(actorId, actorName, 'CLAIM_PAYMENT_ISSUED', 'claims', claimId);

    const { data: pol } = await supabase
      .from('policies')
      .select('user_id')
      .eq('id', data.policy_id)
      .single();

    if (pol?.user_id) {
      await addNotification(
        pol.user_id,
        `Payment for claim ${claimId} has been disbursed. Amount: UGX ${data.amount_approved?.toLocaleString() ?? 0}.`,
        'success'
      );
    }
    return data;
  },
};

// ── PREMIUMS ───────────────────────────────────────────────────────────

export const premiumsApi = {
  list: async (policyId?: string) => {
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
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  pay: async (premiumId: string, actorId: string, actorName: string) => {
    const receipt = generateReceiptNumber();
    const { data, error } = await supabase
      .from('premiums')
      .update({ status: 'paid', paid_date: new Date().toISOString(), receipt_number: receipt })
      .eq('id', premiumId)
      .select()
      .single();
    if (error) throw new Error(error.message);

    await writeAudit(actorId, actorName, 'PREMIUM_PAID', 'premiums', premiumId);

    // Notify member
    const { data: pol } = await supabase
      .from('policies')
      .select('user_id')
      .eq('id', data.policy_id)
      .single();

    if (pol?.user_id) {
      await addNotification(
        pol.user_id,
        `Your premium payment of UGX ${data.amount?.toLocaleString()} has been confirmed. Receipt: ${receipt}`,
        'success'
      );
    }
    return { ...data, receipt_number: receipt };
  },

  sendReminders: async (actorId: string, actorName: string) => {
    // Find all unpaid premiums due within next 7 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 7);

    const { data: overdue } = await supabase
      .from('premiums')
      .select('id, policy_id, amount, due_date, policies(user_id)')
      .eq('status', 'unpaid')
      .lte('due_date', cutoff.toISOString().split('T')[0]);

    let sent = 0;
    if (overdue) {
      for (const prem of overdue) {
        const uid = (prem as any).policies?.user_id;
        if (uid) {
          await addNotification(
            uid,
            `Reminder: Your premium of UGX ${prem.amount?.toLocaleString()} is due on ${prem.due_date}. Please pay to keep your coverage active.`,
            'alert'
          );
          sent++;
        }
      }
    }

    await writeAudit(actorId, actorName, 'PREMIUM_REMINDERS_SENT', 'premiums', 'bulk');
    return { reminders_sent: sent };
  },
};

// ── PROVIDERS ──────────────────────────────────────────────────────────

export const providersApi = {
  list: async () => {
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .order('name');
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  create: async (payload: Record<string, unknown>, actorId: string, actorName: string) => {
    const { data, error } = await supabase
      .from('providers')
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(actorId, actorName, 'PROVIDER_REGISTERED', 'providers', data.id);
    return data;
  },

  update: async (id: string, payload: Record<string, unknown>, actorId: string, actorName: string) => {
    const { data, error } = await supabase
      .from('providers')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(actorId, actorName, 'PROVIDER_UPDATED', 'providers', id);
    return data;
  },
};

// ── NOTIFICATIONS ──────────────────────────────────────────────────────

export const notificationsApi = {
  list: async (userId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  markRead: async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  clearAll: async (userId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  },
};

// ── AUDIT LOGS ─────────────────────────────────────────────────────────

export const auditApi = {
  list: async (limit = 200) => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};

// ── SYSTEM SETTINGS ────────────────────────────────────────────────────

export const settingsApi = {
  get: async () => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) throw new Error(error.message);
    // Map DB columns to the shape components expect
    return {
      allowAutoApprovalOfLowClaims: data.allow_auto_approval,
      lowClaimThreshold: data.low_claim_threshold,
      autoSlaDays: data.auto_sla_days,
      requireProviderAccreditation: data.require_accreditation,
      allowSelfClaimSubmission: data.allow_self_submit,
    };
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
  ) => {
    const { error } = await supabase.from('system_settings').update({
      allow_auto_approval: payload.allowAutoApprovalOfLowClaims,
      low_claim_threshold: payload.lowClaimThreshold,
      auto_sla_days: payload.autoSlaDays,
      require_accreditation: payload.requireProviderAccreditation,
      allow_self_submit: payload.allowSelfClaimSubmission,
    }).eq('id', 1);
    if (error) throw new Error(error.message);
    await writeAudit(actorId, actorName, 'SETTINGS_UPDATED', 'system_settings', '1');
    return payload;
  },
};

// ── ANALYTICS ──────────────────────────────────────────────────────────

export const analyticsApi = {
  get: async () => {
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

    // Claims by status
    const { data: statusData } = await supabase
      .from('claims')
      .select('status');
    const statusCounts: Record<string, number> = {};
    (statusData ?? []).forEach((r: any) => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });

    // Monthly trends (last 6 months)
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
          supabase.from('claims').select('*', { count: 'exact', head: true })
            .gte('date_filed', start).lt('date_filed', endStr),
          supabase.from('premiums').select('amount').eq('status', 'paid')
            .gte('paid_date', start).lt('paid_date', endStr),
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
  },
};

// ── AI CHAT ────────────────────────────────────────────────────────────

export const aiApi = {
  /**
   * Call the Supabase Edge Function 'ai-chat' which proxies the Gemini API.
   * Falls back to a helpful offline message if the function is unavailable.
   */
  chat: async (message: string, history: Array<{ role: string; content: string }>) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message, history },
      });
      if (error) throw error;
      return data.reply as string;
    } catch {
      // Graceful offline fallback
      return `I'm currently operating in offline mode. Your message "${message}" has been noted. For live AI assistance, ensure the Supabase Edge Function "ai-chat" is deployed with your GEMINI_API_KEY set.`;
    }
  },
};
