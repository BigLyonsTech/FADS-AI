import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { getActiveMembership, writeAuditLog } from "../../shared/workspace.ts";
import {
  getModuleAccess,
  suggestedQuestions,
  buildModuleContext,
  buildSystemPrompt,
  buildConversationHistory,
  buildTodayInFads,
  buildDailyBriefPrompt,
  buildExplainPrompt,
  getWorkspaceTerminology,
  checkUsage,
  getCurrentMonthKey,
  assistantResponseSchema,
  buildReminderPrompt,
  buildWhatsAppMessagePrompt,
  buildContentPackPrompt,
  contentPackSchema,
  buildSocialAuditPrompt,
  socialAuditSchema,
  buildBulkRemindersPrompt,
  bulkRemindersSchema,
  buildInvoiceDraftPrompt,
  invoiceDraftSchema,
} from "../../shared/assistant.ts";
import { buildRoleOverlay, getAccessibleTeamRoles } from "../../shared/aiTeam.ts";
import { getOrCreateConversation } from "../../shared/officerBackend.ts";
import { buildIntelligenceBlock } from "../../shared/businessIntelligence.ts";
import { buildHrDocumentPrompt } from "../../shared/hrDocuments.ts";
import { HR_ACCESS_ROLES } from "../../shared/hr.ts";

// FADS AI Assistant backend function. Cross-module read-only intelligence layer.
// Enforces org isolation, role-based module access, data-mode separation,
// and audit logging. All AI calls use InvokeLLM (no external keys).

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
      case "generate_daily_brief":
        return await handleGenerateDailyBrief(base44, user, body);
      case "delete_conversation":
        return await handleDeleteConversation(base44, user, body);
      case "draft_reminder":
        return await handleDraftReminder(base44, user, body);
      case "draft_whatsapp":
        return await handleDraftWhatsApp(base44, user, body);
      case "send_email":
        return await handleSendEmail(base44, user, body);
      case "draft_hr_document":
        return await handleDraftHrDocument(base44, user, body);
      case "explain":
        return await handleExplain(base44, user, body);
      case "generate_content":
        return await handleGenerateContent(base44, user, body);
      case "audit_social_media":
        return await handleAuditSocialMedia(base44, user, body);
      case "draft_bulk_reminders":
        return await handleDraftBulkReminders(base44, user, body);
      case "personalise_resource":
        return await handlePersonaliseResource(base44, user, body);
      case "parse_money":
        return await handleParseMoney(base44, user, body);
      case "voice_money":
        return await handleVoiceMoney(base44, user, body);
      case "dictate_transaction":
        return await handleDictateTransaction(base44, user, body);
      case "dictate_inventory_item":
        return await handleDictateInventoryItem(base44, user, body);
      case "draft_invoice":
        return await handleDraftInvoice(base44, user, body);
      case "draft_receipt":
        return await handleDraftReceipt(base44, user, body);
      default:
        return Response.json({ error: "Unknown action: " + action }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ---- Verify org membership ----
async function verifyMembership(svc, user, organisation_id) {
  if (!organisation_id) return { error: "organisation_id required", status: 400 };
  const membership = await getActiveMembership(svc, user.id, organisation_id);
  if (!membership) return { error: "Not a member of this organisation", status: 403 };
  const org = await svc.entities.Organisation.get(organisation_id);
  if (!org) return { error: "Organisation not found", status: 404 };
  if (org.access_status === "paused" || org.access_status === "cancelled") {
    return { error: "Organisation access is " + org.access_status, status: 403 };
  }
  return { org, membership };
}

// ---- Get or create conversation ----
async function getConversation(svc, user, org, dataMode) {
  const existing = await svc.entities.AssistantConversation.filter({
    organisation_id: org.id,
    user_id: user.id,
  });
  if (existing.length > 0) return existing[0];

  return await svc.entities.AssistantConversation.create({
    organisation_id: org.id,
    user_id: user.id,
    user_email: user.email,
    messages: [],
    current_month_key: getCurrentMonthKey(),
    current_month_count: 0,
    data_mode: dataMode,
  });
}

// ---- Gather data from all permitted modules ----
async function gatherData(svc, org, dataMode, moduleAccess) {
  const filter = { organisation_id: org.id, data_mode: dataMode };

  let financeData = { transactions: [], invoices: [], accounts: [], categories: [], monthTxns: [], weekTxns: [] };
  if (moduleAccess.finance) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const dow = now.getDay();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (dow === 0 ? 6 : dow - 1)).toISOString().slice(0, 10);
    const [transactions, invoices, accounts, categories, monthTxns, weekTxns] = await Promise.all([
      svc.entities.FinanceTransaction.filter(filter, "-date", 50),
      svc.entities.Invoice.filter(filter, "-issue_date", 100),
      svc.entities.FinanceAccount.filter(filter),
      svc.entities.FinanceCategory.filter(filter),
      svc.entities.FinanceTransaction.filter({ ...filter, date: { $gte: monthStart } }, "-date", 500),
      svc.entities.FinanceTransaction.filter({ ...filter, date: { $gte: weekStart } }, "-date", 200),
    ]);
    financeData = { transactions, invoices, accounts, categories, monthTxns, weekTxns };
  }

  let hrData = { employees: [], leaveRequests: [], complianceItems: [] };
  if (moduleAccess.hr) {
    const [employees, leaveRequests, complianceItems] = await Promise.all([
      svc.entities.Employee.filter(filter, "-created_date", 50),
      svc.entities.LeaveRequest.filter(filter, "-requested_date", 50),
      svc.entities.ComplianceItem.filter(filter, "-deadline_date", 30),
    ]);
    hrData = { employees, leaveRequests, complianceItems };
  }

  let transcribeData = { sessions: [] };
  if (moduleAccess.transcribe) {
    const sessions = await svc.entities.TranscriptSession.filter(filter, "-session_date", 10);
    transcribeData = { sessions: sessions.filter((s) => !s.is_archived) };
  }

  let crmData = { contacts: [], leads: [], tasks: [], activities: [] };
  if (moduleAccess.crm) {
    const [contacts, leads, tasks, activities] = await Promise.all([
      svc.entities.CRMContact.filter(filter, "-updated_date", 100),
      svc.entities.CRMLead.filter(filter, "-updated_date", 50),
      svc.entities.CRMTask.filter(filter, "-due_date", 50),
      svc.entities.CRMActivity.filter(filter, "-created_date", 20),
    ]);
    crmData = { contacts, leads, tasks, activities };
  }

  let inventoryData = { items: [], movements: [] };
  if (moduleAccess.inventory) {
    const [items, movements] = await Promise.all([
      svc.entities.InventoryItem.filter(filter, "-created_date", 200),
      svc.entities.StockMovement.filter(filter, "-date", 200),
    ]);
    inventoryData = { items, movements };
  }

  // Church giving & pledges (church workspaces only). Pledges are a commitment
  // layer; giving is derived from FinanceTransactions (source of truth).
  let pledgeData: any[] = [];
  if (org.type === "church") {
    pledgeData = await svc.entities.GivingPledge.filter(filter, "-created_date", 100);
  }

  // Tax Profile for the organisation's authoritative country. Guidance-only
  // country switching in the Business & Tax Centre must never cause the
  // assistant to pick an unrelated jurisdiction profile.
  let taxData: any = null;
  try {
    const profiles = await svc.entities.TaxProfile.filter({
      organisation_id: org.id,
      data_mode: dataMode,
      country: org.country,
    });
    taxData = profiles[0] || null;
    if (!taxData) {
      const legacyProfiles = await svc.entities.TaxProfile.filter({
        organisation_id: org.id,
        data_mode: dataMode,
      });
      taxData = legacyProfiles.find((p: any) => !p.country) || null;
    }
  } catch {
    taxData = null;
  }

  return { finance: financeData, hr: hrData, transcribe: transcribeData, crm: crmData, inventory: inventoryData, pledges: pledgeData, tax: taxData };
}

