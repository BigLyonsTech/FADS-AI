import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { getActiveMembership, writeAuditLog } from "../../shared/workspace.ts";
import { demoSeedSessions, buildAITranscriptPrompt, matchesSearch } from "../../shared/transcribe.ts";

// Transcribe backend function. All operations enforce org isolation
// (organisation_id set server-side), role-based access (active membership
// required), and audit logging. RLS on all five transcript entities denies
// direct client writes, so only this function can create/update/delete.

// Actions:
//   list_sessions — list sessions for the active org (optional folder/tag/status filter)
//   get_session — get a session with its segments and speakers
//   create_session — create a new session
//   update_session — update session metadata or status
//   save_segments — replace all segments (and speakers) for a session
//   delete_session — delete a session and its segments/speakers
//   list_folders_tags — list folders and tags
//   create_folder / delete_folder
//   create_tag / delete_tag
//   seed_demo — seed demo data for demo-mode orgs
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const action = body.action;

    switch (action) {
      case "list_sessions":
        return await handleListSessions(base44, user, body);
      case "get_session":
        return await handleGetSession(base44, user, body);
      case "create_session":
        return await handleCreateSession(base44, user, body);
      case "update_session":
        return await handleUpdateSession(base44, user, body);
      case "save_segments":
        return await handleSaveSegments(base44, user, body);
      case "delete_session":
        return await handleDeleteSession(base44, user, body);
      case "list_folders_tags":
        return await handleListFoldersTags(base44, user, body);
      case "create_folder":
        return await handleCreateFolder(base44, user, body);
      case "delete_folder":
        return await handleDeleteFolder(base44, user, body);
      case "create_tag":
        return await handleCreateTag(base44, user, body);
      case "delete_tag":
        return await handleDeleteTag(base44, user, body);
      case "seed_demo":
        return await handleSeedDemo(base44, user, body);
      case "generate_ai":
        return await handleGenerateAI(base44, user, body);
      case "toggle_favourite":
        return await handleToggleFavourite(base44, user, body);
      case "archive_session":
        return await handleArchiveSession(base44, user, body);
      case "update_review_status":
        return await handleUpdateReviewStatus(base44, user, body);
      case "import_text":
        return await handleImportText(base44, user, body);
      case "rename_folder":
        return await handleRenameFolder(base44, user, body);
      case "get_imported_file_url":
        return await handleGetImportedFileUrl(base44, user, body);
      case "transcribe_audio":
        return await handleTranscribeAudio(base44, user, body);
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

// ---- LIST SESSIONS ----
async function handleListSessions(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org } = verified;
  const dm = body.data_mode || org.data_mode;
  const filter = { organisation_id: org.id, data_mode: dm };
  if (body.folder_id) filter.folder_id = body.folder_id;
  if (body.status) filter.status = body.status;
  if (body.session_type) filter.session_type = body.session_type;

  let sessions = await svc.entities.TranscriptSession.filter(filter, "-session_date", 200);

  // Exclude archived by default; include if body.include_archived; show only archived if body.archived_only
  if (body.archived_only) {
    sessions = sessions.filter((s) => s.is_archived);
  } else if (!body.include_archived) {
    sessions = sessions.filter((s) => !s.is_archived);
  }

  // Tag filter (post-filter since tags is an array)
  if (body.tag) {
    sessions = sessions.filter((s) => (s.tags || []).includes(body.tag));
  }

  // Favourite filter
  if (body.favourite_only) {
    sessions = sessions.filter((s) => s.is_favourite);
  }

  // Date range filter
  if (body.date_from) {
    sessions = sessions.filter((s) => s.session_date && s.session_date >= body.date_from);
  }
  if (body.date_to) {
    sessions = sessions.filter((s) => s.session_date && s.session_date <= body.date_to);
  }

  // Search across title, participants, text, summary, decisions, action points
  if (body.search) {
    sessions = sessions.filter((s) => matchesSearch(s, body.search));
  }

  // Seed demo data if empty and demo mode (only on unfiltered, unsearched requests)
  if (sessions.length === 0 && org.data_mode === "demo" && dm === "demo" && !body.skip_seed && !body.search && !body.favourite_only && !body.archived_only) {
    await seedDemoData(svc, org);
    sessions = await svc.entities.TranscriptSession.filter({ organisation_id: org.id, data_mode: dm }, "-session_date", 200);
    if (!body.include_archived) {
      sessions = sessions.filter((s) => !s.is_archived);
    }
  }

  return Response.json({ sessions });
}

