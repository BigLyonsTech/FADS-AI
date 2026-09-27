import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { syncUserAuthorisedOrgs, writeAuditLog } from "../../shared/workspace.ts";
import { syncUserHrOrgs } from "../../shared/hr.ts";

// Auto-provisions pre-created active memberships for a user on login.
// Called by the "Provision Reviewer on Login" workflow (app_user_auth trigger).
//
// Security: the email is read from the user record (looked up by user_id),
// never from the request body — so a caller cannot link someone else's
// memberships to their own account by passing a forged email. The function
// only links memberships whose user_email matches the user's real email and
// whose user_id is still null (unlinked).
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const body = await req.json();
    const { user_id } = body;
    if (!user_id) {
      return Response.json({ error: "Missing user_id" }, { status: 400 });
    }

    // Look up the user to get their real email (never trust the passed email).
    const user = await svc.entities.User.get(user_id);
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    const email = (user.email || "").toLowerCase();
    if (!email) {
      return Response.json({ ok: true, provisioned: 0, reason: "no email" });
    }

    // Find active memberships for this email that haven't been linked yet.
    const allByEmail = await svc.entities.OrganisationMembership.filter({
      user_email: email,
    });
    const unlinked = allByEmail.filter(
      (m) => m.status === "active" && !m.user_id
    );

    if (unlinked.length === 0) {
      // Nothing to link — re-sync in case memberships changed elsewhere.
      await syncUserAuthorisedOrgs(svc, user_id);
      await syncUserHrOrgs(svc, user_id);
      return Response.json({ ok: true, provisioned: 0, reason: "already linked" });
    }

    // Link each unlinked membership to this user.
    for (const m of unlinked) {
      await svc.entities.OrganisationMembership.update(m.id, {
        user_id: user_id,
        user_name: user.full_name || user.email,
      });
      await writeAuditLog(svc, {
        organisation_id: m.organisation_id,
        actor_type: "system",
        action: "membership.auto_provisioned",
        entity_type: "OrganisationMembership",
        entity_id: m.id,
        after: { user_id, email, role_in_org: m.role_in_org },
      });
    }

    // Sync both authorised_organisations (all modules) and hr_organisations (HR).
    await syncUserAuthorisedOrgs(svc, user_id);
    await syncUserHrOrgs(svc, user_id);

    // Set a default org so the reviewer lands on a workspace after login.
    if (!user.default_organisation_id && !user.active_organisation_id) {
      await svc.entities.User.update(user_id, {
        default_organisation_id: unlinked[0].organisation_id,
        active_organisation_id: unlinked[0].organisation_id,
        active_org_role: unlinked[0].role_in_org,
      });
    }

    return Response.json({ ok: true, provisioned: unlinked.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}