// ---- GET CONVERSATION ----
async function handleGetConversation(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org, membership } = verified;
  const dataMode = body.data_mode || "live";
  const moduleAccess = getModuleAccess(membership.role_in_org);
  const conversation = await getConversation(svc, user, org, dataMode);
  const usage = checkUsage(conversation);
  const suggestions = suggestedQuestions(org);
  const data = await gatherData(svc, org, dataMode, moduleAccess);
  const todayInFads = buildTodayInFads(org, moduleAccess, data);

  const aiTeam = getAccessibleTeamRoles(moduleAccess);
  return Response.json({
    conversation,
    suggestions,
    today_in_fads: todayInFads,
    module_access: moduleAccess,
    ai_team: aiTeam,
    status: usage,
    data_mode: dataMode,
  });
}

// ---- ASK ----
async function handleAsk(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org, membership } = verified;
  const dataMode = body.data_mode || "live";
  const moduleAccess = getModuleAccess(membership.role_in_org);
  const conversation = await getConversation(svc, user, org, dataMode);
  const usage = checkUsage(conversation);
  if (!usage.allowed) {
    return Response.json({ error: usage.reason }, { status: 429 });
  }

  const question = (body.question || "").trim();
  if (!question) return Response.json({ error: "Question is required" }, { status: 400 });

  // Gather data from permitted modules
  const data = await gatherData(svc, org, dataMode, moduleAccess);

  // Build prompt — a specialist role overlay (if any) focuses the central
  // assistant on a specific domain. Same data, same conversation, same LLM.
  const systemPrompt = buildSystemPrompt(org, moduleAccess) + buildRoleOverlay(body.role);
  const history = buildConversationHistory(conversation.messages);
  const intelligenceBlock = moduleAccess.finance ? buildIntelligenceBlock(org, data.finance) : "";
  const context = buildModuleContext(org, moduleAccess, data);
  const fullPrompt = `${systemPrompt}\n\n${history}\n\n${intelligenceBlock}\n${context}\n\nQuestion: ${question}`;

  // Call LLM
  let responseData;
  try {
    const aiResponse = await svc.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      response_json_schema: assistantResponseSchema,
    });
    responseData = typeof aiResponse === "string" ? JSON.parse(aiResponse) : aiResponse;
  } catch (e) {
    return Response.json({ error: "AI service unavailable. Please try again." }, { status: 503 });
  }

  // Build messages
  const now = new Date().toISOString();
  const userMsg = {
    role: "user",
    content: question,
    timestamp: now,
    citations: [],
    modules_used: [],
  };
  const assistantMsg = {
    role: "assistant",
    content: responseData.answer || "I was unable to generate a response.",
    timestamp: now,
    citations: responseData.citations || [],
    modules_used: responseData.modules_used || [],
    period_note: responseData.period_note || "",
    insufficient_data: responseData.insufficient_data || false,
    prepared_action: responseData.prepared_action || null,
  };

  // Update conversation
  const monthKey = getCurrentMonthKey();
  const newCount = conversation.current_month_key === monthKey ? conversation.current_month_count + 1 : 1;
  const updated = await svc.entities.AssistantConversation.update(conversation.id, {
    messages: [...(conversation.messages || []), userMsg, assistantMsg],
    current_month_key: monthKey,
    current_month_count: newCount,
    data_mode: dataMode,
  });

  const newUsage = checkUsage(updated);

  await writeAuditLog(svc, {
    organisation_id: org.id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "assistant.ask",
    after: {
      question,
      role: body.role || "",
      modules_used: responseData.modules_used || [],
      data_mode: dataMode,
    },
  });

  return Response.json({
    response: assistantMsg,
    conversation: updated,
    status: newUsage,
  });
}

