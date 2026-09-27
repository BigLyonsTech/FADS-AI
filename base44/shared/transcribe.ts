// Shared logic for the FADS AI Transcribe module (Phase 3A + 3B).
// Provides session-type labels, language options, org-type-aware wording,
// AI prompt builder, search helper, and demo seed data. All data filtering
// and org isolation are enforced server-side by the transcribe backend function.

// ---- Session types ----
export const TRANSCRIBE_SESSION_TYPES = [
  { value: "business_meeting", label: "Business Meeting", icon: "Briefcase" },
  { value: "lecture", label: "Lecture", icon: "GraduationCap" },
  { value: "government_council", label: "Government & Council", icon: "Landmark" },
  { value: "interview", label: "Interview", icon: "UserCircle" },
  { value: "voice_note", label: "Voice Note", icon: "Mic" },
  { value: "other", label: "Other", icon: "FileAudio" },
];

export function sessionTypeLabel(value) {
  const t = TRANSCRIBE_SESSION_TYPES.find((s) => s.value === value);
  return t ? t.label : "Other";
}

// ---- Languages (ISO-639-1) ----
export const TRANSCRIBE_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "en-GB", label: "English (UK)" },
  { value: "en-US", label: "English (US)" },
  { value: "en-NG", label: "English (Nigeria)" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
  { value: "nl", label: "Dutch" },
  { value: "pl", label: "Polish" },
  { value: "tr", label: "Turkish" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "ig", label: "Igbo" },
  { value: "yo", label: "Yoruba" },
];

export function languageLabel(value) {
  const l = TRANSCRIBE_LANGUAGES.find((l) => l.value === value);
  return l ? l.label : value || "English";
}

// ---- Review statuses ----
export const REVIEW_STATUSES = [
  { value: "draft", label: "Draft", color: "#6b7280" },
  { value: "in_review", label: "In Review", color: "#1a8a8a" },
  { value: "approved", label: "Approved", color: "#2d8659" },
  { value: "rejected", label: "Rejected", color: "#c0392b" },
];

export function reviewStatusLabel(value) {
  const r = REVIEW_STATUSES.find((r) => r.value === value);
  return r ? r.label : "Draft";
}

// ---- Action point statuses ----
export const ACTION_POINT_STATUSES = [
  { value: "open", label: "Open", color: "#1a8a8a" },
  { value: "done", label: "Done", color: "#2d8659" },
  { value: "cancelled", label: "Cancelled", color: "#6b7280" },
];

// ---- Search helper ----
// Searches across title, participants, full_text, summary, minutes,
// decisions, and action points. Case-insensitive.
export function matchesSearch(session, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  const decisionsText = (session.decisions || [])
    .map((d) => (typeof d === "string" ? d : d.text || ""))
    .join(" ");
  const actionPointsText = (session.action_points || [])
    .map((a) => (typeof a === "string" ? a : a.text || ""))
    .join(" ");
  const fields = [
    session.title || "",
    (session.participants || []).join(" "),
    session.full_text || "",
    session.summary || "",
    session.minutes || "",
    decisionsText,
    actionPointsText,
    session.lecture_notes || "",
  ];
  return fields.some((f) => f.toLowerCase().includes(q));
}

// ---- AI prompt builder ----
// Builds the prompt for the InvokeLLM call to generate Meeting Intelligence drafts.
export function buildAITranscriptPrompt(session, segmentsText, orgType) {
  const isLecture = session.session_type === "lecture";
  const participants = (session.participants || []).join(", ");
  const typeLabel = sessionTypeLabel(session.session_type);

  return `You are an AI assistant helping to review a ${typeLabel} transcript for a ${orgType || "business"} organisation.

Session title: ${session.title}
Session type: ${typeLabel}
Participants: ${participants || "Not specified"}

Transcript:
${segmentsText}

Generate the following outputs. All outputs are DRAFTS that require human review.

1. summary: A concise summary of the session (2-3 paragraphs).
2. minutes: Draft meeting minutes in a formal format, covering key discussions and outcomes.
3. decisions: Key decisions or resolutions made during the session (array of clear, concise statements).
4. action_points: Action points extracted from the session, each with:
   - text: The action to be taken
   - owner: The person responsible (if mentioned in the transcript, otherwise empty string)
   - due_date: The due date in YYYY-MM-DD format (if mentioned, otherwise empty string)
${isLecture ? "5. lecture_notes: Structured lecture notes covering the key topics and concepts." : "5. lecture_notes: Empty string (this is not a lecture)."}

Important guidelines:
- Do not fabricate information. If something is unclear, note it.
- For action points, only extract clear actions, not discussion points.
- For decisions, only include clear decisions or resolutions, not opinions or suggestions.
- Keep all outputs concise and factual.
- These are drafts — a human will review and approve them before they become official.`;
}

