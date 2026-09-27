import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { getActiveMembership } from "../../shared/workspace.ts";

// CRM aggregate read. Returns all CRM entities for an organisation in a
// single client request. This replaces 8 separate client-side entity filter
// calls (which re-ran after every CRUD operation) that were bursting the
// platform client rate limit (150 ops/min) and raising "Rate limit exceeded".
// Membership is verified server-side; reads use the service role.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const action = body.action;

    if (action === "list_all") {
      return await handleListAll(base44, user, body);
    }
    return Response.json({ error: "Unknown action: " + action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function handleListAll(base44, user, body) {
  const svc = base44.asServiceRole;
  const organisation_id = body.organisation_id;
  const data_mode = body.data_mode;
  if (!organisation_id) {
    return Response.json({ error: "organisation_id required" }, { status: 400 });
  }
  const membership = await getActiveMembership(svc, user.id, organisation_id);
  if (!membership) {
    return Response.json({ error: "Not a member of this organisation" }, { status: 403 });
  }

  const filter = { organisation_id, data_mode };
  // Server-side reads run in parallel; they do not count against the client
  // SDK rate budget the way 8 client filter calls did.
  const [contacts, orgs, leads, tasks, activities, stages, automations, templates, offers] = await Promise.all([
    svc.entities.CRMContact.filter(filter, "-updated_date", 500),
    svc.entities.CRMOrganisation.filter(filter, "name", 200),
    svc.entities.CRMLead.filter(filter, "-updated_date", 200),
    svc.entities.CRMTask.filter(filter, "-due_date", 200),
    svc.entities.CRMActivity.filter(filter, "-created_date", 500),
    svc.entities.CRMPipelineStage.filter(filter, "order", 30),
    svc.entities.PipelineAutomation.filter(filter, "-created_date", 100),
    svc.entities.MessageTemplate.filter(filter, "category", 100),
    svc.entities.CRMOffer.filter(filter, "-start_date", 200),
  ]);

  return Response.json({
    contacts,
    orgs,
    leads,
    tasks,
    activities,
    stages,
    automations,
    templates,
    offers,
  });
}