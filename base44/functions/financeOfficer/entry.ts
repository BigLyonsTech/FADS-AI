import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  buildSystemPrompt,
  buildFinanceContext,
  buildConversationHistory,
  suggestedQuestions,
  demoSeedMessages,
  getCurrentMonthKey,
  checkUsage,
  officerResponseSchema,
} from "../../shared/financeOfficer.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const action = body.action;

    switch (action) {
      case "get_conversation":
        return await handleGetConversation(base44, user, body);
      case "ask":
        return await handleAsk(base44, user, body);
      case "delete_conversation":
        return await handleDeleteConversation(base44, user, body);
      case "get_context_options":
        return await handleGetContextOptions(base44, user, body);
      // Admin actions
      case "get_admin_settings":
        return await handleGetAdminSettings(base44, user);
      case "update_admin_settings":
        return await handleUpdateAdminSettings(base44, user, body);
      case "get_org_configs":
        return await handleGetOrgConfigs(base44, user);
      case "update_org_config":
        return await handleUpdateOrgConfig(base44, user, body);
      default:
        return Response.json({ error: "Unknown action: " + action }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ---- Verify org access (user-scoped, RLS-enforced) ----
async function verifyOrgAccess(base44, organisation_id) {
  const orgs = await base44.entities.Organisation.filter({ id: organisation_id });
  const org = orgs[0];
  if (!org) return null;
  return org;
}

// ---- Get or seed settings singleton ----
async function getSettings(base44) {
  const settings = await base44.asServiceRole.entities.FinanceOfficerSettings.filter({
    singleton_key: "global",
  });
  if (settings[0]) return settings[0];
  // Seed default settings
  const created = await base44.asServiceRole.entities.FinanceOfficerSettings.create({
    singleton_key: "global",
    is_enabled: true,
    default_monthly_allowance: 50,
    disclaimer_version: "1.0",
  });
  return created;
}

// ---- Get org config (or null) ----
async function getOrgConfig(base44, organisation_id) {
  const configs = await base44.asServiceRole.entities.FinanceOfficerOrgConfig.filter({
    organisation_id,
  });
  return configs[0] || null;
}

// ---- GET CONVERSATION ----
// Returns: conversation, status (enabled/usage), suggestions, accounts
async function handleGetConversation(base44, user, body) {
  const organisation_id = body.organisation_id;
  if (!organisation_id) return Response.json({ error: "organisation_id required" }, { status: 400 });

  const org = await verifyOrgAccess(base44, organisation_id);
  if (!org) return Response.json({ error: "Organisation not found or access denied" }, { status: 403 });

  // Check org access status
  if (org.access_status === "paused" || org.access_status === "cancelled") {
    return Response.json({
      conversation: null,
      status: { is_enabled: false, reason: "Organisation access is " + org.access_status + ".", remaining: 0, allowance: 0, used: 0 },
      suggestions: [],
      accounts: [],
    });
  }

  // Load settings + org config + conversation + accounts in parallel
  const [settings, orgConfig, existingConv, accounts] = await Promise.all([
    getSettings(base44),
    getOrgConfig(base44, organisation_id),
    base44.asServiceRole.entities.FinanceOfficerConversation.filter({
      organisation_id,
      user_id: user.id,
    }),
    base44.entities.FinanceAccount.filter({ organisation_id }),
  ]);

  let conversation = existingConv[0] || null;

  // Seed demo conversation for demo-mode orgs with no existing conversation
  if (!conversation && org.data_mode === "demo") {
    const seedMsgs = demoSeedMessages(org.type, org.currency || "USD");
    conversation = await base44.asServiceRole.entities.FinanceOfficerConversation.create({
      organisation_id,
      user_id: user.id,
      user_email: user.email,
      messages: seedMsgs,
      current_month_key: getCurrentMonthKey(),
      current_month_count: 0,
      data_mode: "demo",
    });
  }

  const usage = checkUsage(conversation, settings, orgConfig);
  const suggestions = suggestedQuestions(org.type);

  return Response.json({
    conversation,
    status: {
      is_enabled: usage.allowed,
      reason: usage.reason,
      remaining: usage.remaining,
      allowance: usage.allowance,
      used: usage.used,
    },
    suggestions,
    accounts: accounts.map((a) => ({ id: a.id, name: a.name, account_type: a.account_type })),
  });
}

// ---- ASK (send a question, get AI response) ----
async function handleAsk(base44, user, body) {
  const organisation_id = body.organisation_id;
  const question = (body.question || "").trim();
  const filters = {
    date_from: body.date_from || undefined,
    date_to: body.date_to || undefined,
    account_id: body.account_id || undefined,
  };

  if (!organisation_id) return Response.json({ error: "organisation_id required" }, { status: 400 });
  if (!question) return Response.json({ error: "Question is required" }, { status: 400 });
  if (question.length > 1000) return Response.json({ error: "Question too long (max 1000 characters)" }, { status: 400 });

  const org = await verifyOrgAccess(base44, organisation_id);
  if (!org) return Response.json({ error: "Organisation not found or access denied" }, { status: 403 });

  if (org.access_status === "paused" || org.access_status === "cancelled") {
    return Response.json({ error: "Organisation access is " + org.access_status }, { status: 403 });
  }

  // Load settings + org config + conversation in parallel
  const [settings, orgConfig, existingConv] = await Promise.all([
    getSettings(base44),
    getOrgConfig(base44, organisation_id),
    base44.asServiceRole.entities.FinanceOfficerConversation.filter({
      organisation_id,
      user_id: user.id,
    }),
  ]);

  let conversation = existingConv[0] || null;

  // Check usage limit
  const usage = checkUsage(conversation, settings, orgConfig);
  if (!usage.allowed) {
    return Response.json({ error: usage.reason || "Finance Officer unavailable" }, { status: 403 });
  }

  // Load finance data (user-scoped, RLS-enforced)
  const [transactions, invoices, accounts, categories, contacts, reconciliations, statementLines] = await Promise.all([
    base44.entities.FinanceTransaction.filter({ organisation_id }, "-date", 500),
    base44.entities.Invoice.filter({ organisation_id }, "-issue_date", 500),
    base44.entities.FinanceAccount.filter({ organisation_id }),
    base44.entities.FinanceCategory.filter({ organisation_id }),
    base44.entities.FinanceContact.filter({ organisation_id }),
    base44.entities.Reconciliation.filter({ organisation_id }, "-created_date", 100),
    base44.entities.StatementLine.filter({ organisation_id }, "-created_date", 500),
  ]);

  // Build the full prompt
  const systemPrompt = buildSystemPrompt(org, filters);
  const financeContext = buildFinanceContext(
    org, transactions, invoices, accounts, categories, contacts, reconciliations, statementLines, filters
  );
  const history = buildConversationHistory(conversation?.messages || []);

  const fullPrompt = [
    systemPrompt,
    "",
    financeContext,
    "",
    history,
    "",
    "=== CURRENT QUESTION ===",
    question,
    "",
    'Respond in JSON format with: answer, citations, period_note, insufficient_data.',
  ].filter(Boolean).join("\n");

  // Call InvokeLLM (service role for Core integration)
  let llmResponse;
  try {
    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      response_json_schema: officerResponseSchema,
    });
    llmResponse = llmResult;
  } catch (e) {
    return Response.json({ error: "AI service temporarily unavailable. Please try again." }, { status: 503 });
  }

  // Parse the LLM response
  let officerMessage;
  if (typeof llmResponse === "string") {
    try {
      officerMessage = JSON.parse(llmResponse);
    } catch {
      officerMessage = { answer: llmResponse, citations: [], period_note: "", insufficient_data: false };
    }
  } else if (llmResponse && typeof llmResponse === "object") {
    officerMessage = llmResponse;
  } else {
    officerMessage = { answer: "I couldn't process that request. Please try rephrasing your question.", citations: [], period_note: "", insufficient_data: true };
  }

  // Ensure required fields
  const answer = String(officerMessage.answer || "I couldn't generate a response.");
  const citations = Array.isArray(officerMessage.citations) ? officerMessage.citations : [];
  const period_note = String(officerMessage.period_note || "");
  const insufficient_data = Boolean(officerMessage.insufficient_data);

  // Build the new messages
  const now = new Date().toISOString();
  const userMsg = { role: "user", content: question, timestamp: now, citations: [] };
  const officerMsg = { role: "officer", content: answer, timestamp: now, citations, period_note, insufficient_data };

  // Update or create conversation
  const monthKey = getCurrentMonthKey();
  if (conversation) {
    const updatedMessages = [...(conversation.messages || []), userMsg, officerMsg];
    const updatedCount = conversation.current_month_key === monthKey
      ? (conversation.current_month_count || 0) + 1
      : 1;
    await base44.asServiceRole.entities.FinanceOfficerConversation.update(conversation.id, {
      messages: updatedMessages,
      current_month_key: monthKey,
      current_month_count: updatedCount,
    });
    conversation.messages = updatedMessages;
    conversation.current_month_count = updatedCount;
  } else {
    conversation = await base44.asServiceRole.entities.FinanceOfficerConversation.create({
      organisation_id,
      user_id: user.id,
      user_email: user.email,
      messages: [userMsg, officerMsg],
      current_month_key: monthKey,
      current_month_count: 1,
      data_mode: org.data_mode || "live",
    });
  }

  // Recompute usage after increment
  const updatedUsage = checkUsage(conversation, settings, orgConfig);

  return Response.json({
    response: { answer, citations, period_note, insufficient_data },
    status: {
      is_enabled: true,
      remaining: updatedUsage.remaining,
      allowance: updatedUsage.allowance,
      used: updatedUsage.used,
    },
  });
}

