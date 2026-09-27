// Shared backend helpers used by all HR backend functions (hr, hrDocuments,
// hrLifecycle, hrLeave, hrAttendance, hrCompliance). These eliminate
// duplicated inline closures while preserving identical behaviour.

import { writeAuditLog } from "./workspace.ts";

// Factory: returns an `audit(act, entity_type, entity_id, before, after)`
// closure bound to the current user + organisation. Identical to the inline
// pattern previously copy-pasted in every HR function.
export function createHrAuditHelper(svc, organisation_id, user) {
  return (act, entity_type, entity_id, before, after) =>
    writeAuditLog(svc, {
      organisation_id,
      actor_type: "user",
      actor_user_id: user.id,
      actor_user_email: user.email,
      action: act,
      entity_type,
      entity_id,
      before,
      after,
    });
}

// Factory: returns a predicate that checks whether a record belongs to the
// given organisation. Usage: const ownRecord = makeOwnRecordCheck(orgId);
export function makeOwnRecordCheck(organisation_id) {
  return (rec) => rec && rec.organisation_id === organisation_id;
}

// Returns today's date as a YYYY-MM-DD string (server timezone).
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}