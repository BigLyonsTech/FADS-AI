import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  syncUserAuthorisedOrgs,
  writeAuditLog,
  getActiveMembership,
  requireOrgRole,
} from "../../shared/workspace.ts";
import { attributeReferral } from "../../shared/affiliate.ts";

// User / organisation-owner self-service actions:
//   onboard        — create a new organisation + owner membership (demo by default)
//   set_active     — switch the caller's active workspace (verifies membership + access status)
//   promote_to_live — one-way promotion of an organisation from demo to live (owner only)
export default async function (req) {
  let requestedAction = "unknown";
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    requestedAction = body.action || "unknown";
    const svc = base44.asServiceRole;

    if (body.action === "onboard") {
      const {
        name, type, country, region, currency, timezone,
        financial_year_start, tax_regime, tax_label,
        default_tax_rate, tax_id_label, tax_id_value, logo_url,
        faith_type, faith_type_other, terminology,
      } = body;
      if (!name || !type || !country || !currency || !timezone) {
        return Response.json({ error: "Missing required fields" }, { status: 400 });
      }
      const org = await svc.entities.Organisation.create({
        name,
        type,
        country,
        region: region || null,
        currency,
        timezone,
        financial_year_start: financial_year_start || 1,
        tax_regime: tax_regime || "none",
        tax_label: tax_label || "Tax",
        default_tax_rate: default_tax_rate || 0,
        tax_id_label: tax_id_label || null,
        tax_id_value: tax_id_value || null,
        logo_url: logo_url || null,
        faith_type: type === "church" ? (faith_type || "church") : null,
        faith_type_other: type === "church" && faith_type === "other" ? (faith_type_other || null) : null,
        terminology: type === "church" ? (terminology || {}) : {},
        data_mode: "demo",
        data_isolation_strict: true,
        access_status: "trial",
        owner_user_id: user.id,
      });
      await svc.entities.OrganisationMembership.create({
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        organisation_id: org.id,
        organisation_name: org.name,
        role_in_org: "organisation_owner",
        status: "active",
        is_default: true,
      });
      await syncUserAuthorisedOrgs(svc, user.id);
      await svc.entities.User.update(user.id, {
        active_organisation_id: org.id,
        active_org_role: "organisation_owner",
        default_organisation_id: org.id,
      });
      await writeAuditLog(svc, {
        organisation_id: org.id,
        actor_type: "user",
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "organisation.created",
        entity_type: "Organisation",
        entity_id: org.id,
        after: { name, type, country, currency },
      });
      // Attribute referral if a code was provided (preserved through signup).
      // Failures are non-fatal — onboarding must succeed regardless.
      if (body.referral_code) {
        try {
          await attributeReferral(svc, {
            referral_code: body.referral_code,
            referred_user_id: user.id,
            organisation_id: org.id,
            organisation_name: org.name,
            organisation_status: "trial",
            data_mode: "demo",
          });
        } catch (e) {
          // Non-fatal: log and continue
        }
      }
      return Response.json({ ok: true, organisation_id: org.id });
    }

    if (body.action === "set_active") {
      const { organisation_id } = body;
      if (!organisation_id) {
        return Response.json({ error: "Missing organisation_id" }, { status: 400 });
      }
      const membership = await getActiveMembership(svc, user.id, organisation_id);
      if (!membership) {
        return Response.json({ error: "Not a member of this organisation" }, { status: 403 });
      }
      const org = await svc.entities.Organisation.get(organisation_id);
      if (org.access_status === "paused" || org.access_status === "cancelled") {
        return Response.json(
          { error: "Organisation access is " + org.access_status, access_status: org.access_status },
          { status: 403 }
        );
      }
      await svc.entities.User.update(user.id, {
        active_organisation_id: organisation_id,
        active_org_role: membership.role_in_org,
      });
      return Response.json({
        ok: true,
        organisation_id,
        role_in_org: membership.role_in_org,
        data_mode: org.data_mode,
      });
    }

    if (body.action === "update_organisation") {
      const { organisation_id, ...patch } = body;
      if (!organisation_id) {
        return Response.json({ error: "Missing organisation_id" }, { status: 400 });
      }
      await requireOrgRole(svc, user.id, organisation_id, ["organisation_owner"]);
      const allowed = {};
      const allowedFields = [
        "name", "address", "phone", "email", "logo_url", "region",
        "financial_year_start", "tax_label", "default_tax_rate",
        "tax_id_label", "tax_id_value", "faith_type", "faith_type_other", "terminology",
      ];
      for (const k of allowedFields) {
        if (k in patch) allowed[k] = patch[k];
      }
      if (allowed.financial_year_start != null) {
        allowed.financial_year_start = Number(allowed.financial_year_start) || 1;
      }
      if (allowed.default_tax_rate != null) {
        allowed.default_tax_rate = Number(allowed.default_tax_rate) || 0;
      }
      const before = await svc.entities.Organisation.get(organisation_id);
      await svc.entities.Organisation.update(organisation_id, allowed);
      await writeAuditLog(svc, {
        organisation_id,
        actor_type: "user",
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "organisation.updated",
        entity_type: "Organisation",
        entity_id: organisation_id,
        before: { name: before.name, address: before.address, phone: before.phone },
        after: allowed,
      });
      return Response.json({ ok: true });
    }

    if (body.action === "promote_to_live") {
      const { organisation_id } = body;
      if (!organisation_id) {
        return Response.json({ error: "Missing organisation_id" }, { status: 400 });
      }
      await requireOrgRole(svc, user.id, organisation_id, ["organisation_owner"]);
      const org = await svc.entities.Organisation.get(organisation_id);
      if (org.data_mode === "live") {
        return Response.json({ error: "Already live" }, { status: 400 });
      }
      await svc.entities.Organisation.update(organisation_id, { data_mode: "live" });
      await writeAuditLog(svc, {
        organisation_id,
        actor_type: "user",
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "organisation.promoted_to_live",
        entity_type: "Organisation",
        entity_id: organisation_id,
        before: { data_mode: "demo" },
        after: { data_mode: "live" },
      });
      return Response.json({ ok: true });
    }

    if (body.action === "seed_demo_workspaces") {
      // Platform admins only — creates five demo organisations (Business,
      // Self-Employed, School, University, Church) with demo data so all
      // workspace types can be demonstrated. Never touches live data; idempotent
      // per owner.
      if (user.role !== "admin") {
        return Response.json({ error: "Only platform admins can set up demo workspaces" }, { status: 403 });
      }
      const demoOrgs = [
        { name: "FADS Demo Business", type: "small_business" },
        { name: "FADS Demo Self-Employed", type: "self_employed" },
        { name: "FADS Demo School", type: "school" },
        { name: "FADS Demo University", type: "university" },
        { name: "FADS Demo Church", type: "church" },
      ];
      const results = [];
      for (const demo of demoOrgs) {
        // Check if this demo org already exists for this owner (idempotent)
        const existing = await svc.entities.Organisation.filter({
          owner_user_id: user.id,
          name: demo.name,
        });
        if (existing.length > 0) {
          const existingOrg = existing[0];
          // Ensure the owner has an active membership
          const existingMembership = await getActiveMembership(svc, user.id, existingOrg.id);
          if (!existingMembership) {
            await svc.entities.OrganisationMembership.create({
              user_id: user.id,
              user_email: user.email,
              user_name: user.full_name,
              organisation_id: existingOrg.id,
              organisation_name: existingOrg.name,
              role_in_org: "organisation_owner",
              status: "active",
              is_default: false,
            });
          }
          results.push({ name: demo.name, id: existingOrg.id, created: false });
          continue;
        }
        const org = await svc.entities.Organisation.create({
          name: demo.name,
          type: demo.type,
          country: "IE",
          currency: "EUR",
          timezone: "Europe/Dublin",
          financial_year_start: 1,
          tax_regime: "vat",
          tax_label: "VAT",
          default_tax_rate: 0,
          data_mode: "demo",
          data_isolation_strict: true,
          access_status: "trial",
          owner_user_id: user.id,
        });
        await svc.entities.OrganisationMembership.create({
          user_id: user.id,
          user_email: user.email,
          user_name: user.full_name,
          organisation_id: org.id,
          organisation_name: org.name,
          role_in_org: "organisation_owner",
          status: "active",
          is_default: false,
        });
        await writeAuditLog(svc, {
          organisation_id: org.id,
          actor_type: "user",
          actor_user_id: user.id,
          actor_user_email: user.email,
          action: "organisation.demo_seeded",
          entity_type: "Organisation",
          entity_id: org.id,
          after: { name: demo.name, type: demo.type },
        });
        results.push({ name: demo.name, id: org.id, created: true });
      }
      await syncUserAuthorisedOrgs(svc, user.id);
      // If the user has no active org, default to the first demo workspace
      const currentUser = await svc.entities.User.get(user.id);
      if (!currentUser.active_organisation_id && results.length > 0) {
        await svc.entities.User.update(user.id, {
          active_organisation_id: results[0].id,
          active_org_role: "organisation_owner",
        });
      }
      return Response.json({ ok: true, organisations: results });
    }

    if (body.action === "list_my_workspaces") {
      // Authoritative workspace list for the switcher. Uses the service role
      // so the list is always complete (independent of client RLS token/cache
      // state) — only orgs where the caller has an active membership.
      const memberships = await svc.entities.OrganisationMembership.filter({
        user_id: user.id,
      });
      const orgIds = [
        ...new Set(
          memberships
            .filter((m) => m.status === "active")
            .map((m) => m.organisation_id)
        ),
      ];
      const orgs = [];
      for (const id of orgIds) {
        try {
          orgs.push(await svc.entities.Organisation.get(id));
        } catch {}
      }
      return Response.json({ orgs, memberships });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const providerStatus = Number(
      error?.status ||
        error?.originalError?.response?.status ||
        error?.response?.status ||
        0
    );
    const providerMessage = String(
      error?.data?.error ||
        error?.originalError?.response?.data?.error ||
        error?.response?.data?.error ||
        error?.message ||
        "Workspace request failed"
    ).slice(0, 300);

    if (providerStatus === 429 || /rate limit/i.test(providerMessage)) {
      return Response.json(
        {
          error: "Rate limit exceeded",
          stage: "workspace." + requestedAction,
          provider: "base44",
          provider_status: providerStatus || 429,
          provider_message: providerMessage,
        },
        { status: 429 }
      );
    }

    return Response.json({ error: providerMessage }, { status: 500 });
  }
}