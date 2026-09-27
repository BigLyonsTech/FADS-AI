import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { getActiveMembership, writeAuditLog } from "../../shared/workspace.ts";
import {
  suggestedQuestions,
  searchTranscripts,
  buildTranscriptContext,
  buildSystemPrompt,
  buildConversationHistory,
  buildActionPrompt,
  checkUsage,
  officerResponseSchema,
} from "../../shared/transcribeOfficer.ts";
import { getOrCreateConversation, getCurrentMonthKey } from "../../shared/officerBackend.ts";

// Transcribe Officer backend function. Enforces org isolation, RLS,
// audit logging, and usage limits. All AI calls use InvokeLLM (no external keys).

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
      case "run_action":
        return await handleRunAction(base44, user, body);
      case "save_draft":
        return await handleSaveDraft(base44, user, body);
      case "list_drafts":
        return await handleListDrafts(base44, user, body);
      case "delete_draft":
        return await handleDeleteDraft(base44, user, body);
      case "delete_conversation":
        return await handleDeleteConversation(base44, user, body);
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

// ---- Get or create conversation (shared helper) ----
async function getConversation(svc, user, org) {
  return getOrCreateConversation(svc, "TranscribeOfficerConversation", user, org);
}

// ---- Fetch sessions with filters ----
async function fetchSessions(svc, org, filters) {
  const filter = { organisation_id: org.id };
  if (filters?.folder_id) filter.folder_id = filters.folder_id;
  if (filters?.session_type) filter.session_type = filters.session_type;

  let sessions = await svc.entities.TranscriptSession.filter(filter, "-session_date", 200);
  sessions = sessions.filter((s) => !s.is_archived);

  if (filters?.tag) {
    sessions = sessions.filter((s) => (s.tags || []).includes(filters.tag));
  }
  if (filters?.participant) {
    sessions = sessions.filter((s) => (s.participants || []).some((p) => p.toLowerCase().includes(filters.participant.toLowerCase())));
  }
  if (filters?.date_from) {
    sessions = sessions.filter((s) => s.session_date && s.session_date >= filters.date_from);
  }
  if (filters?.date_to) {
    sessions = sessions.filter((s) => s.session_date && s.session_date <= filters.date_to);
  }

  return sessions;
}

// ---- Fetch segments for sessions ----
async function fetchSegmentsForSessions(svc, org, sessionIds) {
  const segmentsBySession = {};
  for (const sid of sessionIds) {
    const segments = await svc.entities.TranscriptSegment.filter({
      organisation_id: org.id,
      session_id: sid,
    });
    segments.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    segmentsBySession[sid] = segments;
  }
  return segmentsBySession;
}

// ---- GET CONVERSATION ----
async function handleGetConversation(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org } = verified;
  const conversation = await getConversation(svc, user, org);
  const usage = checkUsage(conversation);
  const suggestions = suggestedQuestions();

  return Response.json({
    conversation,
    suggestions,
    status: usage,
    data_mode: org.data_mode,
  });
}

// ---- ASK ----
async function handleAsk(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org } = verified;
  const conversation = await getConversation(svc, user, org);
  const usage = checkUsage(conversation);
  if (!usage.allowed) {
    return Response.json({ error: usage.reason }, { status: 429 });
  }

  const question = (body.question || "").trim();
  if (!question) return Response.json({ error: "Question is required" }, { status: 400 });

  // Fetch and search sessions
  const allSessions = await fetchSessions(svc, org, body.filters);
  const relevantSessions = searchTranscripts(allSessions, question, 8);
  const segmentsBySession = await fetchSegmentsForSessions(svc, org, relevantSessions.map((s) => s.id));

  // Build prompt
  const systemPrompt = buildSystemPrompt(org);
  const history = buildConversationHistory(conversation.messages);
  const context = buildTranscriptContext(relevantSessions, segmentsBySession);
  const fullPrompt = `${systemPrompt}\n\n${history}\n\n${context}\n\nQuestion: ${question}`;

  // Call LLM
  let responseData;
  try {
    const aiResponse = await svc.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      response_json_schema: officerResponseSchema,
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
    filters: body.filters || null,
  };
  const officerMsg = {
    role: "officer",
    content: responseData.answer || "I was unable to generate a response.",
    timestamp: now,
    citations: responseData.citations || [],
    period_note: responseData.period_note || "",
    insufficient_data: responseData.insufficient_data || false,
  };

  // Update conversation
  const monthKey = getCurrentMonthKey();
  const newCount = conversation.current_month_key === monthKey ? conversation.current_month_count + 1 : 1;
  const updated = await svc.entities.TranscribeOfficerConversation.update(conversation.id, {
    messages: [...(conversation.messages || []), userMsg, officerMsg],
    current_month_key: monthKey,
    current_month_count: newCount,
  });

  const newUsage = checkUsage(updated);

  await writeAuditLog(svc, {
    organisation_id: org.id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "transcribe.officer.ask",
    entity_type: "TranscriptSession",
    after: {
      question,
      sources_accessed: relevantSessions.map((s) => s.id),
      filters: body.filters,
    },
  });

  return Response.json({
    response: officerMsg,
    conversation: updated,
    status: newUsage,
  });
}

