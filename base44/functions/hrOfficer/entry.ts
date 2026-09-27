import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { getActiveMembership } from "../../shared/workspace.ts";
import { stripRestrictedFields } from "../../shared/hr.ts";
import { todayISO } from "../../shared/hrBackend.ts";
import {
  buildSystemPrompt,
  buildHrContext,
  buildConversationHistory,
  buildBriefing,
  suggestedQuestions,
  demoSeedMessages,
  getCurrentMonthKey,
  checkUsage,
  determineAccessLevel,
  officerResponseSchema,
} from "../../shared/hrOfficer.ts";

// Read-only AI HR Officer. Answers are restricted to the active organisation
// and filtered by the user's access level (hr_admin, manager, employee).
// The AI can never approve leave, hire/fire, edit records, or send messages.
//
// Actions:
//   get_conversation — returns conversation, status, suggestions
//   ask — sends a question, gets an AI response with citations
//   delete_conversation — clears the conversation
//   get_briefing — returns today's HR briefing (computed from data)
//   save_draft — saves a draft to the conversation
//   list_drafts — returns saved drafts
//   delete_draft — deletes a saved draft
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
      case "get_briefing":
        return await handleGetBriefing(base44, user, body);
      case "save_draft":
        return await handleSaveDraft(base44, user, body);
      case "list_drafts":
        return await handleListDrafts(base44, user, body);
      case "delete_draft":
        return await handleDeleteDraft(base44, user, body);
      default:
        return Response.json({ error: "Unknown action: " + action }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ---- Verify org membership and determine access level ----
async function verifyAndLoad(svc, user, organisation_id) {
  const membership = await getActiveMembership(svc, user.id, organisation_id);
  if (!membership) {
    return { error: "Not a member of this organisation", status: 403 };
  }

  const org = await svc.entities.Organisation.get(organisation_id);
  if (!org) {
    return { error: "Organisation not found", status: 404 };
  }

  if (org.access_status === "paused" || org.access_status === "cancelled") {
    return { error: "Organisation access is " + org.access_status, status: 403 };
  }

  // Load all employees to find the user's record and direct reports
  const allEmployees = await svc.entities.Employee.filter({ organisation_id });

  const myEmployee = allEmployees.find(
    (e) => (e.email || "").toLowerCase() === (user.email || "").toLowerCase()
  );

  const teamEmployeeIds = myEmployee
    ? allEmployees.filter((e) => e.manager_id === myEmployee.id).map((e) => e.id)
    : [];

  const hasDirectReports = teamEmployeeIds.length > 0;
  const accessLevel = determineAccessLevel(membership.role_in_org, hasDirectReports);

  return { org, membership, accessLevel, allEmployees, myEmployee, teamEmployeeIds };
}

// ---- Load all HR data and filter by access level ----
async function loadHrData(svc, organisation_id, user, accessLevel, allEmployees, myEmployee, teamEmployeeIds) {
  const [
    allLeaveRequests,
    allLeaveBalances,
    leaveTypes,
    allAttendance,
    complianceItems,
    allOnboarding,
    allOffboarding,
    allDocuments,
  ] = await Promise.all([
    svc.entities.LeaveRequest.filter({ organisation_id }),
    svc.entities.LeaveBalance.filter({ organisation_id }),
    svc.entities.LeaveType.filter({ organisation_id }),
    svc.entities.AttendanceRecord.filter({ organisation_id }, "-date", 200),
    accessLevel !== "employee"
      ? svc.entities.ComplianceItem.filter({ organisation_id })
      : Promise.resolve([]),
    svc.entities.OnboardingChecklist.filter({ organisation_id }),
    svc.entities.OffboardingChecklist.filter({ organisation_id }),
    svc.entities.EmployeeDocument.filter({ organisation_id }),
  ]);

  // Filter employees by access level
  let employees;
  if (accessLevel === "hr_admin") {
    employees = allEmployees;
  } else if (accessLevel === "manager") {
    employees = allEmployees.filter((e) => teamEmployeeIds.includes(e.id));
  } else {
    employees = myEmployee ? [myEmployee] : [];
  }

  // Strip restricted fields for non-hr_admin
  if (accessLevel !== "hr_admin") {
    employees = employees.map(stripRestrictedFields);
  }

  // Filter records by employee IDs
  const filterByEmployee = (records) => {
    if (accessLevel === "hr_admin") return records;
    if (accessLevel === "manager") return records.filter((r) => teamEmployeeIds.includes(r.employee_id));
    return records.filter((r) => myEmployee && r.employee_id === myEmployee.id);
  };

  const leaveRequests = filterByEmployee(allLeaveRequests);
  const leaveBalances = filterByEmployee(allLeaveBalances);
  const attendanceRecords = filterByEmployee(allAttendance);
  const onboardingItems = filterByEmployee(allOnboarding);
  const offboardingItems = filterByEmployee(allOffboarding);

  // Filter documents
  let documents;
  if (accessLevel === "hr_admin") {
    documents = allDocuments;
  } else if (accessLevel === "manager") {
    documents = allDocuments.filter(
      (d) => teamEmployeeIds.includes(d.employee_id) && d.confidentiality_level !== "restricted"
    );
  } else {
    documents = allDocuments.filter(
      (d) => myEmployee && d.employee_id === myEmployee.id && d.shared_with_employee === true
    );
  }

  return {
    employees,
    leaveRequests,
    leaveBalances,
    leaveTypes,
    attendanceRecords,
    complianceItems,
    onboardingItems,
    offboardingItems,
    documents,
    myEmployeeId: myEmployee?.id,
    teamEmployeeIds,
  };
}

// ---- GET CONVERSATION ----
async function handleGetConversation(base44, user, body) {
  const organisation_id = body.organisation_id;
  if (!organisation_id) return Response.json({ error: "organisation_id required" }, { status: 400 });

  const svc = base44.asServiceRole;
  const verified = await verifyAndLoad(svc, user, organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org, accessLevel } = verified;

  // Load or create conversation
  const existingConv = await svc.entities.HrOfficerConversation.filter({
    organisation_id,
    user_id: user.id,
  });

  let conversation = existingConv[0] || null;

  // Seed demo conversation for demo-mode orgs
  if (!conversation && org.data_mode === "demo") {
    const seedMsgs = demoSeedMessages(org.type);
    conversation = await svc.entities.HrOfficerConversation.create({
      organisation_id,
      user_id: user.id,
      user_email: user.email,
      access_level: accessLevel,
      messages: seedMsgs,
      current_month_key: getCurrentMonthKey(),
      current_month_count: 0,
      data_mode: "demo",
    });
  }

  const usage = checkUsage(conversation);
  const suggestions = suggestedQuestions(org.type, accessLevel);

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
    access_level: accessLevel,
    data_mode: org.data_mode,
  });
}