// ---- DELETE CONVERSATION ----
async function handleDeleteConversation(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const conversation = await getConversation(svc, user, verified.org, body.data_mode || "live");
  await svc.entities.AssistantConversation.update(conversation.id, {
    messages: [],
    current_month_count: 0,
  });

  await writeAuditLog(svc, {
    organisation_id: verified.org.id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "assistant.delete_conversation",
  });

  return Response.json({ success: true });
}

// ---- GENERATE DAILY BRIEF ----
async function handleGenerateDailyBrief(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org, membership } = verified;
  const dataMode = body.data_mode || "live";
  const moduleAccess = getModuleAccess(membership.role_in_org);
  const data = await gatherData(svc, org, dataMode, moduleAccess);
  const terminology = getWorkspaceTerminology(org);
  const intelligenceBlock = moduleAccess.finance ? buildIntelligenceBlock(org, data.finance) : "";
  const prompt = buildDailyBriefPrompt(org, moduleAccess, data, terminology) + (intelligenceBlock ? `\n${intelligenceBlock}` : "");

  let briefText;
  try {
    const aiResponse = await svc.integrations.Core.InvokeLLM({ prompt });
    briefText = typeof aiResponse === "string" ? aiResponse : JSON.stringify(aiResponse);
  } catch (e) {
    return Response.json({ error: "AI service unavailable. Please try again." }, { status: 503 });
  }

  await writeAuditLog(svc, {
    organisation_id: org.id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "assistant.generate_daily_brief",
    after: { data_mode: dataMode },
  });

  return Response.json({ brief: briefText });
}

// ---- DRAFT WHATSAPP REMINDER ----
// Drafts (never sends) a polite, workspace-aware WhatsApp payment reminder for
// an overdue receivable. Reuses org membership verification, InvokeLLM and
// audit logging from the existing assistant infrastructure.
async function handleDraftReminder(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org } = verified;
  const receivable = body.receivable;
  if (!receivable || !receivable.recipientName) {
    return Response.json({ error: "receivable.recipientName is required" }, { status: 400 });
  }

  const prompt = buildReminderPrompt(org, receivable);

  let message;
  try {
    const aiResponse = await svc.integrations.Core.InvokeLLM({ prompt });
    message = typeof aiResponse === "string" ? aiResponse.trim() : String(aiResponse).trim();
  } catch (e) {
    return Response.json({ error: "AI service unavailable. Please try again." }, { status: 503 });
  }

  await writeAuditLog(svc, {
    organisation_id: org.id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "assistant.draft_reminder",
    after: {
      recipient: receivable.recipientName,
      outstanding_amount: receivable.outstandingAmount,
      reference: receivable.reference || "",
    },
  });

  return Response.json({ message });
}

// ---- DRAFT HR DOCUMENT ----
// Drafts (never sends) an HR document — employment letter, warning letter,
// promotion letter, general letter or performance summary. Requires HR
// access. Reuses org membership verification, InvokeLLM and audit logging.
async function handleDraftHrDocument(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org, membership } = verified;
  if (!HR_ACCESS_ROLES.includes(membership.role_in_org || "")) {
    return Response.json({ error: "HR access required to draft HR documents" }, { status: 403 });
  }

  const docType = body.docType;
  const context = body.context;
  if (!docType || !context) {
    return Response.json({ error: "docType and context are required" }, { status: 400 });
  }

  const prompt = buildHrDocumentPrompt(org, {
    docType,
    employeeName: body.employeeName,
    jobTitle: body.jobTitle,
    startDate: body.startDate,
    salary: body.salary,
    context,
  });

  let document;
  try {
    const aiResponse = await svc.integrations.Core.InvokeLLM({ prompt });
    document = typeof aiResponse === "string" ? aiResponse.trim() : String(aiResponse).trim();
  } catch (e) {
    return Response.json({ error: "AI service unavailable. Please try again." }, { status: 503 });
  }

  await writeAuditLog(svc, {
    organisation_id: org.id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "assistant.draft_hr_document",
    after: { docType, employee: body.employeeName || "" },
  });

  return Response.json({ document });
}
// ---- DRAFT WHATSAPP MESSAGE (CRM) ----
// Drafts (never sends) a short, workspace-aware WhatsApp message for a CRM
// contact or audience. Reuses org membership verification, InvokeLLM and
// audit logging. Used by the shared CRM WhatsApp composer across all org types.
async function handleDraftWhatsApp(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org } = verified;
  const context = body.context;
  if (!context || !context.purpose) {
    return Response.json({ error: "context.purpose is required" }, { status: 400 });
  }

  const prompt = buildWhatsAppMessagePrompt(org, context);

  let message;
  try {
    const aiResponse = await svc.integrations.Core.InvokeLLM({ prompt });
    message = typeof aiResponse === "string" ? aiResponse.trim() : String(aiResponse).trim();
  } catch (e) {
    return Response.json({ error: "AI service unavailable. Please try again." }, { status: 503 });
  }

  await writeAuditLog(svc, {
    organisation_id: org.id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "assistant.draft_whatsapp",
    after: {
      purpose: context.purpose,
      recipient: context.recipientName || "(audience)",
    },
  });

  return Response.json({ message });
}

// ---- SEND EMAIL (CRM bulk email) ----
// Sends a single email to a verified recipient using the existing SendEmail
// Core integration. Called once per recipient by the bulk email dialog —
// the client loops over the approved recipient list. Org membership is
// verified; the recipient email is validated as a non-empty string.
// Respects opt-outs: the client filters out inactive contacts before calling.
async function handleSendEmail(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org } = verified;
  const to = (body.to || "").trim();
  const subject = (body.subject || "").trim();
  const emailBody = (body.body || "").trim();
  if (!to || !subject || !emailBody) {
    return Response.json({ error: "to, subject and body are required" }, { status: 400 });
  }

  try {
    await svc.integrations.Core.SendEmail({ to, subject, body: emailBody });
  } catch (e) {
    return Response.json({ error: e.message || "Unable to send email" }, { status: 502 });
  }

  await writeAuditLog(svc, {
    organisation_id: org.id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "assistant.send_email",
    after: { to, subject: subject.slice(0, 80) },
  });

  return Response.json({ success: true });
}