// ---- RUN ACTION ----
async function handleRunAction(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org } = verified;
  const conversation = await getConversation(svc, user, org);
  const usage = checkUsage(conversation);
  if (!usage.allowed) {
    return Response.json({ error: usage.reason }, { status: 429 });
  }

  const actionType = body.action_type;
  if (!actionType) return Response.json({ error: "action_type is required" }, { status: 400 });

  // Gather sessions
  let sessions;
  if (body.session_ids && body.session_ids.length > 0) {
    // Use selected sessions
    sessions = [];
    for (const sid of body.session_ids) {
      const s = await svc.entities.TranscriptSession.get(sid);
      if (s && s.organisation_id === org.id && !s.is_archived) sessions.push(s);
    }
  } else if (body.session_id) {
    // Single session (for draft_minutes)
    const s = await svc.entities.TranscriptSession.get(body.session_id);
    if (s && s.organisation_id === org.id) sessions = [s];
  } else {
    // Use all sessions with filters
    sessions = await fetchSessions(svc, org, body.filters);
  }

  if (sessions.length === 0) {
    const now = new Date().toISOString();
    const actionLabel = {
      find_decisions: "Find decisions across meetings",
      find_action_points: "Find incomplete or overdue action points",
      compare_themes: "Compare themes across transcripts",
      draft_briefing: "Draft a briefing from selected records",
      draft_agenda: "Draft a follow-up agenda",
      draft_minutes: "Draft minutes from a transcript",
    }[actionType] || actionType;

    const userMsg = { role: "user", content: actionLabel, timestamp: now, citations: [], action_type: actionType };
    const officerMsg = {
      role: "officer",
      content: "I don't have enough transcripts to perform this action. Try adjusting your filters or add more transcripts first.",
      timestamp: now,
      citations: [],
      period_note: "No transcripts found",
      insufficient_data: true,
      action_type: actionType,
    };

    const updated = await svc.entities.TranscribeOfficerConversation.update(conversation.id, {
      messages: [...(conversation.messages || []), userMsg, officerMsg],
    });

    return Response.json({ response: officerMsg, conversation: updated, status: checkUsage(updated) });
  }

  const segmentsBySession = await fetchSegmentsForSessions(svc, org, sessions.map((s) => s.id));

  // Build prompt
  const systemPrompt = buildSystemPrompt(org);
  const actionPrompt = buildActionPrompt(actionType, sessions, segmentsBySession);
  const fullPrompt = `${systemPrompt}\n\n${actionPrompt}`;

  // Call LLM
  let responseData;
  try {
    const aiResponse = await svc.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      response_json_schema: officerResponseSchema,
    });
    responseData = typeof aiResponse === "string" ? JSON.parse(aiResponse) : aiResponse;
  } catch (e) {
    return Response.json({ error: "AI service unavailable. Please try again." }, { status: 503 });
  }

  // Build messages
  const now = new Date().toISOString();
  const actionLabel = {
    find_decisions: "Find decisions across meetings",
    find_action_points: "Find incomplete or overdue action points",
    compare_themes: "Compare themes across transcripts",
    draft_briefing: "Draft a briefing from selected records",
    draft_agenda: "Draft a follow-up agenda",
    draft_minutes: "Draft minutes from a transcript",
  }[actionType] || actionType;

  const userMsg = { role: "user", content: actionLabel, timestamp: now, citations: [], action_type: actionType };
  const officerMsg = {
    role: "officer",
    content: responseData.answer || "I was unable to generate a response.",
    timestamp: now,
    citations: responseData.citations || [],
    period_note: responseData.period_note || "",
    insufficient_data: responseData.insufficient_data || false,
    action_type: actionType,
  };

  // Update conversation
  const monthKey = getCurrentMonthKey();
  const newCount = conversation.current_month_key === monthKey ? conversation.current_month_count + 1 : 1;
  const updated = await svc.entities.TranscribeOfficerConversation.update(conversation.id, {
    messages: [...(conversation.messages || []), userMsg, officerMsg],
    current_month_key: monthKey,
    current_month_count: newCount,
  });

  const newUsage = checkUsage(updated);

  await writeAuditLog(svc, {
    organisation_id: org.id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "transcribe.officer.action",
    entity_type: "TranscriptSession",
    after: {
      action_type: actionType,
      sources_accessed: sessions.map((s) => s.id),
    },
  });

  return Response.json({
    response: officerMsg,
    conversation: updated,
    status: newUsage,
  });
}

// ---- SAVE DRAFT ----
async function handleSaveDraft(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const conversation = await getConversation(svc, user, verified.org);
  const draft = {
    draft_id: crypto.randomUUID(),
    draft_type: body.draft_type || "answer",
    title: (body.title || "Untitled draft").slice(0, 200),
    content: body.content || "",
    saved_date: new Date().toISOString(),
  };

  const updated = await svc.entities.TranscribeOfficerConversation.update(conversation.id, {
    saved_drafts: [...(conversation.saved_drafts || []), draft],
  });

  await writeAuditLog(svc, {
    organisation_id: verified.org.id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "transcribe.officer.save_draft",
    after: { draft_type: draft.draft_type, title: draft.title },
  });

  return Response.json({ draft, conversation: updated });
}

// ---- LIST DRAFTS ----
async function handleListDrafts(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const conversation = await getConversation(svc, user, verified.org);
  return Response.json({ drafts: conversation.saved_drafts || [] });
}

// ---- DELETE DRAFT ----
async function handleDeleteDraft(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const conversation = await getConversation(svc, user, verified.org);
  const updated = await svc.entities.TranscribeOfficerConversation.update(conversation.id, {
    saved_drafts: (conversation.saved_drafts || []).filter((d) => d.draft_id !== body.draft_id),
  });

  return Response.json({ conversation: updated });
}

// ---- DELETE CONVERSATION ----
async function handleDeleteConversation(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const conversation = await getConversation(svc, user, verified.org);
  await svc.entities.TranscribeOfficerConversation.update(conversation.id, {
    messages: [],
    saved_drafts: [],
    current_month_count: 0,
  });

  await writeAuditLog(svc, {
    organisation_id: verified.org.id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "transcribe.officer.delete_conversation",
  });

  return Response.json({ success: true });
}