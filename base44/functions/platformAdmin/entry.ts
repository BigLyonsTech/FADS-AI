import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { writeAuditLog, syncUserAuthorisedOrgs } from "../../shared/workspace.ts";

// Platform Owner only actions. Platform Owner = built-in admin (app owner)
// OR a user explicitly flagged platform_owner=true by an existing platform owner.
// Self-registration can never set this flag.
//   set_access_status — manually approve/pause/cancel an organisation
//   list_orgs          — list all organisations (platform-level oversight)
//   list_users         — list all users
//   set_platform_owner — grant or revoke platform owner flag
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const isPlatformOwner = user.role === "admin" || user.platform_owner === true;
    if (!isPlatformOwner) {
      return Response.json({ error: "Platform owner only" }, { status: 403 });
    }
    const svc = base44.asServiceRole;
    const body = await req.json();

    if (body.action === "set_access_status") {
      const { organisation_id, access_status } = body;
      if (!organisation_id || !["trial", "active", "paused", "cancelled"].includes(access_status)) {
        return Response.json({ error: "Invalid" }, { status: 400 });
      }
      const org = await svc.entities.Organisation.get(organisation_id);
      const before = { access_status: org.access_status };
      await svc.entities.Organisation.update(organisation_id, { access_status });
      await writeAuditLog(svc, {
        organisation_id,
        actor_type: "user",
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "organisation.access_status_changed",
        entity_type: "Organisation",
        entity_id: organisation_id,
        before,
        after: { access_status },
      });
      return Response.json({ ok: true });
    }

    if (body.action === "list_orgs") {
      const organisations = await svc.entities.Organisation.list();
      return Response.json({ organisations });
    }

    if (body.action === "list_users") {
      const users = await svc.entities.User.list();
      return Response.json({ users });
    }

    if (body.action === "delete_org") {
      const { organisation_id } = body;
      if (!organisation_id) return Response.json({ error: "Missing organisation_id" }, { status: 400 });
      const org = await svc.entities.Organisation.get(organisation_id);
      const memberships = await svc.entities.OrganisationMembership.filter({ organisation_id });
      for (const m of memberships) {
        await svc.entities.OrganisationMembership.delete(m.id);
        await syncUserAuthorisedOrgs(svc, m.user_id);
      }
      await svc.entities.Organisation.delete(organisation_id);
      await writeAuditLog(svc, {
        organisation_id,
        actor_type: "user",
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "organisation.deleted",
        entity_type: "Organisation",
        entity_id: organisation_id,
        before: { name: org.name, type: org.type },
      });
      return Response.json({ ok: true });
    }

    if (body.action === "set_platform_owner") {
      const { target_user_id, platform_owner } = body;
      if (!target_user_id) {
        return Response.json({ error: "Missing target_user_id" }, { status: 400 });
      }
      await svc.entities.User.update(target_user_id, { platform_owner: !!platform_owner });
      await writeAuditLog(svc, {
        organisation_id: target_user_id,
        actor_type: "user",
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "user.platform_owner_changed",
        entity_type: "User",
        entity_id: target_user_id,
        after: { platform_owner: !!platform_owner },
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}