// ---- EXPLAIN SIMPLY ----
// Explains a business insight in plain language for a non-expert owner. Reuses
// org membership verification, gatherData, buildModuleContext and InvokeLLM.
// Does NOT save to the conversation or count against the monthly allowance —
// it is a lightweight, contextual explanation, not a chat turn.
async function handleExplain(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org, membership } = verified;
  const dataMode = body.data_mode || "live";
  const moduleAccess = getModuleAccess(membership.role_in_org);
  const topic = (body.topic || "").trim();
  if (!topic) return Response.json({ error: "topic is required" }, { status: 400 });

  const data = await gatherData(svc, org, dataMode, moduleAccess);
  const prompt = buildExplainPrompt(org, moduleAccess, data, topic, body.figure);

  let explanation;
  try {
    const aiResponse = await svc.integrations.Core.InvokeLLM({ prompt });
    explanation = typeof aiResponse === "string" ? aiResponse.trim() : String(aiResponse).trim();
  } catch (e) {
    return Response.json({ error: "AI service unavailable. Please try again." }, { status: 503 });
  }

  await writeAuditLog(svc, {
    organisation_id: org.id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "assistant.explain",
    after: { topic, data_mode: dataMode },
  });

  return Response.json({ explanation });
}

// ---- GENERATE CONTENT (Content Centre) ----
// Generates a workspace-aware content pack (social post, reel idea, caption,
// hashtags, email, WhatsApp, short message, flyer copy) from a single topic.
// Reuses org membership verification, InvokeLLM and audit logging. Optionally
// regenerates a single content type when regenerate_type is provided.
async function handleGenerateContent(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org } = verified;
  const topic = (body.topic || "").trim();
  if (!topic) return Response.json({ error: "topic is required" }, { status: 400 });
  const contentTypes = body.content_types || [];
  if (!contentTypes.length) return Response.json({ error: "content_types is required" }, { status: 400 });

  const regenerate = body.regenerate_type
    ? { type: body.regenerate_type, existingPack: body.existing_pack || {} }
    : undefined;
  const prompt = buildContentPackPrompt(org, topic, contentTypes, regenerate);

  let pack;
  try {
    const aiResponse = await svc.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: contentPackSchema,
    });
    pack = typeof aiResponse === "string" ? JSON.parse(aiResponse) : aiResponse;
  } catch (e) {
    return Response.json({ error: "AI service unavailable. Please try again." }, { status: 503 });
  }

  await writeAuditLog(svc, {
    organisation_id: org.id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "assistant.generate_content",
    after: { topic, content_types: contentTypes, regenerate: body.regenerate_type || "" },
  });

  return Response.json({ pack });
}

// ---- AUDIT SOCIAL MEDIA (Content Centre) ----
// Performs a profile/content review of the user's social media presence based
// on information they provide (bio, recent posts, frequency, platforms). This
// is NOT a connected-data audit — no social account integrations are connected.
// Never invents private analytics. Returns a score, strengths, areas to improve,
// and actionable next steps with "Create this for me" content_type links.
async function handleAuditSocialMedia(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org } = verified;
  const auditInput = body.audit_input || {};
  if (!auditInput.profile_bio && !auditInput.recent_posts) {
    return Response.json({ error: "Please provide your profile bio or recent posts for FADS to review." }, { status: 400 });
  }

  const prompt = buildSocialAuditPrompt(org, auditInput);

  let audit;
  try {
    const aiResponse = await svc.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: socialAuditSchema,
    });
    audit = typeof aiResponse === "string" ? JSON.parse(aiResponse) : aiResponse;
  } catch (e) {
    return Response.json({ error: "AI service unavailable. Please try again." }, { status: 503 });
  }

  await writeAuditLog(svc, {
    organisation_id: org.id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "assistant.audit_social_media",
    after: { platforms: auditInput.platforms || [], audit_type: "profile_review" },
  });

  return Response.json({ audit });
}

// ---- DRAFT BULK REMINDERS (Collections) ----
// Drafts personalised reminders for multiple outstanding receivables in one
// LLM call. Each receivable must include a `key` (invoice id) so the caller
// can match the drafted message back to the correct account. Returns an
// object with a `reminders` array, each item containing the key and message.
async function handleDraftBulkReminders(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org } = verified;
  const receivables = body.receivables;
  if (!Array.isArray(receivables) || receivables.length === 0) {
    return Response.json({ error: "receivables array is required" }, { status: 400 });
  }
  if (receivables.length > 50) {
    return Response.json({ error: "Maximum 50 reminders per request" }, { status: 400 });
  }

  const prompt = buildBulkRemindersPrompt(org, receivables);

  let result;
  try {
    const aiResponse = await svc.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: bulkRemindersSchema,
    });
    result = typeof aiResponse === "string" ? JSON.parse(aiResponse) : aiResponse;
  } catch (e) {
    return Response.json({ error: "AI service unavailable. Please try again." }, { status: 503 });
  }

  await writeAuditLog(svc, {
    organisation_id: org.id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "assistant.draft_bulk_reminders",
    after: { count: receivables.length },
  });

  return Response.json({ reminders: result.reminders || [] });
}