// ---- DELETE CONVERSATION ----
async function handleDeleteConversation(base44, user, body) {
  const organisation_id = body.organisation_id;
  if (!organisation_id) return Response.json({ error: "organisation_id required" }, { status: 400 });

  const org = await verifyOrgAccess(base44, organisation_id);
  if (!org) return Response.json({ error: "Access denied" }, { status: 403 });

  const existing = await base44.asServiceRole.entities.FinanceOfficerConversation.filter({
    organisation_id,
    user_id: user.id,
  });

  if (existing[0]) {
    await base44.asServiceRole.entities.FinanceOfficerConversation.delete(existing[0].id);
  }

  return Response.json({ success: true });
}

// ---- GET CONTEXT OPTIONS (accounts for filter bar) ----
async function handleGetContextOptions(base44, user, body) {
  const organisation_id = body.organisation_id;
  if (!organisation_id) return Response.json({ error: "organisation_id required" }, { status: 400 });

  const org = await verifyOrgAccess(base44, organisation_id);
  if (!org) return Response.json({ error: "Access denied" }, { status: 403 });

  const accounts = await base44.entities.FinanceAccount.filter({ organisation_id });
  return Response.json({
    accounts: accounts.map((a) => ({ id: a.id, name: a.name, account_type: a.account_type })),
  });
}

