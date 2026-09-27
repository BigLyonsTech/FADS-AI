// Shared backend helpers for Officer functions (Finance, HR, Transcribe).
// Extracts the common conversation-getter pattern and month-key helper
// to avoid duplication across officer backend functions.

export function getCurrentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Generic conversation getter/creator. Finds the user's conversation for
// the given org, or creates a new one with default fields. Used by all
// Officer backend functions (Finance, HR, Transcribe).
export async function getOrCreateConversation(
  svc: any,
  entityName: string,
  user: any,
  org: any
): Promise<any> {
  const existing = await svc.entities[entityName].filter({
    organisation_id: org.id,
    user_id: user.id,
  });
  if (existing.length > 0) return existing[0];

  return await svc.entities[entityName].create({
    organisation_id: org.id,
    user_id: user.id,
    user_email: user.email,
    messages: [],
    saved_drafts: [],
    current_month_key: getCurrentMonthKey(),
    current_month_count: 0,
    data_mode: org.data_mode || "live",
  });
}