// ---- GET SESSION ----
async function handleGetSession(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const session = await svc.entities.TranscriptSession.get(body.session_id);
  if (!session || session.organisation_id !== body.organisation_id) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const segments = await svc.entities.TranscriptSegment.filter({
    organisation_id: body.organisation_id,
    session_id: body.session_id,
  });
  segments.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

  const speakers = await svc.entities.TranscriptSpeaker.filter({
    organisation_id: body.organisation_id,
    session_id: body.session_id,
  });

  return Response.json({ session, segments, speakers });
}

// ---- CREATE SESSION ----
async function handleCreateSession(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org } = verified;
  const title = (body.title || "").trim();
  if (!title) return Response.json({ error: "Title is required" }, { status: 400 });

  let folder_name = "";
  if (body.folder_id) {
    const folder = await svc.entities.TranscriptFolder.get(body.folder_id);
    if (folder && folder.organisation_id === org.id) folder_name = folder.name;
  }

  const session = await svc.entities.TranscriptSession.create({
    organisation_id: org.id,
    title,
    session_type: body.session_type || "other",
    session_date: body.session_date || new Date().toISOString(),
    language: body.language || "en",
    status: body.status || "draft",
    participants: Array.isArray(body.participants) ? body.participants : [],
    folder_id: body.folder_id || null,
    folder_name,
    tags: Array.isArray(body.tags) ? body.tags : [],
    segment_count: 0,
    duration_seconds: 0,
    full_text: "",
    notes: body.notes || "",
    summary: "",
    minutes: "",
    decisions: [],
    action_points: [],
    lecture_notes: "",
    review_status: "draft",
    ai_generated_date: null,
    is_favourite: false,
    is_archived: false,
    imported_file_uri: null,
    imported_file_name: null,
    created_by: user.id,
    created_by_name: user.full_name || user.email,
    data_mode: body.data_mode || org.data_mode || "live",
  });

  await writeAuditLog(svc, {
    organisation_id: org.id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "transcribe.session.create",
    entity_type: "TranscriptSession",
    entity_id: session.id,
    after: { title: session.title, session_type: session.session_type },
  });

  return Response.json({ session });
}

// ---- UPDATE SESSION ----
async function handleUpdateSession(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const existing = await svc.entities.TranscriptSession.get(body.session_id);
  if (!existing || existing.organisation_id !== body.organisation_id) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const updates = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.session_type !== undefined) updates.session_type = body.session_type;
  if (body.session_date !== undefined) updates.session_date = body.session_date;
  if (body.language !== undefined) updates.language = body.language;
  if (body.status !== undefined) updates.status = body.status;
  if (body.participants !== undefined) updates.participants = body.participants;
  if (body.folder_id !== undefined) {
    updates.folder_id = body.folder_id;
    if (body.folder_id) {
      const folder = await svc.entities.TranscriptFolder.get(body.folder_id);
      updates.folder_name = folder && folder.organisation_id === body.organisation_id ? folder.name : "";
    } else {
      updates.folder_name = "";
    }
  }
  if (body.tags !== undefined) updates.tags = body.tags;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.summary !== undefined) updates.summary = body.summary;
  if (body.minutes !== undefined) updates.minutes = body.minutes;
  if (body.decisions !== undefined) updates.decisions = body.decisions;
  if (body.action_points !== undefined) updates.action_points = body.action_points;
  if (body.lecture_notes !== undefined) updates.lecture_notes = body.lecture_notes;
  if (body.review_status !== undefined) updates.review_status = body.review_status;
  if (body.is_favourite !== undefined) updates.is_favourite = body.is_favourite;
  if (body.is_archived !== undefined) updates.is_archived = body.is_archived;

  const updated = await svc.entities.TranscriptSession.update(body.session_id, updates);

  await writeAuditLog(svc, {
    organisation_id: body.organisation_id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "transcribe.session.update",
    entity_type: "TranscriptSession",
    entity_id: body.session_id,
    before: existing,
    after: updates,
  });

  return Response.json({ session: updated });
}