// ---- ASK ----
async function handleAsk(base44, user, body) {
  const organisation_id = body.organisation_id;
  const question = (body.question || "").trim();

  if (!organisation_id) return Response.json({ error: "organisation_id required" }, { status: 400 });
  if (!question) return Response.json({ error: "Question is required" }, { status: 400 });
  if (question.length > 1000) return Response.json({ error: "Question too long (max 1000 characters)" }, { status: 400 });

  const svc = base44.asServiceRole;
  const verified = await verifyAndLoad(svc, user, organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org, accessLevel, allEmployees, myEmployee, teamEmployeeIds } = verified;

  // Load conversation
  const existingConv = await svc.entities.HrOfficerConversation.filter({
    organisation_id,
    user_id: user.id,
  });
  let conversation = existingConv[0] || null;

  // Check usage
  const usage = checkUsage(conversation);
  if (!usage.allowed) {
    return Response.json({ error: usage.reason || "HR Officer unavailable" }, { status: 403 });
  }

  // Load HR data filtered by access level
  const data = await loadHrData(svc, organisation_id, user, accessLevel, allEmployees, myEmployee, teamEmployeeIds);

  // Build prompt
  const systemPrompt = buildSystemPrompt(org, accessLevel);
  const hrContext = buildHrContext(org, accessLevel, data);
  const history = buildConversationHistory(conversation?.messages || []);

  const fullPrompt = [
    systemPrompt,
    "",
    hrContext,
    "",
    history,
    "",
    "=== CURRENT QUESTION ===",
    question,
    "",
    "Respond in JSON format with: answer, citations, period_note, insufficient_data.",
  ].filter(Boolean).join("\n");

  // Call InvokeLLM
  let llmResponse;
  try {
    llmResponse = await svc.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      response_json_schema: officerResponseSchema,
    });
  } catch (e) {
    return Response.json({ error: "AI service temporarily unavailable. Please try again." }, { status: 503 });
  }

  // Parse response
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
    officerMessage = {
      answer: "I couldn't process that request. Please try rephrasing your question.",
      citations: [],
      period_note: "",
      insufficient_data: true,
    };
  }

  const answer = String(officerMessage.answer || "I couldn't generate a response.");
  const citations = Array.isArray(officerMessage.citations) ? officerMessage.citations : [];
  const period_note = String(officerMessage.period_note || "");
  const insufficient_data = Boolean(officerMessage.insufficient_data);

  // Build messages
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
    await svc.entities.HrOfficerConversation.update(conversation.id, {
      messages: updatedMessages,
      current_month_key: monthKey,
      current_month_count: updatedCount,
      access_level: accessLevel,
    });
    conversation.messages = updatedMessages;
    conversation.current_month_count = updatedCount;
  } else {
    conversation = await svc.entities.HrOfficerConversation.create({
      organisation_id,
      user_id: user.id,
      user_email: user.email,
      access_level: accessLevel,
      messages: [userMsg, officerMsg],
      current_month_key: monthKey,
      current_month_count: 1,
      data_mode: org.data_mode || "live",
    });
  }

  const updatedUsage = checkUsage(conversation);

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

  const svc = base44.asServiceRole;
  const existing = await svc.entities.HrOfficerConversation.filter({
    organisation_id,
    user_id: user.id,
  });

  if (existing[0]) {
    await svc.entities.HrOfficerConversation.delete(existing[0].id);
  }

  return Response.json({ success: true });
}

