// Shared workspace helpers used by the Phase 0 backend functions.
// All functions here run with the service-role client (svc) passed in by callers,
// so they bypass RLS to maintain membership sync and write audit records.

// Rebuild the user's authorised_organisations list from their active memberships.
// This list is the RLS data-isolation ceiling: a user can only ever read/write
// records whose organisation_id is in this list.
export async function syncUserAuthorisedOrgs(svc, userId) {
  const memberships = await svc.entities.OrganisationMembership.filter({
    user_id: userId,
    status: "active",
  });
  const orgIds = memberships.map((m) => m.organisation_id);
  await svc.entities.User.update(userId, { authorised_organisations: orgIds });
  return orgIds;
}

// Append-only audit record. Only callable by service role (RLS denies app users).
export async function writeAuditLog(svc, entry) {
  await svc.entities.AuditLog.create({
    organisation_id: entry.organisation_id,
    actor_type: entry.actor_type || "user",
    actor_user_id: entry.actor_user_id || null,
    actor_user_email: entry.actor_user_email || null,
    actor_agent_name: entry.actor_agent_name || null,
    action: entry.action,
    entity_type: entry.entity_type || null,
    entity_id: entry.entity_id || null,
    before: entry.before || null,
    after: entry.after || null,
    result: entry.result || "success",
  });
}

export async function getActiveMembership(svc, userId, orgId) {
  const list = await svc.entities.OrganisationMembership.filter({
    user_id: userId,
    organisation_id: orgId,
    status: "active",
  });
  return list[0] || null;
}

// Throws if the user does not hold one of the allowed roles in the org.
export async function requireOrgRole(svc, userId, orgId, allowedRoles) {
  const membership = await getActiveMembership(svc, userId, orgId);
  if (!membership || !allowedRoles.includes(membership.role_in_org)) {
    throw new Error("Not authorised for this organisation");
  }
  return membership;
}

// Roles that can be granted via invitation. Excludes organisation_owner (set at
// onboarding only) and platform_owner (never an org-level role).
export const ALLOWED_INVITE_ROLES = [
  "administrator",
  "finance_user",
  "hr_user",
  "standard_staff",
  "school_administrator",
  "teacher",
  "pastor",
  "church_administrator",
  "ministry_leader",
];

// Find a membership for an email within an org (any status), case-insensitive.
export async function getMembershipByEmail(svc, email, orgId) {
  const list = await svc.entities.OrganisationMembership.filter({ organisation_id: orgId });
  const target = (email || "").toLowerCase();
  return list.find((m) => (m.user_email || "").toLowerCase() === target) || null;
}