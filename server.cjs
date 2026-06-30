var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_config = require("dotenv/config");
var import_genai = require("@google/genai");
var import_vite = require("vite");
var import_supabase_js = require("@supabase/supabase-js");
var SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://klcfdbsvlxfenzbzltvq.supabase.co";
var SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsY2ZkYnN2bHhmZW56YnpsdHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MTYxOTIsImV4cCI6MjA5ODM5MjE5Mn0.fvRTEg_6G-XJEo2QG_uj0sKqAUsJN7N_qYDWDOExfUY";
var db = (0, import_supabase_js.createClient)(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});
async function writeAudit(userId, userName, action, entity, entityId) {
  await db.from("audit_logs").insert({
    user_id: userId,
    user_name: userName,
    action,
    entity,
    entity_id: entityId
  });
}
async function addNotification(userId, message, type = "info") {
  await db.from("notifications").insert({
    user_id: userId,
    message,
    type,
    read: false,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  });
}
function hashPassword(pw) {
  let hash = 0;
  for (let i = 0; i < pw.length; i++) {
    const char = pw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "10mb" }));
  const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: "Authorization header required (Bearer <user_id>)" });
      return;
    }
    const token = authHeader.replace(/^Bearer\s+/, "").trim();
    const { data: profile, error } = await db.from("profiles").select("*").or(`id.eq.${token},email.ilike.${token}`).single();
    if (error || !profile) {
      res.status(401).json({ error: "User session invalid or expired" });
      return;
    }
    req.user = profile;
    next();
  };
  app.post("/api/auth/register", async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        phone,
        national_id,
        dob,
        gender,
        address,
        selected_plan_id,
        premium_frequency
      } = req.body;
      if (!name || !email || !password || !phone || !national_id || !dob || !gender || !address || !selected_plan_id) {
        res.status(400).json({ error: "Missing required registration fields" });
        return;
      }
      const { data: existingEmail } = await db.from("profiles").select("id").ilike("email", email).maybeSingle();
      if (existingEmail) {
        res.status(400).json({ error: "An account with this email already exists" });
        return;
      }
      const { data: existingNID } = await db.from("profiles").select("id").ilike("national_id", national_id).maybeSingle();
      if (existingNID) {
        res.status(400).json({ error: "This National ID is already registered" });
        return;
      }
      const { data: targetPlan } = await db.from("plans").select("*").eq("id", selected_plan_id).single();
      if (!targetPlan) {
        res.status(400).json({ error: "Select a valid insurance plan" });
        return;
      }
      const userId = crypto.randomUUID();
      const { error: profileError } = await db.from("profiles").insert({
        id: userId,
        email: email.toLowerCase(),
        name,
        role: "member",
        national_id: national_id.toUpperCase(),
        dob,
        gender,
        address,
        phone,
        password_hash: hashPassword(password)
      });
      if (profileError) {
        res.status(500).json({ error: profileError.message });
        return;
      }
      const policyId = `POL-${(/* @__PURE__ */ new Date()).getFullYear()}-${Date.now().toString().slice(-6)}`;
      const start = /* @__PURE__ */ new Date();
      const end = /* @__PURE__ */ new Date();
      end.setFullYear(start.getFullYear() + 1);
      const { data: newPolicy, error: policyError } = await db.from("policies").insert({
        id: policyId,
        user_id: userId,
        plan_id: selected_plan_id,
        status: "active",
        start_date: start.toISOString().split("T")[0],
        end_date: end.toISOString().split("T")[0],
        premium_rate: targetPlan.premium_amount,
        coverage_limit: targetPlan.coverage_limit,
        remaining_coverage: targetPlan.coverage_limit
      }).select().single();
      if (policyError) {
        res.status(500).json({ error: policyError.message });
        return;
      }
      const freq = premium_frequency || "monthly";
      const cost = freq === "annually" ? targetPlan.premium_amount * 12 : freq === "quarterly" ? targetPlan.premium_amount * 3 : targetPlan.premium_amount;
      await db.from("premiums").insert({
        policy_id: policyId,
        amount: cost,
        due_date: start.toISOString().split("T")[0],
        status: "unpaid"
      });
      await writeAudit(userId, name, "REGISTER_ONBOARDING", "profiles", userId);
      await writeAudit(userId, name, "ASSIGNED_INSURANCE_POLICY", "policies", policyId);
      await addNotification(userId, `Welcome to OHIMS, ${name}! Registered under ${targetPlan.name} (Policy: ${policyId}).`, "success");
      res.status(201).json({
        message: "Member registered successfully!",
        user: { id: userId, name, email: email.toLowerCase(), role: "member", phone },
        policy: newPolicy
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }
      const { data: profile } = await db.from("profiles").select("*").ilike("email", email.trim()).single();
      if (!profile) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      if (profile.password_hash && profile.password_hash !== hashPassword(password)) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      await writeAudit(profile.id, profile.name, "USER_LOGIN", "profiles", profile.id);
      res.json({
        token: profile.id,
        user: { id: profile.id, name: profile.name, email: profile.email, role: profile.role, phone: profile.phone }
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/users", async (_req, res) => {
    try {
      const { data } = await db.from("profiles").select("id,name,email,role,phone").order("created_at");
      res.json(data || []);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/auth/me", authenticateUser, async (req, res) => {
    try {
      const user = req.user;
      const { data: policy } = await db.from("policies").select("*, plans(*)").eq("user_id", user.id).eq("status", "active").maybeSingle();
      res.json({ user, policy });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, newPassword } = req.body;
      if (!email || !newPassword) {
        res.status(400).json({ error: "Email and new password required" });
        return;
      }
      const { data: profile } = await db.from("profiles").select("*").ilike("email", email).single();
      if (!profile) {
        res.status(404).json({ error: "No account found with that email" });
        return;
      }
      await db.from("profiles").update({ password_hash: hashPassword(newPassword) }).eq("id", profile.id);
      await writeAudit(profile.id, profile.name, "PASSWORD_RESET", "profiles", profile.id);
      await addNotification(profile.id, "Your password was reset. Contact support if this was not you.", "info");
      res.json({ message: "Password reset successfully." });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/auth/verify-email", authenticateUser, async (req, res) => {
    try {
      const user = req.user;
      await writeAudit(user.id, user.name, "EMAIL_VERIFIED", "profiles", user.id);
      await addNotification(user.id, `Email ${user.email} verified successfully.`, "success");
      res.json({ message: "Email verified.", email: user.email });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/members", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      if (!["admin", "staff"].includes(requester.role)) {
        res.status(403).json({ error: "Staff privileges required" });
        return;
      }
      const { data: members } = await db.from("profiles").select("*, policies(id, plan_id, status, end_date, plans(name))").eq("role", "member");
      const mapped = (members || []).map((m) => {
        const pol = m.policies?.[0];
        return {
          ...m,
          active_policy: pol ? {
            id: pol.id,
            plan_name: pol.plans?.name,
            plan_id: pol.plan_id,
            status: pol.status,
            end_date: pol.end_date
          } : null
        };
      });
      res.json(mapped);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/members/:id", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      const { id } = req.params;
      const { data: member } = await db.from("profiles").select("*").eq("id", id).single();
      if (!member) {
        res.status(404).json({ error: "Member not found" });
        return;
      }
      if (requester.role === "member" && member.id !== requester.id) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
      const { data: policies } = await db.from("policies").select("*").eq("user_id", id);
      const policyIds = (policies || []).map((p) => p.id);
      const safeIds = policyIds.length ? policyIds : [""];
      const [{ data: beneficiaries }, { data: premiums }, { data: claims }] = await Promise.all([
        db.from("beneficiaries").select("*").in("policy_id", safeIds),
        db.from("premiums").select("*").in("policy_id", safeIds),
        db.from("claims").select("*").in("policy_id", safeIds)
      ]);
      res.json({
        member,
        policies: policies || [],
        beneficiaries: beneficiaries || [],
        premiums: premiums || [],
        claims: claims || []
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/members/:id", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      const { id } = req.params;
      if (requester.role === "member" && id !== requester.id) {
        res.status(403).json({ error: "Unauthorised profile edit" });
        return;
      }
      const { national_id, dob, gender, address, phone, avatar_url } = req.body;
      const updates = {};
      if (national_id) updates.national_id = national_id.toUpperCase();
      if (dob) updates.dob = dob;
      if (gender) updates.gender = gender;
      if (address) updates.address = address;
      if (phone) updates.phone = phone;
      if (avatar_url) updates.avatar_url = avatar_url;
      const { data: updated, error } = await db.from("profiles").update(updates).eq("id", id).select().single();
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      await writeAudit(requester.id, requester.name, "UPDATE_MEMBER_PROFILE", "profiles", id);
      res.json({ message: "Profile updated", member: updated });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/members/:id/beneficiary", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      const { id } = req.params;
      const { name, relationship, dob, national_id } = req.body;
      if (!name || !relationship || !dob) {
        res.status(400).json({ error: "name, relationship, dob required" });
        return;
      }
      if (requester.role === "member" && id !== requester.id) {
        res.status(403).json({ error: "Unauthorised" });
        return;
      }
      const { data: policy } = await db.from("policies").select("id").eq("user_id", id).eq("status", "active").maybeSingle();
      if (!policy) {
        res.status(400).json({ error: "No active policy found" });
        return;
      }
      const { data: newBen, error } = await db.from("beneficiaries").insert({
        policy_id: policy.id,
        name,
        relationship,
        dob,
        national_id: national_id || null
      }).select().single();
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      await writeAudit(requester.id, requester.name, "ADDED_BENEFICIARY", "beneficiaries", newBen.id);
      res.status(201).json({ message: "Beneficiary registered!", beneficiary: newBen });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/members/:id/beneficiary/:benId", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      const { id, benId } = req.params;
      if (requester.role === "member" && id !== requester.id) {
        res.status(403).json({ error: "Unauthorised" });
        return;
      }
      const { data: ben } = await db.from("beneficiaries").select("*").eq("id", benId).single();
      if (!ben) {
        res.status(404).json({ error: "Beneficiary not found" });
        return;
      }
      await db.from("beneficiaries").delete().eq("id", benId);
      await writeAudit(requester.id, requester.name, "DELETED_BENEFICIARY", "beneficiaries", benId);
      res.json({ message: `Beneficiary ${ben.name} removed.` });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/plans", async (_req, res) => {
    try {
      const { data } = await db.from("plans").select("*").order("premium_amount");
      res.json(data || []);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/plans", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      if (!["admin", "staff"].includes(requester.role)) {
        res.status(403).json({ error: "Admin/Staff only" });
        return;
      }
      const { name, description, premium_amount, coverage_limit, benefits, exclusions } = req.body;
      if (!name || !description || premium_amount === void 0 || !coverage_limit) {
        res.status(400).json({ error: "Missing plan fields" });
        return;
      }
      const planId = `plan-${Date.now()}`;
      const { data: plan, error } = await db.from("plans").insert({
        id: planId,
        name,
        description,
        premium_amount: Number(premium_amount),
        coverage_limit: Number(coverage_limit),
        benefits: benefits || [],
        exclusions: exclusions || [],
        status: "active"
      }).select().single();
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      await writeAudit(requester.id, requester.name, "CREATED_INSURANCE_PLAN", "plans", planId);
      res.status(201).json({ message: "Plan created!", plan });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/plans/:id", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      if (!["admin", "staff"].includes(requester.role)) {
        res.status(403).json({ error: "Admin/Staff only" });
        return;
      }
      const { id } = req.params;
      const { name, description, premium_amount, coverage_limit, benefits, exclusions, status } = req.body;
      const updates = {};
      if (name) updates.name = name;
      if (description) updates.description = description;
      if (premium_amount !== void 0) updates.premium_amount = Number(premium_amount);
      if (coverage_limit !== void 0) updates.coverage_limit = Number(coverage_limit);
      if (benefits) updates.benefits = benefits;
      if (exclusions) updates.exclusions = exclusions;
      if (status) updates.status = status;
      const { data: plan, error } = await db.from("plans").update(updates).eq("id", id).select().single();
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      await writeAudit(requester.id, requester.name, "UPDATED_INSURANCE_PLAN", "plans", id);
      res.json({ message: "Plan updated", plan });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/policies", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      if (!["admin", "staff"].includes(requester.role)) {
        res.status(403).json({ error: "Staff only" });
        return;
      }
      const { data } = await db.from("policies").select("*, profiles(name,email,national_id), plans(name,coverage_limit)").order("created_at", { ascending: false });
      const mapped = (data || []).map((p) => ({
        ...p,
        holder_name: p.profiles?.name || "Unknown",
        holder_email: p.profiles?.email || "",
        plan_name: p.plans?.name || "Unknown",
        plan_limit: p.plans?.coverage_limit || 0
      }));
      res.json(mapped);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/policies/:id/status", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      if (!["admin", "staff"].includes(requester.role)) {
        res.status(403).json({ error: "Staff only" });
        return;
      }
      const { id } = req.params;
      const { status } = req.body;
      if (!status) {
        res.status(400).json({ error: "Status required" });
        return;
      }
      const { data: existing } = await db.from("policies").select("status,user_id").eq("id", id).single();
      if (!existing) {
        res.status(404).json({ error: "Policy not found" });
        return;
      }
      const { data: policy } = await db.from("policies").update({ status }).eq("id", id).select().single();
      await writeAudit(requester.id, requester.name, `POLICY_STATUS_${(existing.status || "").toUpperCase()}_TO_${status.toUpperCase()}`, "policies", id);
      await addNotification(existing.user_id, `Policy status changed to ${status.toUpperCase()}.`, status === "active" ? "success" : "alert");
      res.json({ message: `Policy set to ${status}`, policy });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/policies/:id/renew", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      const { id } = req.params;
      const { data: pol } = await db.from("policies").select("*, plans(premium_amount)").eq("id", id).single();
      if (!pol) {
        res.status(404).json({ error: "Policy not found" });
        return;
      }
      if (requester.role === "member" && pol.user_id !== requester.id) {
        res.status(403).json({ error: "Unauthorised" });
        return;
      }
      const now = /* @__PURE__ */ new Date();
      const end = /* @__PURE__ */ new Date();
      end.setFullYear(now.getFullYear() + 1);
      await db.from("policies").update({
        start_date: now.toISOString().split("T")[0],
        end_date: end.toISOString().split("T")[0],
        status: "active",
        remaining_coverage: pol.coverage_limit
      }).eq("id", id);
      await db.from("premiums").insert({
        policy_id: id,
        amount: pol.plans?.premium_amount || pol.premium_rate,
        due_date: now.toISOString().split("T")[0],
        status: "unpaid"
      });
      await writeAudit(requester.id, requester.name, "RENEWED_POLICY", "policies", id);
      await addNotification(pol.user_id, `Policy ${id} renewed! Expires: ${end.toISOString().split("T")[0]}.`, "success");
      res.json({ message: "Policy renewed successfully" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/claims", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      const { status, provider, policy } = req.query;
      let query = db.from("claims").select("*, policies(user_id, plan_id, profiles(name,national_id)), providers(name)").order("date_filed", { ascending: false });
      if (requester.role === "member") {
        const { data: userPolicies } = await db.from("policies").select("id").eq("user_id", requester.id);
        const ids = (userPolicies || []).map((p) => p.id);
        if (!ids.length) {
          res.json([]);
          return;
        }
        query = query.in("policy_id", ids);
      } else if (requester.role === "provider") {
        const { data: prov } = await db.from("providers").select("id").ilike("name", `%${requester.name.split(" ")[0]}%`).maybeSingle();
        if (prov) query = query.eq("provider_id", prov.id);
      }
      if (status) query = query.eq("status", status);
      if (provider) query = query.eq("provider_id", provider);
      if (policy) query = query.eq("policy_id", policy);
      const { data, error } = await query;
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      const mapped = (data || []).map((c) => ({
        ...c,
        holder_name: c.policies?.profiles?.name || "Unknown",
        holder_national_id: c.policies?.profiles?.national_id || "",
        provider_name: c.providers?.name || "Submitted by Member",
        plan_id: c.policies?.plan_id || ""
      }));
      res.json(mapped);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/claims", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      const { policy_id, provider_id, diagnosis, treatment, amount_claimed, document_data } = req.body;
      if (!policy_id || !diagnosis || !treatment || amount_claimed === void 0) {
        res.status(400).json({ error: "Missing: policy_id, diagnosis, treatment, amount_claimed" });
        return;
      }
      const { data: targetPolicy } = await db.from("policies").select("*, plans(coverage_limit,name)").eq("id", policy_id).single();
      if (!targetPolicy) {
        res.status(404).json({ error: "Policy not found" });
        return;
      }
      if (targetPolicy.status === "suspended") {
        res.status(400).json({ error: "Policy SUSPENDED. Clear overdue premiums first." });
        return;
      }
      const requestedSum = Number(amount_claimed);
      const planLimit = targetPolicy.plans?.coverage_limit || 0;
      let autoFlagged = false;
      let flagReason = "";
      if (requestedSum > planLimit) {
        autoFlagged = true;
        flagReason = `FLAGGED: Claimed UGX ${requestedSum.toLocaleString()} exceeds plan ceiling UGX ${planLimit.toLocaleString()}.`;
      }
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1e3).toISOString();
      const { data: duplicate } = await db.from("claims").select("id").eq("policy_id", policy_id).ilike("diagnosis", diagnosis.trim()).gte("date_filed", twoHoursAgo).maybeSingle();
      if (duplicate) {
        autoFlagged = true;
        flagReason = `FLAGGED CLONE: Duplicate claim (Ref: ${duplicate.id}) detected within 2 hours.`;
      }
      const { data: settings } = await db.from("system_settings").select("*").eq("id", 1).single();
      let initialStatus = "submitted";
      if (!autoFlagged && settings?.allow_auto_approval && requestedSum <= (settings?.low_claim_threshold || 5e5)) {
        initialStatus = "approved";
      }
      const { data: newClaim, error } = await db.from("claims").insert({
        policy_id,
        provider_id: provider_id || null,
        diagnosis,
        treatment,
        amount_claimed: requestedSum,
        amount_approved: initialStatus === "approved" ? requestedSum : 0,
        status: initialStatus,
        review_notes: initialStatus === "approved" ? "SLA auto-approved (low-value threshold)." : autoFlagged ? flagReason : "Submitted for staff review.",
        document_data: document_data || null,
        is_flagged: autoFlagged,
        date_filed: (/* @__PURE__ */ new Date()).toISOString()
      }).select().single();
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      const auditAction = autoFlagged ? "CLAIM_FLAGGED_SUSPICIOUS" : initialStatus === "approved" ? "CLAIM_AUTO_APPROVED" : "CLAIM_SUBMITTED";
      await writeAudit(requester.id, requester.name, auditAction, "claims", newClaim.id);
      const notifMsg = autoFlagged ? `ALERT: Claim for ${diagnosis} flagged. ${flagReason}` : initialStatus === "approved" ? `Claim for ${diagnosis} (UGX ${requestedSum.toLocaleString()}) AUTO-APPROVED!` : `Claim ${newClaim.id} submitted and under review.`;
      await addNotification(targetPolicy.user_id, notifMsg, autoFlagged ? "alert" : initialStatus === "approved" ? "success" : "info");
      res.status(201).json({
        message: autoFlagged ? "Claim filed but FLAGGED for audit!" : initialStatus === "approved" ? "Claim Auto-Approved!" : "Claim submitted.",
        claim: newClaim
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/claims/:id/review", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      if (!["admin", "staff"].includes(requester.role)) {
        res.status(403).json({ error: "Staff only" });
        return;
      }
      const { id } = req.params;
      const { status, amount_approved, notes, is_flagged } = req.body;
      if (!status) {
        res.status(400).json({ error: "Status required" });
        return;
      }
      const updates = { status, reviewer_id: requester.id, review_notes: notes };
      if (status === "approved" || status === "paid") {
        updates.amount_approved = amount_approved !== void 0 ? Number(amount_approved) : void 0;
      } else {
        updates.amount_approved = 0;
      }
      if (is_flagged !== void 0) updates.is_flagged = is_flagged;
      const { data: claim, error } = await db.from("claims").update(updates).eq("id", id).select("*, policies(user_id)").single();
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      await writeAudit(requester.id, requester.name, `CLAIM_REVIEW_${status.toUpperCase()}`, "claims", id);
      if (claim.policies?.user_id) {
        await addNotification(
          claim.policies.user_id,
          `Claim ${id}: ${status.toUpperCase()}. Amount: UGX ${(claim.amount_approved || 0).toLocaleString()}.`,
          status === "approved" || status === "paid" ? "success" : "alert"
        );
      }
      res.json({ message: `Claim updated to ${status}.`, claim });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/claims/:id/pay", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      if (!["admin", "staff"].includes(requester.role)) {
        res.status(403).json({ error: "Staff only" });
        return;
      }
      const { id } = req.params;
      const { data: existing } = await db.from("claims").select("*, policies(user_id)").eq("id", id).single();
      if (!existing) {
        res.status(404).json({ error: "Claim not found" });
        return;
      }
      if (existing.status !== "approved") {
        res.status(400).json({ error: "Claim must be APPROVED first" });
        return;
      }
      const { data: claim } = await db.from("claims").update({ status: "paid" }).eq("id", id).select().single();
      await writeAudit(requester.id, requester.name, "DISBURSED_CLAIM_PAYOUT", "claims", id);
      if (existing.policies?.user_id) {
        await addNotification(
          existing.policies.user_id,
          `Payout of UGX ${(existing.amount_approved || 0).toLocaleString()} disbursed for Claim ${id}.`,
          "success"
        );
      }
      res.json({ message: "Claim paid.", claim });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/premiums", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      let query = db.from("premiums").select("*, policies(user_id, plan_id, profiles(name), plans(name))").order("due_date", { ascending: false });
      if (requester.role === "member") {
        const { data: userPolicies } = await db.from("policies").select("id").eq("user_id", requester.id);
        const ids = (userPolicies || []).map((p) => p.id);
        if (!ids.length) {
          res.json([]);
          return;
        }
        query = query.in("policy_id", ids);
      }
      const { data } = await query;
      const mapped = (data || []).map((pr) => ({
        ...pr,
        holder_name: pr.policies?.profiles?.name || "Unknown",
        plan_name: pr.policies?.plans?.name || "Unknown Plan"
      }));
      res.json(mapped);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/premiums/:id/pay", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      const { id } = req.params;
      const { data: premium } = await db.from("premiums").select("*, policies(user_id, status)").eq("id", id).single();
      if (!premium) {
        res.status(404).json({ error: "Premium not found" });
        return;
      }
      if (premium.status === "paid") {
        res.status(400).json({ error: "Already paid" });
        return;
      }
      if (requester.role === "member" && premium.policies?.user_id !== requester.id) {
        res.status(403).json({ error: "Unauthorised" });
        return;
      }
      const receiptNo = `REC-${Date.now()}`;
      await db.from("premiums").update({ status: "paid", paid_date: (/* @__PURE__ */ new Date()).toISOString(), receipt_number: receiptNo }).eq("id", id);
      let reactivated = false;
      if (premium.policies?.status === "suspended") {
        await db.from("policies").update({ status: "active" }).eq("id", premium.policy_id);
        reactivated = true;
        await writeAudit(requester.id, requester.name, "AUTO_REACTIVATED_POLICY", "policies", premium.policy_id);
      }
      await writeAudit(requester.id, requester.name, "PAID_PREMIUM", "premiums", id);
      await addNotification(
        premium.policies?.user_id || requester.id,
        `Receipt ${receiptNo}: UGX ${premium.amount.toLocaleString()} cleared.${reactivated ? " Policy reactivated!" : ""}`,
        "success"
      );
      res.json({ message: "Premium paid!", receipt: receiptNo });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/premiums/remind", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      if (!["admin", "staff"].includes(requester.role)) {
        res.status(403).json({ error: "Staff only" });
        return;
      }
      const { data: outstanding } = await db.from("premiums").select("*, policies(user_id)").eq("status", "unpaid");
      let dispatched = 0;
      for (const pr of outstanding || []) {
        if (pr.policies?.user_id) {
          await addNotification(
            pr.policies.user_id,
            `REMINDER: Premium UGX ${pr.amount.toLocaleString()} due ${pr.due_date}. Pay now to keep cover active.`,
            "alert"
          );
          dispatched++;
        }
      }
      await writeAudit(requester.id, requester.name, "TRIGGERED_AUTO_REMINDERS", "premiums", "bulk");
      res.json({ message: `Sent ${dispatched} reminders.`, count: dispatched });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/providers", async (_req, res) => {
    try {
      const { data } = await db.from("providers").select("*").order("name");
      res.json(data || []);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/providers", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      if (!["admin", "staff"].includes(requester.role)) {
        res.status(403).json({ error: "Staff/Admin only" });
        return;
      }
      const { name, type, location, contact, approved_plans } = req.body;
      if (!name || !type || !location || !contact) {
        res.status(400).json({ error: "name, type, location, contact required" });
        return;
      }
      const { data: prov, error } = await db.from("providers").insert({
        name,
        type,
        location,
        contact,
        accreditation_status: "pending",
        approved_plans: approved_plans || ["plan-basic", "plan-standard"]
      }).select().single();
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      await writeAudit(requester.id, requester.name, "REGISTERED_PROVIDER", "providers", prov.id);
      res.status(201).json({ message: "Provider registered for review.", provider: prov });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/providers/:id", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      if (!["admin", "staff"].includes(requester.role)) {
        res.status(403).json({ error: "Staff/Admin only" });
        return;
      }
      const { id } = req.params;
      const { accreditation_status, location, contact, name, approved_plans } = req.body;
      const updates = {};
      if (accreditation_status) updates.accreditation_status = accreditation_status;
      if (location) updates.location = location;
      if (contact) updates.contact = contact;
      if (name) updates.name = name;
      if (approved_plans) updates.approved_plans = approved_plans;
      const { data: prov, error } = await db.from("providers").update(updates).eq("id", id).select().single();
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      await writeAudit(
        requester.id,
        requester.name,
        accreditation_status ? `ACCREDITATION_SET_${accreditation_status.toUpperCase()}` : "UPDATED_PROVIDER",
        "providers",
        id
      );
      res.json({ message: "Provider updated.", provider: prov });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/notifications", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      const { data } = await db.from("notifications").select("*").eq("user_id", requester.id).order("created_at", { ascending: false });
      res.json(data || []);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/notifications/:id/read", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      const { id } = req.params;
      const { data: n } = await db.from("notifications").select("user_id").eq("id", id).single();
      if (!n) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      if (n.user_id !== requester.id) {
        res.status(403).json({ error: "Unauthorised" });
        return;
      }
      await db.from("notifications").update({ read: true }).eq("id", id);
      res.json({ message: "Marked read." });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/notifications/clear-all", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      await db.from("notifications").update({ read: true }).eq("user_id", requester.id);
      res.json({ message: "Inbox cleared." });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/audit-logs", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      if (!["admin", "staff"].includes(requester.role)) {
        res.status(403).json({ error: "Staff only" });
        return;
      }
      const { data } = await db.from("audit_logs").select("*").order("timestamp", { ascending: false }).limit(500);
      res.json(data || []);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/settings", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      if (!["admin", "staff"].includes(requester.role)) {
        res.status(403).json({ error: "Staff only" });
        return;
      }
      const { data } = await db.from("system_settings").select("*").eq("id", 1).single();
      res.json({
        allowAutoApprovalOfLowClaims: data?.allow_auto_approval ?? true,
        lowClaimThreshold: data?.low_claim_threshold ?? 5e5,
        autoSlaDays: data?.auto_sla_days ?? 5,
        requireProviderAccreditation: data?.require_accreditation ?? true,
        allowSelfClaimSubmission: data?.allow_self_submit ?? true
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/settings", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      if (!["admin", "staff"].includes(requester.role)) {
        res.status(403).json({ error: "Staff only" });
        return;
      }
      const { allowAutoApprovalOfLowClaims, lowClaimThreshold, autoSlaDays, requireProviderAccreditation, allowSelfClaimSubmission } = req.body;
      await db.from("system_settings").upsert({
        id: 1,
        allow_auto_approval: allowAutoApprovalOfLowClaims,
        low_claim_threshold: Number(lowClaimThreshold),
        auto_sla_days: Number(autoSlaDays),
        require_accreditation: requireProviderAccreditation,
        allow_self_submit: allowSelfClaimSubmission
      });
      await writeAudit(requester.id, requester.name, "SYSTEM_SETTINGS_UPDATE", "system_settings", "1");
      res.json({ message: "Settings saved." });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/analytics", authenticateUser, async (req, res) => {
    try {
      const requester = req.user;
      if (!["admin", "staff"].includes(requester.role)) {
        res.status(403).json({ error: "Staff only" });
        return;
      }
      const [
        { count: totalMembers },
        { count: totalClaims },
        { count: pendingClaims },
        { count: activePolicies },
        { data: claims },
        { data: premiums },
        { data: plans }
      ] = await Promise.all([
        db.from("profiles").select("*", { count: "exact", head: true }).eq("role", "member"),
        db.from("claims").select("*", { count: "exact", head: true }),
        db.from("claims").select("*", { count: "exact", head: true }).in("status", ["submitted", "under_review"]),
        db.from("policies").select("*", { count: "exact", head: true }).eq("status", "active"),
        db.from("claims").select("amount_approved,status,date_filed"),
        db.from("premiums").select("amount,status"),
        db.from("plans").select("id,name")
      ]);
      const totalPremiumRevenue = (premiums || []).filter((p) => p.status === "paid").reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalClaimsAmount = (claims || []).filter((c) => c.status === "paid").reduce((sum, c) => sum + (c.amount_approved || 0), 0);
      res.json({
        totalMembers: totalMembers || 0,
        totalClaims: totalClaims || 0,
        pendingClaims: pendingClaims || 0,
        activePolicies: activePolicies || 0,
        totalPremiumRevenue,
        totalClaimsAmount,
        plans: plans || [],
        claimsOverTime: claims || []
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/ai/chat", authenticateUser, async (req, res) => {
    try {
      const { message, history } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "Gemini API key not configured" });
        return;
      }
      const { data: plans } = await db.from("plans").select("name,premium_amount,coverage_limit,benefits,exclusions");
      const planSummary = (plans || []).map(
        (p) => `- ${p.name}: UGX ${(p.premium_amount || 0).toLocaleString()}/mo, limit UGX ${(p.coverage_limit || 0).toLocaleString()}`
      ).join("\n");
      const genAI = new import_genai.GoogleGenAI({ apiKey });
      const systemPrompt = `You are OHIMS Assistant \u2014 an AI support agent for the Online Health Insurance Management System Uganda. Help policyholders understand coverage, claims, and billing. Be concise and empathetic.

Available plans:
${planSummary}

For specific account queries, direct users to contact support@ohims.ug.`;
      const chat = genAI.chats.create({
        model: "gemini-2.5-flash",
        config: { systemInstruction: systemPrompt },
        history: (history || []).map((h) => ({
          role: h.role,
          parts: [{ text: h.content }]
        }))
      });
      const result = await chat.sendMessage({ message });
      res.json({ reply: result.text });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  if (process.env.NODE_ENV === "production") {
    const { default: path } = await import("path");
    app.use(import_express.default.static(path.resolve("dist")));
    app.get("*", (_req, res) => res.sendFile(path.resolve("dist/index.html")));
  } else {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(PORT, () => {
    console.log(`
\u{1F680} OHIMS running at http://localhost:${PORT}`);
    console.log(`\u{1F4E6} Supabase: ${SUPABASE_URL}`);
    console.log(`\u{1F30D} Mode: ${process.env.NODE_ENV || "development"}
`);
  });
}
startServer().catch(console.error);
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OHIMS Uganda — Express API Server
 * All data operations powered by Supabase PostgreSQL.
 */
//# sourceMappingURL=server.cjs.map