// ---- SAVE SEGMENTS (replace all) ----
async function handleSaveSegments(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org } = verified;
  const session = await svc.entities.TranscriptSession.get(body.session_id);
  if (!session || session.organisation_id !== body.organisation_id) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const segments = Array.isArray(body.segments) ? body.segments : [];
  const speakers = Array.isArray(body.speakers) ? body.speakers : [];

  // Delete existing segments and speakers
  await svc.entities.TranscriptSegment.deleteMany({
    organisation_id: body.organisation_id,
    session_id: body.session_id,
  });
  await svc.entities.TranscriptSpeaker.deleteMany({
    organisation_id: body.organisation_id,
    session_id: body.session_id,
  });

  // Create new segments
  if (segments.length > 0) {
    const segmentRecords = segments.map((s, i) => ({
      organisation_id: body.organisation_id,
      session_id: body.session_id,
      sequence: s.sequence !== undefined ? s.sequence : i,
      speaker_name: s.speaker_name || "",
      start_time: s.start_time || 0,
      end_time: s.end_time || 0,
      text: s.text || "",
      confidence: s.confidence || null,
      is_final: s.is_final !== false,
      data_mode: body.data_mode || org.data_mode || "live",
    }));
    await svc.entities.TranscriptSegment.bulkCreate(segmentRecords);
  }

  // Create new speakers
  if (speakers.length > 0) {
    const speakerRecords = speakers
      .filter((sp) => sp.name && sp.name.trim())
      .map((sp) => ({
        organisation_id: body.organisation_id,
        session_id: body.session_id,
        name: sp.name.trim(),
        role: sp.role || "",
        data_mode: body.data_mode || org.data_mode || "live",
      }));
    if (speakerRecords.length > 0) {
      await svc.entities.TranscriptSpeaker.bulkCreate(speakerRecords);
    }
  }

  // Update session summary
  const fullText = segments.map((s) => s.text || "").join(" ").trim();
  const duration = segments.length > 0
    ? Math.max(...segments.map((s) => s.end_time || 0))
    : 0;
  const updated = await svc.entities.TranscriptSession.update(body.session_id, {
    segment_count: segments.length,
    duration_seconds: Math.round(duration),
    full_text: fullText,
  });

  await writeAuditLog(svc, {
    organisation_id: body.organisation_id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "transcribe.segments.save",
    entity_type: "TranscriptSession",
    entity_id: body.session_id,
    after: { segment_count: segments.length, duration_seconds: Math.round(duration) },
  });

  return Response.json({ success: true, session: updated });
}

// ---- DELETE SESSION ----
async function handleDeleteSession(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const session = await svc.entities.TranscriptSession.get(body.session_id);
  if (!session || session.organisation_id !== body.organisation_id) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  await svc.entities.TranscriptSegment.deleteMany({
    organisation_id: body.organisation_id,
    session_id: body.session_id,
  });
  await svc.entities.TranscriptSpeaker.deleteMany({
    organisation_id: body.organisation_id,
    session_id: body.session_id,
  });
  await svc.entities.TranscriptSession.delete(body.session_id);

  await writeAuditLog(svc, {
    organisation_id: body.organisation_id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "transcribe.session.delete",
    entity_type: "TranscriptSession",
    entity_id: body.session_id,
    before: session,
  });

  return Response.json({ success: true });
}