// ---- GET BRIEFING ----
async function handleGetBriefing(base44, user, body) {
  const organisation_id = body.organisation_id;
  if (!organisation_id) return Response.json({ error: "organisation_id required" }, { status: 400 });

  const svc = base44.asServiceRole;
  const verified = await verifyAndLoad(svc, user, organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org, accessLevel, allEmployees, myEmployee, teamEmployeeIds } = verified;

  const data = await loadHrData(svc, organisation_id, user, accessLevel, allEmployees, myEmployee, teamEmployeeIds);
  const briefing = buildBriefing(org, accessLevel, data);

  return Response.json({ briefing });
}

// ---- SAVE DRAFT ----
async function handleSaveDraft(base44, user, body) {
  const organisation_id = body.organisation_id;
  const draft_type = body.draft_type;
  const title = (body.title || "").trim();
  const content = (body.content || "").trim();

  if (!organisation_id) return Response.json({ error: "organisation_id required" }, { status: 400 });
  if (!draft_type || !title || !content) {
    return Response.json({ error: "draft_type, title and content are required" }, { status: 400 });
  }

  const svc = base44.asServiceRole;
  const existing = await svc.entities.HrOfficerConversation.filter({
    organisation_id,
    user_id: user.id,
  });

  let conversation = existing[0];
  if (!conversation) {
    conversation = await svc.entities.HrOfficerConversation.create({
      organisation_id,
      user_id: user.id,
      user_email: user.email,
      messages: [],
      saved_drafts: [],
      current_month_key: getCurrentMonthKey(),
      current_month_count: 0,
      data_mode: "live",
    });
  }

  const draft = {
    draft_id: crypto.randomUUID(),
    draft_type,
    title,
    content,
    saved_date: new Date().toISOString(),
  };

  const updatedDrafts = [...(conversation.saved_drafts || []), draft];
  await svc.entities.HrOfficerConversation.update(conversation.id, {
    saved_drafts: updatedDrafts,
  });

  return Response.json({ success: true, draft });
}

// ---- LIST DRAFTS ----
async function handleListDrafts(base44, user, body) {
  const organisation_id = body.organisation_id;
  if (!organisation_id) return Response.json({ error: "organisation_id required" }, { status: 400 });

  const svc = base44.asServiceRole;
  const existing = await svc.entities.HrOfficerConversation.filter({
    organisation_id,
    user_id: user.id,
  });

  return Response.json({ drafts: existing[0]?.saved_drafts || [] });
}

// ---- DELETE DRAFT ----
async function handleDeleteDraft(base44, user, body) {
  const organisation_id = body.organisation_id;
  const draft_id = body.draft_id;
  if (!organisation_id || !draft_id) {
    return Response.json({ error: "organisation_id and draft_id required" }, { status: 400 });
  }

  const svc = base44.asServiceRole;
  const existing = await svc.entities.HrOfficerConversation.filter({
    organisation_id,
    user_id: user.id,
  });

  if (!existing[0]) return Response.json({ error: "Conversation not found" }, { status: 404 });

  const updatedDrafts = (existing[0].saved_drafts || []).filter((d) => d.draft_id !== draft_id);
  await svc.entities.HrOfficerConversation.update(existing[0].id, {
    saved_drafts: updatedDrafts,
  });

  return Response.json({ success: true });
}