// ---- PERSONALISE AFFILIATE RESOURCE ----
// Adapts an approved affiliate marketing message for a specific audience the
// affiliate describes (e.g. "a small beauty salon in Lagos"). Auth-only — no
// org membership required, since this is generic text adaptation with no org
// data. Grounded in real FADS features only; never invents features, never
// guarantees income, never uses spammy language.
async function handlePersonaliseResource(base44, user, body) {
  const svc = base44.asServiceRole;
  const original = (body.original_text || "").trim();
  const context = (body.context || "").trim();
  if (!original) {
    return Response.json({ error: "original_text is required" }, { status: 400 });
  }

  const prompt =
    "You are FADS AI. Adapt this approved affiliate marketing message for the audience described below. " +
    "Keep it honest and grounded only in real FADS features (Finance, HR, CRM, Content Centre, Canva templates, AI Assistant). " +
    "Do not invent features, do not guarantee income or results, do not use spammy or aggressive language, do not describe voluntary giving as debt. " +
    "Keep it natural and conversational. Return ONLY the adapted message text — no preamble, no quotes.\n\n" +
    "Original message:\n" + original + "\n\n" +
    "Audience context:\n" + (context || "(no specific context — keep it general)");

  let message;
  try {
    const aiResponse = await svc.integrations.Core.InvokeLLM({ prompt });
    message = typeof aiResponse === "string" ? aiResponse.trim() : String(aiResponse).trim();
  } catch (e) {
    return Response.json({ error: "AI service unavailable. Please try again." }, { status: 503 });
  }

  return Response.json({ message });
}

// ---- PARSE MONEY (Driver / Self-Employed) ----
// Parses a natural-language money message ("I earned €280 today and spent €45
// on fuel") into structured income/expense items for the user to review and
// approve. Does NOT create any records — the client creates them via the
// EXISTING finance create_transaction action only after the user approves.
// Grounds category suggestions in the org's real FinanceCategory list.
// Shared by the typed (parse_money) and voice (voice_money) entry points.
async function parseMoneyItems(svc, org, dataMode, text) {
  const categories = await svc.entities.FinanceCategory.filter({ organisation_id: org.id, data_mode: dataMode });
  const incomeCats = categories.filter((c) => c.kind === "income").map((c) => c.name);
  const expenseCats = categories.filter((c) => c.kind === "expense").map((c) => c.name);

  const prompt =
    "You are FADS AI, a business co-pilot for a taxi driver or self-employed person. " +
    "Parse the user's natural-language message into structured money records they can review and approve. " +
    "Identify each amount as income (money earned — fares, tips, card payments, platform payouts) or an expense (money spent — fuel, diesel, parking, tolls, insurance, servicing, cleaning, phone). " +
    "For each item, choose the closest category from the lists below. If unsure, use \"Other Income\" or \"Other Business Expenses\". " +
    "Detect the payment method if clearly mentioned (cash, card, bank_transfer, mobile_money); otherwise use \"cash\". " +
    "Do NOT invent amounts that are not in the message. If the message is ambiguous or contains no clear money information, return an empty items array and a short note explaining what you need. " +
    "Return ONLY JSON matching the schema.\n\n" +
    `Available income categories: ${incomeCats.join(", ") || "(none)"}\n` +
    `Available expense categories: ${expenseCats.join(", ") || "(none)"}\n` +
    `Currency: ${org.currency || ""}\n\n` +
    `Message: """${text}"""`;

  const schema = {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            direction: { type: "string", enum: ["in", "out"] },
            amount: { type: "number" },
            description: { type: "string" },
            category_name: { type: "string" },
            payment_method: { type: "string", enum: ["cash", "bank_transfer", "card", "mobile_money", "cheque", "other"] },
          },
          required: ["direction", "amount", "description"],
        },
      },
      note: { type: "string" },
    },
    required: ["items"],
  };

  let result;
  try {
    const aiResponse = await svc.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });
    result = typeof aiResponse === "string" ? JSON.parse(aiResponse) : aiResponse;
  } catch (e) {
    return { error: "AI service unavailable. Please try again.", status: 503 };
  }

  return { items: result.items || [], note: result.note || "", categories };
}

async function handleParseMoney(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org } = verified;
  const dataMode = body.data_mode || "live";
  const text = (body.text || "").trim();
  if (!text) return Response.json({ error: "text is required" }, { status: 400 });

  const parsed = await parseMoneyItems(svc, org, dataMode, text);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: parsed.status });

  await writeAuditLog(svc, {
    organisation_id: org.id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "assistant.parse_money",
    after: { text: text.slice(0, 120), items: parsed.items.length },
  });

  return Response.json(parsed);
}

// ---- VOICE MONEY (Driver / Self-Employed) ----
// Voice entry for "Talk to FADS". Reuses the EXISTING TranscribeAudio
// integration (Whisper) to turn a recorded audio file into text, then runs the
// SAME parseMoneyItems logic as the typed path. The client uploads the audio
// via the client-allowed UploadFile integration and passes the resulting
// audio_url here. Nothing is created — the user reviews and approves the
// prepared records on the client, exactly like the typed path.
async function handleVoiceMoney(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org } = verified;
  const dataMode = body.data_mode || "live";
  const audioUrl = (body.audio_url || "").trim();
  if (!audioUrl) return Response.json({ error: "audio_url is required" }, { status: 400 });

  // 1. Transcribe the recorded audio to text (Whisper, server-side).
  let transcript = "";
  try {
    const tr = await svc.integrations.Core.TranscribeAudio({ audio_url: audioUrl });
    transcript = (typeof tr === "string" ? tr : String(tr || "")).trim();
  } catch (e) {
    return Response.json({ error: "I couldn't transcribe that recording. Please try again or type it instead." }, { status: 503 });
  }
  if (!transcript) {
    return Response.json({ items: [], note: "I couldn't hear anything in that recording. Try speaking clearly, or type it instead.", transcript: "" });
  }

  // 2. Parse the transcript into structured money items (same logic as typed).
  const parsed = await parseMoneyItems(svc, org, dataMode, transcript);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: parsed.status });

  await writeAuditLog(svc, {
    organisation_id: org.id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "assistant.voice_money",
    after: { transcript: transcript.slice(0, 120), items: parsed.items.length },
  });

  return Response.json({ ...parsed, transcript });
}