// ---- LIST FOLDERS AND TAGS ----
async function handleListFoldersTags(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const dm = body.data_mode || org.data_mode;
  const [folders, tags] = await Promise.all([
    svc.entities.TranscriptFolder.filter({ organisation_id: body.organisation_id, data_mode: dm }, "name"),
    svc.entities.TranscriptTag.filter({ organisation_id: body.organisation_id, data_mode: dm }, "name"),
  ]);

  return Response.json({ folders, tags });
}

// ---- CREATE FOLDER ----
async function handleCreateFolder(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org } = verified;
  const name = (body.name || "").trim();
  if (!name) return Response.json({ error: "Folder name required" }, { status: 400 });

  const folder = await svc.entities.TranscriptFolder.create({
    organisation_id: org.id,
    name,
    description: body.description || "",
    color: body.color || "#173b5e",
    data_mode: body.data_mode || org.data_mode || "live",
  });

  return Response.json({ folder });
}

// ---- DELETE FOLDER ----
async function handleDeleteFolder(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const folder = await svc.entities.TranscriptFolder.get(body.folder_id);
  if (!folder || folder.organisation_id !== body.organisation_id) {
    return Response.json({ error: "Folder not found" }, { status: 404 });
  }

  // Clear folder_id on sessions in this folder
  const sessions = await svc.entities.TranscriptSession.filter({
    organisation_id: body.organisation_id,
    folder_id: body.folder_id,
  });
  if (sessions.length > 0) {
    await svc.entities.TranscriptSession.bulkUpdate(
      sessions.map((s) => ({ id: s.id, folder_id: null, folder_name: "" }))
    );
  }

  await svc.entities.TranscriptFolder.delete(body.folder_id);
  return Response.json({ success: true });
}

// ---- CREATE TAG ----
async function handleCreateTag(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org } = verified;
  const name = (body.name || "").trim();
  if (!name) return Response.json({ error: "Tag name required" }, { status: 400 });

  const tag = await svc.entities.TranscriptTag.create({
    organisation_id: org.id,
    name,
    color: body.color || "#1a8a8a",
    data_mode: body.data_mode || org.data_mode || "live",
  });

  return Response.json({ tag });
}

// ---- DELETE TAG ----
async function handleDeleteTag(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const tag = await svc.entities.TranscriptTag.get(body.tag_id);
  if (!tag || tag.organisation_id !== body.organisation_id) {
    return Response.json({ error: "Tag not found" }, { status: 404 });
  }

  await svc.entities.TranscriptTag.delete(body.tag_id);
  return Response.json({ success: true });
}

// ---- SEED DEMO ----
async function handleSeedDemo(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

  const { org } = verified;
  if (org.data_mode !== "demo") {
    return Response.json({ error: "Demo seeding only available in demo mode" }, { status: 400 });
  }

  await seedDemoData(svc, org);
  return Response.json({ success: true });
}