// ---- Demo seed data for demo-mode orgs ----
// Org-type-aware: each workspace type gets two contextually relevant
// sample transcripts. Fictional names and content only.
export function demoSeedSessions(orgId, orgType) {
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();

  const base = (overrides) => ({
    organisation_id: orgId,
    session_type: "business_meeting",
    session_date: yesterday,
    language: "en",
    status: "completed",
    participants: [],
    tags: [],
    segment_count: 0,
    duration_seconds: 0,
    full_text: "",
    notes: "",
    summary: "",
    minutes: "",
    decisions: [],
    action_points: [],
    lecture_notes: "",
    review_status: "draft",
    is_favourite: false,
    is_archived: false,
    created_by_name: "Demo User",
    data_mode: "demo",
    ...overrides,
  });

  const seg = (sequence, speaker_name, start, end, text) => ({
    organisation_id: orgId, sequence, speaker_name, start_time: start, end_time: end, text, is_final: true, data_mode: "demo",
  });

  let sessions, segmentsBySession, folders, tags;

  if (orgType === "school") {
    sessions = [
      base({
        title: "Staff Meeting - Term Planning",
        participants: ["Head Teacher", "Staff"],
        tags: ["Staff", "Planning"],
        segment_count: 4, duration_seconds: 95,
        full_text: "Welcome everyone to our term planning meeting. First item: the exam schedule for next term. We need to confirm dates by Friday. Mary will coordinate the science exams. Any concerns? No, let's move to the next item.",
        summary: "Staff met to plan the upcoming term. The exam schedule was discussed, with Mary assigned to coordinate science exams. Dates must be confirmed by Friday.",
        minutes: "1. Head Teacher opened the meeting. 2. Exam schedule for next term discussed. 3. Mary assigned to coordinate science exams. 4. Dates to be confirmed by Friday.",
        decisions: [{ text: "Confirm exam dates by Friday", approved: false }],
        action_points: [{ text: "Coordinate science exam schedule", owner: "Mary", due_date: "", status: "open", approved: false }],
      }),
      base({
        title: "Parent-Teacher Meeting - Year 5",
        session_date: lastWeek,
        participants: ["Head Teacher", "Parent", "Teacher"],
        tags: ["Parents", "Year 5"],
        segment_count: 3, duration_seconds: 80,
        full_text: "Thank you for coming in today. James has been making great progress in maths. His reading has also improved significantly. We'd like to suggest some extra practice at home. Yes, we can definitely do that. Thank you for the update.",
        summary: "A parent-teacher meeting discussed James's progress in maths and reading. Extra home practice was suggested and the parent agreed.",
        minutes: "1. Head Teacher welcomed the parent. 2. Progress in maths and reading noted. 3. Extra home practice suggested. 4. Parent agreed to support.",
        decisions: [],
        action_points: [{ text: "Provide extra reading practice materials", owner: "Teacher", due_date: "", status: "open", approved: false }],
      }),
    ];
    segmentsBySession = [
      [seg(0, "Head Teacher", 0, 20, "Welcome everyone to our term planning meeting."), seg(1, "Head Teacher", 20, 45, "First item: the exam schedule for next term. We need to confirm dates by Friday."), seg(2, "Mary", 45, 75, "Mary will coordinate the science exams. Any concerns?"), seg(3, "Head Teacher", 75, 95, "No, let's move to the next item.")],
      [seg(0, "Head Teacher", 0, 25, "Thank you for coming in today. James has been making great progress in maths."), seg(1, "Teacher", 25, 55, "His reading has also improved significantly. We'd like to suggest some extra practice at home."), seg(2, "Parent", 55, 80, "Yes, we can definitely do that. Thank you for the update.")],
    ];
    folders = [{ organisation_id: orgId, name: "Staff Meetings", description: "Staff and planning meetings", color: "#173b5e", data_mode: "demo" }];
    tags = [{ organisation_id: orgId, name: "Staff", color: "#1a8a8a", data_mode: "demo" }, { organisation_id: orgId, name: "Parents", color: "#8b5cf6", data_mode: "demo" }, { organisation_id: orgId, name: "Planning", color: "#6b7280", data_mode: "demo" }];

  } else if (orgType === "university") {
    sessions = [
      base({
        title: "Introduction to Data Structures - Lecture 3",
        session_type: "lecture",
        participants: ["Prof. O'Sullivan"],
        tags: ["Lecture", "Computer Science"],
        segment_count: 4, duration_seconds: 150,
        full_text: "Today we'll cover linked lists. A linked list is a linear data structure where elements are stored in nodes. Each node contains data and a reference to the next node. Unlike arrays, linked lists do not require contiguous memory. The main advantage is efficient insertion and deletion. The disadvantage is that random access is not possible.",
        summary: "Lecture covered linked lists as a linear data structure. Nodes contain data and a reference to the next node. Advantages (efficient insertion/deletion) and disadvantages (no random access) were discussed.",
        lecture_notes: "Topic: Linked Lists\n- Linear data structure, nodes with data + next pointer\n- Non-contiguous memory\n- O(1) insertion/deletion at known position\n- O(n) random access\n- Compare with arrays: arrays have O(1) access, O(n) insertion",
        minutes: "",
        decisions: [],
        action_points: [{ text: "Review linked list implementation before next class", owner: "", due_date: "", status: "open", approved: false }],
        review_status: "in_review",
      }),
      base({
        title: "Department Meeting - Faculty of Science",
        session_date: lastWeek,
        participants: ["Dean", "Prof. O'Sullivan", "Dr. Murphy"],
        tags: ["Department", "Faculty"],
        segment_count: 3, duration_seconds: 110,
        full_text: "Let's discuss the research budget allocation for next year. The science faculty has requested additional funding for laboratory equipment. We can allocate 15% more if we reduce the administrative overhead. I agree with that approach. Let's finalize the numbers by end of month.",
        summary: "The department discussed research budget allocation. The science faculty's request for laboratory equipment funding was considered, with a proposed 15% increase offset by reduced administrative overhead.",
        minutes: "1. Dean opened the meeting. 2. Research budget allocation discussed. 3. 15% increase proposed with admin overhead reduction. 4. Numbers to be finalized by month-end.",
        decisions: [{ text: "Allocate 15% more to laboratory equipment by reducing administrative overhead", approved: false }],
        action_points: [{ text: "Finalize research budget numbers", owner: "Dean", due_date: "", status: "open", approved: false }],
      }),
    ];
    segmentsBySession = [
      [seg(0, "Prof. O'Sullivan", 0, 40, "Today we'll cover linked lists. A linked list is a linear data structure where elements are stored in nodes."), seg(1, "Prof. O'Sullivan", 40, 80, "Each node contains data and a reference to the next node. Unlike arrays, linked lists do not require contiguous memory."), seg(2, "Prof. O'Sullivan", 80, 120, "The main advantage is efficient insertion and deletion."), seg(3, "Prof. O'Sullivan", 120, 150, "The disadvantage is that random access is not possible.")],
      [seg(0, "Dean", 0, 40, "Let's discuss the research budget allocation for next year."), seg(1, "Prof. O'Sullivan", 40, 80, "The science faculty has requested additional funding for laboratory equipment."), seg(2, "Dean", 80, 110, "We can allocate 15% more if we reduce the administrative overhead. I agree with that approach. Let's finalize the numbers by end of month.")],
    ];
    folders = [{ organisation_id: orgId, name: "Lectures", description: "Recorded lectures", color: "#173b5e", data_mode: "demo" }, { organisation_id: orgId, name: "Department Meetings", description: "Faculty and department meetings", color: "#1a8a8a", data_mode: "demo" }];
    tags = [{ organisation_id: orgId, name: "Lecture", color: "#1a8a8a", data_mode: "demo" }, { organisation_id: orgId, name: "Department", color: "#6b7280", data_mode: "demo" }, { organisation_id: orgId, name: "Computer Science", color: "#8b5cf6", data_mode: "demo" }];

  } else if (orgType === "church") {
    sessions = [
      base({
        title: "Sunday Service - 11 AM",
        session_type: "other",
        participants: ["Pastor Paul", "Congregation"],
        tags: ["Service", "Sunday"],
        segment_count: 4, duration_seconds: 200,
        full_text: "Welcome to this morning's service. Let us begin with a word of prayer. Lord, we thank you for this day and for bringing us together. Today's message is about hope and perseverance. In difficult times, we are called to trust and keep moving forward. Let us close with a song of thanksgiving.",
        summary: "Sunday service included opening prayer, a message on hope and perseverance, and a closing song. The message encouraged trust during difficult times.",
        minutes: "1. Welcome and opening prayer. 2. Message on hope and perseverance. 3. Call to trust in difficult times. 4. Closing song of thanksgiving.",
        decisions: [],
        action_points: [],
        review_status: "approved",
        is_favourite: true,
        reviewed_by_name: "Demo User",
        reviewed_date: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10),
      }),
      base({
        title: "Leadership Team Meeting",
        session_date: lastWeek,
        participants: ["Pastor Paul", "Worship Leader", "Administrator"],
        tags: ["Leadership", "Planning"],
        segment_count: 3, duration_seconds: 90,
        full_text: "Let's review the upcoming events calendar. We have the community outreach next Saturday. Samuel will coordinate volunteers. We also need to finalize the budget for the youth programme. Grace, can you prepare the worship schedule? Yes, I'll have it ready by Wednesday.",
        summary: "The leadership team reviewed the events calendar, including community outreach and the youth programme budget. Volunteer coordination and worship scheduling were assigned.",
        minutes: "1. Events calendar reviewed. 2. Community outreach planned for next Saturday. 3. Samuel to coordinate volunteers. 4. Grace to prepare worship schedule by Wednesday.",
        decisions: [{ text: "Proceed with community outreach next Saturday", approved: true }],
        action_points: [{ text: "Coordinate volunteers for community outreach", owner: "Samuel", due_date: "", status: "open", approved: true }, { text: "Prepare worship schedule", owner: "Grace", due_date: "", status: "open", approved: false }],
      }),
    ];
    segmentsBySession = [
      [seg(0, "Pastor Paul", 0, 50, "Welcome to this morning's service. Let us begin with a word of prayer."), seg(1, "Pastor Paul", 50, 100, "Lord, we thank you for this day and for bringing us together."), seg(2, "Pastor Paul", 100, 160, "Today's message is about hope and perseverance. In difficult times, we are called to trust and keep moving forward."), seg(3, "Pastor Paul", 160, 200, "Let us close with a song of thanksgiving.")],
      [seg(0, "Pastor Paul", 0, 30, "Let's review the upcoming events calendar. We have the community outreach next Saturday."), seg(1, "Pastor Paul", 30, 60, "Samuel will coordinate volunteers. We also need to finalize the budget for the youth programme."), seg(2, "Grace", 60, 90, "Grace, can you prepare the worship schedule? Yes, I'll have it ready by Wednesday.")],
    ];
    folders = [{ organisation_id: orgId, name: "Services", description: "Sunday and special services", color: "#173b5e", data_mode: "demo" }, { organisation_id: orgId, name: "Leadership", description: "Leadership and planning meetings", color: "#1a8a8a", data_mode: "demo" }];
    tags = [{ organisation_id: orgId, name: "Service", color: "#1a8a8a", data_mode: "demo" }, { organisation_id: orgId, name: "Leadership", color: "#6b7280", data_mode: "demo" }, { organisation_id: orgId, name: "Planning", color: "#2d8659", data_mode: "demo" }];

  } else {
    // small_business
    sessions = [
      base({
        title: "Client Meeting - Acme Corp Proposal",
        participants: ["Account Manager", "Client Lead"],
        tags: ["Client", "Sales"],
        segment_count: 4, duration_seconds: 130,
        full_text: "Thanks for taking the time to meet today. We've reviewed your proposal and we're impressed with the approach. Our main concern is the timeline. Can you deliver within six weeks? Yes, we can commit to that. We'll need the final specifications by end of next week. Let's schedule a follow-up to sign the agreement.",
        summary: "Client meeting to discuss a proposal. The client was impressed but concerned about the timeline. A six-week delivery was agreed, with final specifications due next week.",
        minutes: "1. Client expressed interest in the proposal. 2. Timeline concern raised. 3. Six-week delivery committed. 4. Final specs due next week. 5. Follow-up to sign agreement.",
        decisions: [{ text: "Commit to six-week delivery timeline", approved: false }],
        action_points: [{ text: "Send final specifications to client", owner: "Account Manager", due_date: "", status: "open", approved: false }, { text: "Schedule follow-up to sign agreement", owner: "", due_date: "", status: "open", approved: false }],
        review_status: "in_review",
      }),
      base({
        title: "Weekly Team Meeting",
        session_date: lastWeek,
        participants: ["Team Lead", "Developer", "Designer"],
        tags: ["Internal", "Planning"],
        segment_count: 3, duration_seconds: 85,
        full_text: "Let's review this week's priorities. The product launch is next Tuesday. Amara, how is the marketing campaign going? We're on track, the social media posts are scheduled. Tunde, the backend integration should be done by Thursday. Good, let's do a final review on Monday.",
        summary: "Weekly team meeting reviewed priorities for the upcoming product launch. Marketing and backend integration are on track, with a final review scheduled for Monday.",
        minutes: "1. Priorities reviewed for product launch. 2. Marketing campaign on track. 3. Backend integration due Thursday. 4. Final review on Monday.",
        decisions: [],
        action_points: [{ text: "Complete backend integration", owner: "Tunde", due_date: "", status: "open", approved: false }, { text: "Final review on Monday", owner: "", due_date: "", status: "open", approved: false }],
      }),
    ];
    segmentsBySession = [
      [seg(0, "Account Manager", 0, 35, "Thanks for taking the time to meet today. We've reviewed your proposal and we're impressed with the approach."), seg(1, "Client Lead", 35, 65, "Our main concern is the timeline. Can you deliver within six weeks?"), seg(2, "Account Manager", 65, 100, "Yes, we can commit to that. We'll need the final specifications by end of next week."), seg(3, "Client Lead", 100, 130, "Let's schedule a follow-up to sign the agreement.")],
      [seg(0, "Team Lead", 0, 30, "Let's review this week's priorities. The product launch is next Tuesday."), seg(1, "Amara", 30, 60, "Amara, how is the marketing campaign going? We're on track, the social media posts are scheduled."), seg(2, "Team Lead", 60, 85, "Tunde, the backend integration should be done by Thursday. Good, let's do a final review on Monday.")],
    ];
    folders = [{ organisation_id: orgId, name: "Client Meetings", description: "Client and sales meetings", color: "#173b5e", data_mode: "demo" }, { organisation_id: orgId, name: "Team Meetings", description: "Internal team meetings", color: "#1a8a8a", data_mode: "demo" }];
    tags = [{ organisation_id: orgId, name: "Client", color: "#1a8a8a", data_mode: "demo" }, { organisation_id: orgId, name: "Internal", color: "#6b7280", data_mode: "demo" }, { organisation_id: orgId, name: "Sales", color: "#2d8659", data_mode: "demo" }];
  }

  return { sessions, segmentsBySession, folders, tags };
}