// ---- DICTATE TRANSACTION (Finance dictation) ----
// Lightweight voice/text dictation for the Finance transaction entry form.
// Reuses the EXISTING TranscribeAudio (Whisper) + InvokeLLM + membership
// verification — no new transcription system. Parses ONE transaction from
// spoken or typed natural language and matches the contact and category to
// the org's real FinanceContact / FinanceCategory lists. Does NOT create any
// record — the client populates the existing TransactionForm for the user to
// review and save. Respects org, data mode and permissions via verifyMembership.
async function handleDictateTransaction(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org } = verified;
  const dataMode = body.data_mode || "live";

  // Transcribe-only step (two-phase live-caption flow): return the transcript
  // without running the LLM parse. The client then re-sends the text for parsing.
  if (body.parse === false) {
    let transcript = "";
    if (body.audio_url) {
      try {
        const tr = await svc.integrations.Core.TranscribeAudio({ audio_url: body.audio_url });
        transcript = (typeof tr === "string" ? tr : String(tr || "")).trim();
      } catch (e) {
        return Response.json({ error: "I couldn't transcribe that recording. Please try again or type it instead." }, { status: 503 });
      }
    } else {
      transcript = (body.text || "").trim();
    }
    return Response.json({ transcript });
  }

  // Source text: transcribe a recording (if provided) or use supplied text.
  let transcript = "";
  if (body.audio_url) {
    try {
      const tr = await svc.integrations.Core.TranscribeAudio({ audio_url: body.audio_url });
      transcript = (typeof tr === "string" ? tr : String(tr || "")).trim();
    } catch (e) {
      return Response.json({ error: "I couldn't transcribe that recording. Please try again or type it instead." }, { status: 503 });
    }
  } else {
    transcript = (body.text || "").trim();
  }
  if (!transcript) {
    return Response.json({ transaction: null, transcript: "", note: "I couldn't hear anything. Try speaking clearly, or type it instead." });
  }

  // Load the org's real accounts, categories and contacts for confident matching.
  const filter = { organisation_id: org.id, data_mode: dataMode };
  const [accounts, categories, contacts] = await Promise.all([
    svc.entities.FinanceAccount.filter(filter),
    svc.entities.FinanceCategory.filter(filter),
    svc.entities.FinanceContact.filter(filter),
  ]);
  const incomeCats = categories.filter((c) => c.kind === "income");
  const expenseCats = categories.filter((c) => c.kind === "expense");
  const today = new Date().toISOString().slice(0, 10);

  const prompt =
    "You are FADS AI, helping a small business owner record a single financial transaction by voice. " +
    "Parse the spoken message into ONE transaction. " +
    "Identify whether it is income (money in) or an expense (money out). " +
    "Extract the amount as a number, a short description, the date as ISO YYYY-MM-DD (use " + today + " if 'today' or no date is mentioned), " +
    "and the payment method if clearly stated (cash, bank_transfer, card, mobile_money, cheque, other). " +
    "If the owner names a specific account (e.g. 'from my bank account', 'paid in cash'), capture it as account_name using the closest name from the accounts list below. " +
    "If a customer or supplier name is mentioned, capture it as contact_name. " +
    "If a reference or invoice/receipt number is mentioned, capture it as reference. " +
    "Any extra context that is not the description goes into notes. " +
    "Choose the closest category from the lists below; if unsure, leave category_name empty. " +
    "Only populate fields you are confident about. Leave any uncertain field empty — do NOT invent values or amounts. " +
    "Return ONLY JSON matching the schema.\n\n" +
    "Available accounts: " + accounts.map((a) => a.name).join(", ") + "\n" +
    "Available income categories: " + incomeCats.map((c) => c.name).join(", ") + "\n" +
    "Available expense categories: " + expenseCats.map((c) => c.name).join(", ") + "\n" +
    "Known contacts (use one of these names exactly if it matches): " + contacts.map((c) => c.name).join(", ") + "\n" +
    "Currency: " + (org.currency || "") + "\n\n" +
    "Message: \"\"\"" + transcript + "\"\"\"";

  const schema = {
    type: "object",
    properties: {
      direction: { type: "string", enum: ["in", "out"] },
      amount: { type: "number" },
      description: { type: "string" },
      date: { type: "string" },
      payment_method: { type: "string", enum: ["cash", "bank_transfer", "card", "mobile_money", "cheque", "other"] },
      account_name: { type: "string" },
      contact_name: { type: "string" },
      category_name: { type: "string" },
      reference: { type: "string" },
      notes: { type: "string" },
    },
  };

  let parsed;
  try {
    const aiResponse = await svc.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });
    parsed = typeof aiResponse === "string" ? JSON.parse(aiResponse) : aiResponse;
  } catch (e) {
    return Response.json({ error: "AI service unavailable. Please try again." }, { status: 503 });
  }

  // Match account, category and contact to real record ids server-side.
  const account = accounts.find((a) => a.name.toLowerCase() === (parsed.account_name || "").toLowerCase());
  const catList = parsed.direction === "in" ? incomeCats : expenseCats;
  const category = catList.find((c) => c.name.toLowerCase() === (parsed.category_name || "").toLowerCase());
  const contact = contacts.find((c) => c.name.toLowerCase() === (parsed.contact_name || "").toLowerCase());

  const transaction = {
    direction: parsed.direction || "",
    amount: Number(parsed.amount) || 0,
    description: parsed.description || "",
    date: parsed.date || today,
    payment_method: parsed.payment_method || "",
    account_id: account ? account.id : "",
    account_name: parsed.account_name || "",
    contact_id: contact ? contact.id : "",
    contact_name: parsed.contact_name || "",
    category_id: category ? category.id : "",
    category_name: parsed.category_name || "",
    reference: parsed.reference || "",
    notes: parsed.notes || "",
  };

  await writeAuditLog(svc, {
    organisation_id: org.id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "assistant.dictate_transaction",
    after: { transcript: transcript.slice(0, 120), direction: transaction.direction, amount: transaction.amount },
  });

  return Response.json({ transaction, transcript });
}