// ---- Helper: seed demo data ----
async function seedDemoData(svc, org) {
  // Idempotent: skip if demo sessions already exist for this org
  const existing = await svc.entities.TranscriptSession.filter({ organisation_id: org.id, data_mode: "demo" });
  if (existing.length > 0) return;
  const seed = demoSeedSessions(org.id, org.type);

  // Create folders
  const folderMap = {};
  for (const f of seed.folders) {
    const created = await svc.entities.TranscriptFolder.create(f);
    folderMap[f.name] = created.id;
  }

  // Create tags
  const tagMap = {};
  for (const t of seed.tags) {
    const created = await svc.entities.TranscriptTag.create(t);
    tagMap[t.name] = created.id;
  }

  // Create sessions with segments
  for (let i = 0; i < seed.sessions.length; i++) {
    const s = seed.sessions[i];
    // Assign first folder to first session
    if (i === 0 && seed.folders.length > 0) {
      s.folder_id = folderMap[seed.folders[0].name];
      s.folder_name = seed.folders[0].name;
    }
    const created = await svc.entities.TranscriptSession.create(s);

    // Create segments
    const segs = seed.segmentsBySession[i] || [];
    if (segs.length > 0) {
      await svc.entities.TranscriptSegment.bulkCreate(
        segs.map((seg) => ({ ...seg, session_id: created.id }))
      );
    }

    // Create speakers
    const speakerNames = [...new Set(segs.map((seg) => seg.speaker_name).filter(Boolean))];
    if (speakerNames.length > 0) {
    await svc.entities.TranscriptSpeaker.bulkCreate(
    speakerNames.map((name) => ({
      organisation_id: org.id,
      session_id: created.id,
      name,
      role: name === "Chair" ? "Chair" : "Participant",
      data_mode: "demo",
    }))
    );
    }
    }
    }

    // ---- GENERATE AI (Meeting Intelligence) ----
    async function handleGenerateAI(base44, user, body) {
    const svc = base44.asServiceRole;
    const verified = await verifyMembership(svc, user, body.organisation_id);
    if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

    const { org } = verified;
    const session = await svc.entities.TranscriptSession.get(body.session_id);
    if (!session || session.organisation_id !== body.organisation_id) {
    return Response.json({ error: "Session not found" }, { status: 404 });
    }

    const segments = await svc.entities.TranscriptSegment.filter({
    organisation_id: body.organisation_id,
    session_id: body.session_id,
    });
    segments.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

    const segmentsText = segments.map((s) => {
    const speaker = s.speaker_name ? `${s.speaker_name}: ` : "";
    return `${speaker}${s.text}`;
    }).join("\n");

    if (!segmentsText.trim()) {
    return Response.json({ error: "Cannot generate AI drafts for an empty transcript" }, { status: 400 });
    }

    const prompt = buildAITranscriptPrompt(session, segmentsText, org.type);
    const responseSchema = {
    type: "object",
    properties: {
    summary: { type: "string" },
    minutes: { type: "string" },
    decisions: { type: "array", items: { type: "string" } },
    action_points: {
    type: "array",
    items: {
      type: "object",
      properties: {
        text: { type: "string" },
        owner: { type: "string" },
        due_date: { type: "string" },
      },
    },
    },
    lecture_notes: { type: "string" },
    },
    };

    const aiResponse = await svc.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: responseSchema,
    });

    const aiData = typeof aiResponse === "string" ? JSON.parse(aiResponse) : aiResponse;

    const updates = {
    summary: aiData.summary || "",
    minutes: aiData.minutes || "",
    decisions: (aiData.decisions || []).map((text) => ({ text, approved: false })),
    action_points: (aiData.action_points || []).map((ap) => ({
    text: ap.text || "",
    owner: ap.owner || "",
    due_date: ap.due_date || "",
    status: "open",
    approved: false,
    })),
    lecture_notes: aiData.lecture_notes || "",
    review_status: "draft",
    ai_generated_date: new Date().toISOString(),
    };

    const updated = await svc.entities.TranscriptSession.update(body.session_id, updates);

    await writeAuditLog(svc, {
    organisation_id: body.organisation_id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "transcribe.ai.generate",
    entity_type: "TranscriptSession",
    entity_id: body.session_id,
    after: { ai_generated: true },
    });

    return Response.json({ session: updated });
    }

    // ---- TOGGLE FAVOURITE ----
    async function handleToggleFavourite(base44, user, body) {
    const svc = base44.asServiceRole;
    const verified = await verifyMembership(svc, user, body.organisation_id);
    if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

    const session = await svc.entities.TranscriptSession.get(body.session_id);
    if (!session || session.organisation_id !== body.organisation_id) {
    return Response.json({ error: "Session not found" }, { status: 404 });
    }

    const updated = await svc.entities.TranscriptSession.update(body.session_id, {
    is_favourite: !session.is_favourite,
    });

    await writeAuditLog(svc, {
    organisation_id: body.organisation_id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "transcribe.session.favourite",
    entity_type: "TranscriptSession",
    entity_id: body.session_id,
    after: { is_favourite: updated.is_favourite },
    });

    return Response.json({ session: updated });
    }

    // ---- ARCHIVE SESSION ----
    async function handleArchiveSession(base44, user, body) {
    const svc = base44.asServiceRole;
    const verified = await verifyMembership(svc, user, body.organisation_id);
    if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

    const session = await svc.entities.TranscriptSession.get(body.session_id);
    if (!session || session.organisation_id !== body.organisation_id) {
    return Response.json({ error: "Session not found" }, { status: 404 });
    }

    const archived = body.archived !== undefined ? body.archived : !session.is_archived;
    const updated = await svc.entities.TranscriptSession.update(body.session_id, { is_archived: archived });

    await writeAuditLog(svc, {
    organisation_id: body.organisation_id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: archived ? "transcribe.session.archive" : "transcribe.session.unarchive",
    entity_type: "TranscriptSession",
    entity_id: body.session_id,
    });

    return Response.json({ session: updated });
    }

    // ---- UPDATE REVIEW STATUS ----
    async function handleUpdateReviewStatus(base44, user, body) {
    const svc = base44.asServiceRole;
    const verified = await verifyMembership(svc, user, body.organisation_id);
    if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

    const session = await svc.entities.TranscriptSession.get(body.session_id);
    if (!session || session.organisation_id !== body.organisation_id) {
    return Response.json({ error: "Session not found" }, { status: 404 });
    }

    const updates = {
    review_status: body.review_status,
    reviewed_by: user.id,
    reviewed_by_name: user.full_name || user.email,
    reviewed_date: new Date().toISOString().slice(0, 10),
    };

    const updated = await svc.entities.TranscriptSession.update(body.session_id, updates);

    await writeAuditLog(svc, {
    organisation_id: body.organisation_id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "transcribe.review.update",
    entity_type: "TranscriptSession",
    entity_id: body.session_id,
    after: { review_status: body.review_status },
    });

    return Response.json({ session: updated });
    }

    // ---- IMPORT TEXT ----
    async function handleImportText(base44, user, body) {
    const svc = base44.asServiceRole;
    const verified = await verifyMembership(svc, user, body.organisation_id);
    if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

    const { org } = verified;
    const title = (body.title || "").trim();
    const text = (body.text || "").trim();
    if (!title) return Response.json({ error: "Title is required" }, { status: 400 });
    if (!text) return Response.json({ error: "Transcript text is required" }, { status: 400 });

    let folder_name = "";
    if (body.folder_id) {
    const folder = await svc.entities.TranscriptFolder.get(body.folder_id);
    if (folder && folder.organisation_id === org.id) folder_name = folder.name;
    }

    const session = await svc.entities.TranscriptSession.create({
    organisation_id: org.id,
    title,
    session_type: body.session_type || "other",
    session_date: body.session_date || new Date().toISOString(),
    language: body.language || "en",
    status: "draft",
    participants: Array.isArray(body.participants) ? body.participants : [],
    folder_id: body.folder_id || null,
    folder_name,
    tags: Array.isArray(body.tags) ? body.tags : [],
    segment_count: 0,
    duration_seconds: 0,
    full_text: text,
    notes: body.notes || "",
    summary: "",
    minutes: "",
    decisions: [],
    action_points: [],
    lecture_notes: "",
    review_status: "draft",
    ai_generated_date: null,
    is_favourite: false,
    is_archived: false,
    imported_file_uri: body.imported_file_uri || null,
    imported_file_name: body.imported_file_name || null,
    created_by: user.id,
    created_by_name: user.full_name || user.email,
    data_mode: body.data_mode || org.data_mode || "live",
    });

    // Split text into segments by newlines
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length > 0) {
    await svc.entities.TranscriptSegment.bulkCreate(
    lines.map((line, i) => ({
    organisation_id: org.id,
    session_id: session.id,
    sequence: i,
    speaker_name: "",
    start_time: 0,
    end_time: 0,
    text: line,
    is_final: true,
    data_mode: body.data_mode || org.data_mode || "live",
    }))
    );
    }

    const updated = await svc.entities.TranscriptSession.update(session.id, {
    segment_count: lines.length,
    });

    await writeAuditLog(svc, {
    organisation_id: org.id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "transcribe.session.import",
    entity_type: "TranscriptSession",
    entity_id: session.id,
    after: { title, segment_count: lines.length, imported_file_name: body.imported_file_name },
    });

    return Response.json({ session: updated });
    }

    // ---- RENAME FOLDER ----
    async function handleRenameFolder(base44, user, body) {
    const svc = base44.asServiceRole;
    const verified = await verifyMembership(svc, user, body.organisation_id);
    if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

    const folder = await svc.entities.TranscriptFolder.get(body.folder_id);
    if (!folder || folder.organisation_id !== body.organisation_id) {
    return Response.json({ error: "Folder not found" }, { status: 404 });
    }

    const name = (body.name || "").trim();
    if (!name) return Response.json({ error: "Folder name required" }, { status: 400 });

    const updated = await svc.entities.TranscriptFolder.update(body.folder_id, {
    name,
    description: body.description !== undefined ? body.description : folder.description,
    color: body.color || folder.color,
    });

    // Update folder_name snapshot on sessions in this folder
    const sessions = await svc.entities.TranscriptSession.filter({
    organisation_id: body.organisation_id,
    folder_id: body.folder_id,
    });
    if (sessions.length > 0) {
    await svc.entities.TranscriptSession.bulkUpdate(
    sessions.map((s) => ({ id: s.id, folder_name: name }))
    );
    }

    return Response.json({ folder: updated });
    }

    // ---- GET IMPORTED FILE URL ----
    async function handleGetImportedFileUrl(base44, user, body) {
    const svc = base44.asServiceRole;
    const verified = await verifyMembership(svc, user, body.organisation_id);
    if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });

    const session = await svc.entities.TranscriptSession.get(body.session_id);
    if (!session || session.organisation_id !== body.organisation_id) {
    return Response.json({ error: "Session not found" }, { status: 404 });
    }

    if (!session.imported_file_uri) {
    return Response.json({ error: "No imported file for this session" }, { status: 404 });
    }

    const result = await svc.integrations.Core.CreateFileSignedUrl({
    file_uri: session.imported_file_uri,
    expires_in: 300,
    });

    await writeAuditLog(svc, {
    organisation_id: body.organisation_id,
    actor_user_id: user.id,
    actor_user_email: user.email,
    action: "transcribe.imported_file.download",
    entity_type: "TranscriptSession",
    entity_id: body.session_id,
    });

    return Response.json({ signed_url: result.signed_url });
    }

// ---- TRANSCRIBE AUDIO (Whisper) ----
// Receives an uploaded audio file URL and returns the transcribed text.
// Used by the mobile recording flow where the browser Web Speech API is
// unavailable (e.g. Android WebView). Audio is uploaded client-side via
// UploadFile; transcription runs server-side via Core TranscribeAudio.
async function handleTranscribeAudio(base44, user, body) {
  const svc = base44.asServiceRole;
  const verified = await verifyMembership(svc, user, body.organisation_id);
  if (verified.error) return Response.json({ error: verified.error }, { status: verified.status });
  if (!body.file_url) return Response.json({ error: "file_url is required" }, { status: 400 });
  const result = await svc.integrations.Core.TranscribeAudio({ audio_url: body.file_url });
  const transcript = typeof result === "string" ? result : (result && (result.text || result.transcript)) || "";
  return Response.json({ transcript });
}