// ---- ADMIN: GET SETTINGS + ORG CONFIGS ----
async function handleGetAdminSettings(base44, user) {
  if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const settings = await getSettings(base44);
  const orgConfigs = await base44.asServiceRole.entities.FinanceOfficerOrgConfig.list();
  const orgs = await base44.asServiceRole.entities.Organisation.list();
  const conversations = await base44.asServiceRole.entities.FinanceOfficerConversation.list();

  // Build usage stats per org
  const monthKey = getCurrentMonthKey();
  const usageByOrg = {};
  conversations.forEach((c) => {
    const used = c.current_month_key === monthKey ? c.current_month_count : 0;
    usageByOrg[c.organisation_id] = (usageByOrg[c.organisation_id] || 0) + used;
  });

  const orgMap = {};
  orgs.forEach((o) => { orgMap[o.id] = o; });

  const configsByOrg = {};
  orgConfigs.forEach((c) => { configsByOrg[c.organisation_id] = c; });

  const orgList = orgs.map((o) => {
    const cfg = configsByOrg[o.id] || {};
    const effectiveAllowance = cfg.monthly_allowance_override ?? settings.default_monthly_allowance;
    const effectiveEnabled = settings.is_enabled !== false && cfg.is_enabled_override !== false;
    return {
      organisation_id: o.id,
      organisation_name: o.name,
      org_type: o.type,
      data_mode: o.data_mode,
      access_status: o.access_status,
      is_enabled_override: cfg.is_enabled_override ?? null,
      monthly_allowance_override: cfg.monthly_allowance_override ?? null,
      effective_enabled: effectiveEnabled,
      effective_allowance: effectiveAllowance,
      used_this_month: usageByOrg[o.id] || 0,
    };
  });

  return Response.json({
    settings: {
      is_enabled: settings.is_enabled !== false,
      default_monthly_allowance: settings.default_monthly_allowance ?? 50,
      disclaimer_version: settings.disclaimer_version || "1.0",
      updated_date: settings.updated_date,
    },
    organisations: orgList,
  });
}

// ---- ADMIN: UPDATE SETTINGS ----
async function handleUpdateAdminSettings(base44, user, body) {
  if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const settings = await getSettings(base44);
  const updates = {};
  if (typeof body.is_enabled === "boolean") updates.is_enabled = body.is_enabled;
  if (typeof body.default_monthly_allowance === "number" && body.default_monthly_allowance >= 0) {
    updates.default_monthly_allowance = body.default_monthly_allowance;
  }
  updates.updated_by = user.id;
  updates.updated_date = new Date().toISOString();

  await base44.asServiceRole.entities.FinanceOfficerSettings.update(settings.id, updates);
  return Response.json({ success: true });
}

// ---- ADMIN: GET ORG CONFIGS ----
async function handleGetOrgConfigs(base44, user) {
  if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  // This is included in handleGetAdminSettings, but kept for completeness
  const configs = await base44.asServiceRole.entities.FinanceOfficerOrgConfig.list();
  return Response.json({ configs });
}

// ---- ADMIN: UPDATE ORG CONFIG ----
async function handleUpdateOrgConfig(base44, user, body) {
  if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const organisation_id = body.organisation_id;
  if (!organisation_id) return Response.json({ error: "organisation_id required" }, { status: 400 });

  const existing = await base44.asServiceRole.entities.FinanceOfficerOrgConfig.filter({ organisation_id });
  const updates = {
    is_enabled_override: body.is_enabled_override,
    monthly_allowance_override: body.monthly_allowance_override,
    updated_by: user.id,
    updated_date: new Date().toISOString(),
  };

  // Get org name for snapshot
  const orgs = await base44.asServiceRole.entities.Organisation.filter({ id: organisation_id });
  const orgName = orgs[0]?.name || "";

  if (existing[0]) {
    await base44.asServiceRole.entities.FinanceOfficerOrgConfig.update(existing[0].id, updates);
  } else {
    await base44.asServiceRole.entities.FinanceOfficerOrgConfig.create({
      organisation_id,
      organisation_name: orgName,
      ...updates,
    });
  }

  return Response.json({ success: true });
}