// ---- DICTATE INVENTORY ITEM ----
// Voice/text dictation for the Inventory item entry form. Reuses the EXISTING
// TranscribeAudio (Whisper) + InvokeLLM + membership verification — no new
// service. Parses ONE inventory item from spoken or typed natural language and
// matches the supplier to the org's real FinanceContact (supplier) list. Does
// NOT create any record — the client populates the existing InventoryItemEdit
// form for the user to review and save. Respects org, data mode and permissions.
async function handleDictateInventoryItem(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org } = verified;
  const dataMode = body.data_mode || "live";

  // Transcribe-only step (two-phase live-caption flow).
  if (body.parse === false) {
    let transcript = "";
    if (body.audio_url) {
      try {
        const tr = await svc.integrations.Core.TranscribeAudio({ audio_url: body.audio_url });
        transcript = (typeof tr === "string" ? tr : String(tr || "")).trim();
      } catch (e) {
        return Response.json({ error: "I couldn't transcribe that recording. Please try again or type it instead." }, { status: 503 });
      }
    } else {
      transcript = (body.text || "").trim();
    }
    return Response.json({ transcript });
  }

  // Source text: transcribe a recording (if provided) or use supplied text.
  let transcript = "";
  if (body.audio_url) {
    try {
      const tr = await svc.integrations.Core.TranscribeAudio({ audio_url: body.audio_url });
      transcript = (typeof tr === "string" ? tr : String(tr || "")).trim();
    } catch (e) {
      return Response.json({ error: "I couldn't transcribe that recording. Please try again or type it instead." }, { status: 503 });
    }
  } else {
    transcript = (body.text || "").trim();
  }
  if (!transcript) {
    return Response.json({ item: null, transcript: "", note: "I couldn't hear anything. Try speaking clearly, or type it instead." });
  }

  // Load the org's real suppliers and existing item categories for matching.
  const suppliers = await svc.entities.FinanceContact.filter({ organisation_id: org.id, data_mode: dataMode, kind: "supplier" });
  const existingItems = await svc.entities.InventoryItem.filter({ organisation_id: org.id, data_mode: dataMode }, "-created_date", 200);
  const knownCategories = Array.from(new Set(existingItems.map((i) => i.category).filter(Boolean)));

  const prompt =
    "You are FADS AI, helping a small business owner add or update a single inventory item by voice. " +
    "Parse the spoken message into ONE inventory item. " +
    "Extract the exact item/product name and quantity mentioned (if any, as a number), the unit cost price and unit selling price as numbers. " +
    "Treat an unqualified price such as 'at 25,000 naira each' as the selling price; only set cost price when explicitly described as cost, purchase, or wholesale. " +
    "Recognise spoken number words (five, twenty) and thousand separators. Never turn a selling price into a cost price. " +
    "Extract a free-text category, supplier name, SKU/reference, and low-stock level only when mentioned. " +
    "Any extra context that is not the name goes into notes. " +
    "Keep product names verbatim; do not substitute a similar known item. Only set SKU and low-stock level when explicitly spoken. " +
    "Only populate fields you are confident about. Leave any uncertain field empty — do NOT invent values or prices. " +
    "Return ONLY JSON matching the schema.\n\n" +
    "Known categories (prefer one of these if it matches): " + knownCategories.join(", ") + "\n" +
    "Known suppliers (use one of these names exactly if it matches): " + suppliers.map((s) => s.name).join(", ") + "\n" +
    "Currency: " + (org.currency || "") + "\n\n" +
    "Message: \"\"\"" + transcript + "\"\"\"";

  const schema = {
    type: "object",
    properties: {
      name: { type: "string" },
      quantity: { type: "number" },
      cost_price: { type: "number" },
      selling_price: { type: "number" },
      category: { type: "string" },
      supplier_name: { type: "string" },
      sku: { type: "string" },
      low_stock_level: { type: "number" },
      notes: { type: "string" },
    },
  };

  let parsed;
  try {
    const aiResponse = await svc.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });
    parsed = typeof aiResponse === "string" ? JSON.parse(aiResponse) : aiResponse;
  } catch (e) {
    return Response.json({ error: "AI service unavailable. Please try again." }, { status: 503 });
  }

  // Match supplier to a real FinanceContact (supplier) record server-side.
  const supplier = suppliers.find((s) => s.name.toLowerCase() === (parsed.supplier_name || "").toLowerCase());

  const item = {
    name: parsed.name || "",
    sku: parsed.sku || "",
    category: parsed.category || "",
    supplier_id: supplier ? supplier.id : "",
    supplier_name: parsed.supplier_name || "",
    cost_price: parsed.cost_price == null ? null : Number(parsed.cost_price),
    selling_price: parsed.selling_price == null ? null : Number(parsed.selling_price),
    low_stock_level: parsed.low_stock_level == null ? null : Number(parsed.low_stock_level),
    quantity: parsed.quantity == null ? null : Number(parsed.quantity),
    notes: parsed.notes || "",
  };

  await writeAuditLog(svc, {
    organisation_id: org.id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "assistant.dictate_inventory_item",
    after: { transcript: transcript.slice(0, 120), name: item.name, quantity: item.quantity },
  });

  return Response.json({ item, transcript });
}

