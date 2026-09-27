import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  syncUserAuthorisedOrgs,
  writeAuditLog,
  getActiveMembership,
  getMembershipByEmail,
  requireOrgRole,
  ALLOWED_INVITE_ROLES,
} from "../../shared/workspace.ts";

// Organisation membership management.
//   invite              — invite a person by email (status "pending"); no access until accepted
//   accept              — invited user accepts a pending membership (email must match)
//   list_my_invitations — return the caller's pending invitations (matched by email)
//   update_role         — change another active member's role (not self, not the owner)
//   revoke              — revoke a member's access or cancel a pending invite (not self, not owner)
// Mutating actions require the caller to be organisation_owner or administrator
// of the target organisation (verified server-side via requireOrgRole).
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { action } = body;
    const svc = base44.asServiceRole;

    // ---- org-scoped actions: caller must be owner/admin of the org ----
    if (action === "invite" || action === "update_role" || action === "revoke") {
      const { organisation_id } = body;
      if (!organisation_id) {
        return Response.json({ error: "Missing organisation_id" }, { status: 400 });
      }
      await requireOrgRole(svc, user.id, organisation_id, [
        "organisation_owner",
        "administrator",
      ]);

      if (action === "invite") {
        const { role_in_org } = body;
        const email = (body.email || "").trim().toLowerCase();
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          return Response.json({ error: "A valid email is required" }, { status: 400 });
        }
        if (!ALLOWED_INVITE_ROLES.includes(role_in_org)) {
          return Response.json({ error: "Invalid role" }, { status: 400 });
        }
        if (email === (user.email || "").toLowerCase()) {
          return Response.json({ error: "You cannot invite yourself" }, { status: 400 });
        }
        const existing = await getMembershipByEmail(svc, email, organisation_id);
        if (existing && (existing.status === "active" || existing.status === "pending")) {
          return Response.json(
            { error: "That person is already invited or is an active member" },
            { status: 400 }
          );
        }
        const org = await svc.entities.Organisation.get(organisation_id);
        let targetUser = null;
        try {
          const found = await svc.entities.User.filter({ email });
          targetUser = found[0] || null;
        } catch {
          targetUser = null;
        }
        const payload = {
          user_id: targetUser ? targetUser.id : null,
          user_email: email,
          user_name: targetUser ? targetUser.full_name : null,
          organisation_id,
          organisation_name: org.name,
          role_in_org,
          status: "pending",
          is_default: false,
        };
        let membership;
        if (existing && existing.status === "revoked") {
          membership = await svc.entities.OrganisationMembership.update(existing.id, {
            role_in_org,
            status: "pending",
            user_id: payload.user_id,
            user_name: payload.user_name,
          });
        } else {
          membership = await svc.entities.OrganisationMembership.create(payload);
        }
        await writeAuditLog(svc, {
          organisation_id,
          actor_type: "user",
          actor_user_id: user.id,
          actor_user_email: user.email,
          action: "membership.invited",
          entity_type: "OrganisationMembership",
          entity_id: membership.id,
          after: { email, role_in_org },
        });
        return Response.json({ ok: true, membership_id: membership.id });
      }

      if (action === "update_role") {
        const { target_user_id, role_in_org } = body;
        if (!target_user_id || !role_in_org) {
          return Response.json({ error: "Missing fields" }, { status: 400 });
        }
        if (!ALLOWED_INVITE_ROLES.includes(role_in_org)) {
          return Response.json({ error: "Invalid role" }, { status: 400 });
        }
        if (target_user_id === user.id) {
          return Response.json({ error: "You cannot change your own role" }, { status: 400 });
        }
        const existing = await getActiveMembership(svc, target_user_id, organisation_id);
        if (!existing) {
          return Response.json({ error: "Membership not found" }, { status: 404 });
        }
        if (existing.role_in_org === "organisation_owner") {
          return Response.json(
            { error: "Cannot change the organisation owner's role" },
            { status: 400 }
          );
        }
        const before = { role_in_org: existing.role_in_org };
        await svc.entities.OrganisationMembership.update(existing.id, { role_in_org });
        await writeAuditLog(svc, {
          organisation_id,
          actor_type: "user",
          actor_user_id: user.id,
          actor_user_email: user.email,
          action: "membership.role_changed",
          entity_type: "OrganisationMembership",
          entity_id: existing.id,
          before,
          after: { role_in_org },
        });
        return Response.json({ ok: true });
      }

      if (action === "revoke") {
        const { membership_id } = body;
        if (!membership_id) {
          return Response.json({ error: "Missing membership_id" }, { status: 400 });
        }
        const membership = await svc.entities.OrganisationMembership.get(membership_id);
        if (!membership) {
          return Response.json({ error: "Membership not found" }, { status: 404 });
        }
        if (membership.organisation_id !== organisation_id) {
          return Response.json({ error: "Organisation mismatch" }, { status: 400 });
        }
        if (membership.role_in_org === "organisation_owner") {
          return Response.json({ error: "Cannot revoke the organisation owner" }, { status: 400 });
        }
        if (membership.user_id && membership.user_id === user.id) {
          return Response.json({ error: "You cannot revoke your own access" }, { status: 400 });
        }
        const wasActive = membership.status === "active";
        await svc.entities.OrganisationMembership.update(membership.id, { status: "revoked" });
        if (wasActive && membership.user_id) {
          await syncUserAuthorisedOrgs(svc, membership.user_id);
        }
        await writeAuditLog(svc, {
          organisation_id,
          actor_type: "user",
          actor_user_id: user.id,
          actor_user_email: user.email,
          action: wasActive ? "membership.revoked" : "membership.invite_cancelled",
          entity_type: "OrganisationMembership",
          entity_id: membership.id,
          before: { role_in_org: membership.role_in_org, status: membership.status },
        });
        return Response.json({ ok: true });
      }
    }

    // ---- invited-user actions: no org role required ----
    if (action === "list_my_invitations") {
      const email = (user.email || "").toLowerCase();
      const all = await svc.entities.OrganisationMembership.filter({
        user_email: email,
        status: "pending",
      });
      return Response.json({ invitations: all });
    }

    if (action === "accept") {
      const { membership_id } = body;
      if (!membership_id) {
        return Response.json({ error: "Missing membership_id" }, { status: 400 });
      }
      const membership = await svc.entities.OrganisationMembership.get(membership_id);
      if (!membership) {
        return Response.json({ error: "Invitation not found" }, { status: 404 });
      }
      if (membership.status !== "pending") {
        return Response.json({ error: "Invitation is no longer pending" }, { status: 400 });
      }
      if ((membership.user_email || "").toLowerCase() !== (user.email || "").toLowerCase()) {
        return Response.json({ error: "This invitation is not for you" }, { status: 403 });
      }
      await svc.entities.OrganisationMembership.update(membership_id, {
        status: "active",
        user_id: user.id,
        user_name: user.full_name || user.email,
      });
      await syncUserAuthorisedOrgs(svc, user.id);
      await writeAuditLog(svc, {
        organisation_id: membership.organisation_id,
        actor_type: "user",
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "membership.accepted",
        entity_type: "OrganisationMembership",
        entity_id: membership_id,
        after: { role_in_org: membership.role_in_org },
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}