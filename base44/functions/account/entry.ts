import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { syncUserAuthorisedOrgs, writeAuditLog } from "../../shared/workspace.ts";

// Account self-service: data export and deletion requests.
// Runs as the signed-in user for reads; uses the service role only to revoke
// the user's memberships and write audit records (RLS denies app users from
// mutating memberships directly).
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'get_status') {
      return Response.json({
        email: user.email,
        full_name: user.full_name,
        deletion_requested: !!user.deletion_requested,
        deletion_requested_date: user.deletion_requested_date || null,
        export_requested: !!user.export_requested,
        export_requested_date: user.export_requested_date || null,
      });
    }

    if (action === 'export_data') {
      await base44.auth.updateMe({
        export_requested: true,
        export_requested_date: new Date().toISOString(),
      });
      const memberships = await base44.entities.OrganisationMembership.filter({
        user_id: user.id,
      });
      const organisations = await base44.entities.Organisation.list();
      const auditLogs = await base44.entities.AuditLog.filter({
        actor_user_id: user.id,
      });
      return Response.json({
        exported_at: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
        organisations,
        memberships,
        audit_logs: auditLogs,
      });
    }

    if (action === 'request_deletion') {
      const svc = base44.asServiceRole;
      const active = await svc.entities.OrganisationMembership.filter({
        user_id: user.id,
        status: 'active',
      });
      for (const m of active) {
        await svc.entities.OrganisationMembership.update(m.id, { status: 'revoked' });
        await writeAuditLog(svc, {
          organisation_id: m.organisation_id,
          actor_type: 'user',
          actor_user_id: user.id,
          actor_user_email: user.email,
          action: 'account.deletion_requested',
          entity_type: 'OrganisationMembership',
          entity_id: m.id,
          before: { status: 'active' },
          after: { status: 'revoked' },
        });
      }
      // Rebuild authorised list (now empty) and mark the account.
      await syncUserAuthorisedOrgs(svc, user.id);
      await svc.entities.User.update(user.id, {
        deletion_requested: true,
        deletion_requested_date: new Date().toISOString(),
        active_organisation_id: null,
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}