// ---- DRAFT INVOICE ----
// Prepares (never saves) an invoice draft from a user request. Matches the
// customer name to a real FinanceContact (customer/parent/member/donor). The
// client opens the existing InvoiceEdit form pre-filled with the draft for the
// user to review and save manually. Reuses membership verification, InvokeLLM
// and audit logging. Respects org, data mode and permissions.
async function handleDraftInvoice(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org } = verified;
  const dataMode = body.data_mode || "live";
  const request = body.request || {};

  const filter = { organisation_id: org.id, data_mode: dataMode };
  const contacts = await svc.entities.FinanceContact.filter(filter);
  const customers = contacts.filter((c) => ["customer", "parent", "member", "donor"].includes(c.kind));

  const prompt = buildInvoiceDraftPrompt(org, request, customers);
  let draft;
  try {
    const aiResponse = await svc.integrations.Core.InvokeLLM({ prompt, response_json_schema: invoiceDraftSchema });
    draft = typeof aiResponse === "string" ? JSON.parse(aiResponse) : aiResponse;
  } catch (e) {
    return Response.json({ error: "AI service unavailable. Please try again." }, { status: 503 });
  }

  const custName = (draft.customer_name || "").toLowerCase().trim();
  const match = customers.find((c) => c.name.toLowerCase() === custName)
    || (custName.length > 1 ? customers.find((c) => c.name.toLowerCase().includes(custName)) : undefined);

  const today = new Date().toISOString().slice(0, 10);
  const rawItems = (draft.line_items && draft.line_items.length)
    ? draft.line_items
    : [{ description: request.description || "", quantity: 1, unit_price: Number(request.amount) || 0, discount: 0, tax_rate: "" }];

  const invoice = {
    customer_id: match ? match.id : "",
    customer_name: match ? match.name : (draft.customer_name || ""),
    line_items: rawItems.map((it) => ({
      description: it.description || "",
      quantity: Number(it.quantity) || 1,
      unit_price: Number(it.unit_price) || 0,
      discount: Number(it.discount) || 0,
      tax_rate: it.tax_rate !== undefined && it.tax_rate !== null ? String(it.tax_rate) : "",
    })),
    issue_date: draft.issue_date || today,
    due_date: draft.due_date || "",
    notes: draft.notes || "",
    currency: org.currency,
  };

  let note = "";
  if (!match) {
    note = customers.length
      ? `I couldn't find a customer named "${draft.customer_name || ""}" in your records. Please select the correct customer in the invoice form.`
      : "No customers found in your records yet. Please add a customer in the invoice form before saving.";
  }

  await writeAuditLog(svc, {
    organisation_id: org.id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "assistant.draft_invoice",
    after: { customer: invoice.customer_name, matched: !!match, line_items: invoice.line_items.length },
  });

  return Response.json({ invoice, note, unmatched_customer: !match });
}

// ---- DRAFT RECEIPT ----
// Prepares (never saves) a receipt draft by matching the user's request to an
// existing cleared Money In transaction that hasn't already been receipted.
// Deterministic (no LLM) — matches by payer name then amount, suggests a kind
// based on org type. The client opens the existing ReceiptNew form pre-filled
// for the user to review and save manually. Reuses membership verification
// and audit logging. Respects org, data mode and permissions.
async function handleDraftReceipt(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org } = verified;
  const dataMode = body.data_mode || "live";
  const request = body.request || {};

  const filter = { organisation_id: org.id, data_mode: dataMode };
  const [transactions, receipts, contacts] = await Promise.all([
    svc.entities.FinanceTransaction.filter({ ...filter, direction: "in", status: "cleared" }, "-date", 200),
    svc.entities.Receipt.filter(filter),
    svc.entities.FinanceContact.filter(filter),
  ]);
  const receiptedTxnIds = new Set(receipts.map((r) => r.finance_transaction_id).filter(Boolean));
  const eligible = transactions.filter((t) => !receiptedTxnIds.has(t.id));

  const contactName = (id) => (contacts.find((c) => c.id === id) || {}).name || "";
  const reqName = (request.customer_name || "").toLowerCase().trim();
  const reqAmt = Number(request.amount) || 0;

  let best = null;
  if (reqName) {
    best = eligible.find((t) => contactName(t.contact_id).toLowerCase().includes(reqName))
      || eligible.find((t) => (t.description || "").toLowerCase().includes(reqName));
  }
  if (!best && reqAmt) {
    best = eligible.find((t) => Math.abs(Number(t.amount) - reqAmt) < 0.01);
  }
  if (!best && eligible.length) {
    best = eligible[0];
  }

  const kindByOrg = { school: "school_fee", church: "donation", university: "payment", small_business: "payment", taxi_driver: "payment", self_employed: "payment" };
  const suggestedKind = kindByOrg[org.type] || "payment";

  const receipt = best ? {
    finance_transaction_id: best.id,
    payer_name: contactName(best.contact_id) || request.customer_name || "",
    amount: Number(best.amount) || 0,
    currency: best.currency || org.currency,
    date: best.date,
    kind: suggestedKind,
    description: request.description || best.description || "",
  } : {
    finance_transaction_id: "",
    payer_name: request.customer_name || "",
    amount: reqAmt,
    currency: org.currency,
    date: new Date().toISOString().slice(0, 10),
    kind: suggestedKind,
    description: request.description || "",
  };

  const note = best
    ? ""
    : "No eligible recorded money-in transaction was found. Record the payment first in Money In, then prepare a receipt for it.";

  await writeAuditLog(svc, {
    organisation_id: org.id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "assistant.draft_receipt",
    after: { matched_transaction: !!best, payer: receipt.payer_name, amount: receipt.amount },
  });

  return Response.json({ receipt, note, matched_transaction: !!best });
}