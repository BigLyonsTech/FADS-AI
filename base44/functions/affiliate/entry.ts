import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import {
  requireAdmin,
  generateUniqueCode,
  getProgrammeSettings,
  formatMoney,
  calculateCommissionAmount,
  recalcAffiliateTotals,
  writeAffiliateAuditLog,
  attributeReferral,
} from "../../shared/affiliate.ts";

// Affiliate & Referral Centre backend.
//
// Actions are grouped:
//   Public   — track_visit (no auth)
//   Affiliate — apply, get_profile, get_dashboard, accept_terms, request_payout, get_settings
//   Admin    — admin_* (Platform Owner only)
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const svc = base44.asServiceRole;

    // ── Public: track anonymous visit (no auth required) ──────────────
    if (body.action === "track_visit") {
      const { code } = body;
      if (!code) return Response.json({ error: "Missing code" }, { status: 400 });
      const links = await svc.entities.ReferralLink.filter({ code, is_active: true });
      if (links.length === 0) return Response.json({ ok: false });
      await svc.entities.ReferralLink.update(links[0].id, {
        visit_count: (links[0].visit_count || 0) + 1,
      });
      return Response.json({ ok: true });
    }

    // ── All other actions require authentication ──────────────────────
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // ── Affiliate: get programme settings (any authed user) ───────────
    if (body.action === "get_settings") {
      const settings = await getProgrammeSettings(svc);
      return Response.json({ settings });
    }

    // ── Affiliate: apply to the programme ────────────────────────────
    if (body.action === "apply") {
      const existing = await svc.entities.AffiliateProfile.filter({ user_id: user.id });
      if (existing.length > 0) {
        return Response.json({
          error: "You already have an affiliate profile",
          profile: existing[0],
        }, { status: 400 });
      }
      const settings = await getProgrammeSettings(svc);
      const profile = await svc.entities.AffiliateProfile.create({
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name || user.email,
        status: "pending",
        country: body.country || null,
        payout_currency: body.payout_currency || settings.default_payout_currency,
        commission_type: settings.default_commission_type,
        commission_value: settings.default_commission_value,
        commission_frequency: settings.default_commission_frequency,
        applied_date: new Date().toISOString(),
        data_mode: "live",
        notes: body.notes || null,
      });
      await writeAffiliateAuditLog(svc, {
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "affiliate.applied",
        entity_type: "AffiliateProfile",
        entity_id: profile.id,
        after: { status: "pending" },
      });
      return Response.json({ ok: true, profile });
    }

    // ── Affiliate: get own profile ───────────────────────────────────
    if (body.action === "get_profile") {
      const profiles = await svc.entities.AffiliateProfile.filter({ user_id: user.id });
      if (profiles.length === 0) return Response.json({ profile: null });
      return Response.json({ profile: profiles[0] });
    }

    // ── Affiliate: get full dashboard data ───────────────────────────
    if (body.action === "get_dashboard") {
      const profiles = await svc.entities.AffiliateProfile.filter({ user_id: user.id });
      if (profiles.length === 0) return Response.json({ profile: null });
      const profile = profiles[0];

      const [links, attributions, commissions, payouts, payoutRecords, terms] = await Promise.all([
        svc.entities.ReferralLink.filter({ affiliate_id: profile.id }),
        svc.entities.ReferralAttribution.filter({ affiliate_id: profile.id, status: "active" }),
        svc.entities.Commission.filter({ affiliate_id: profile.id }),
        svc.entities.PayoutRequest.filter({ affiliate_id: profile.id }),
        svc.entities.PayoutRecord.filter({ affiliate_id: profile.id }),
        svc.entities.AffiliateTermsAcceptance.filter({ user_id: user.id }),
      ]);

      const settings = await getProgrammeSettings(svc);

      return Response.json({
        profile,
        settings,
        referralLink: links[0] || null,
        attributions,
        commissions,
        payoutRequests: payouts,
        payoutRecords,
        termsAcceptance: terms[0] || null,
      });
    }

    // ── Affiliate: accept affiliate terms ────────────────────────────
    if (body.action === "accept_terms") {
      const settings = await getProgrammeSettings(svc);
      const existing = await svc.entities.AffiliateTermsAcceptance.filter({ user_id: user.id });
      if (existing.length > 0) {
        return Response.json({ ok: true, acceptance: existing[0] });
      }
      const acceptance = await svc.entities.AffiliateTermsAcceptance.create({
        user_id: user.id,
        affiliate_id: body.affiliate_id || null,
        terms_version: settings.terms_version,
        accepted_date: new Date().toISOString(),
      });
      return Response.json({ ok: true, acceptance });
    }

    // ── Affiliate: request a payout ───────────────────────────────────
    if (body.action === "request_payout") {
      const profiles = await svc.entities.AffiliateProfile.filter({ user_id: user.id });
      if (profiles.length === 0) {
        return Response.json({ error: "No affiliate profile" }, { status: 400 });
      }
      const profile = profiles[0];
      if (profile.status !== "active" && profile.status !== "approved") {
        return Response.json({ error: "Affiliate account is " + profile.status }, { status: 400 });
      }
      const settings = await getProgrammeSettings(svc);
      const approvedBalance = profile.total_approved_commission || 0;
      if (approvedBalance < (settings.min_payout_amount || 0)) {
        return Response.json({
          error: `Minimum payout amount is ${formatMoney(settings.min_payout_amount, profile.payout_currency)}`,
        }, { status: 400 });
      }
      const request = await svc.entities.PayoutRequest.create({
        user_id: user.id,
        affiliate_id: profile.id,
        requested_amount: body.amount || approvedBalance,
        currency: profile.payout_currency,
        status: "pending",
        requested_date: new Date().toISOString(),
        notes: body.notes || null,
        data_mode: profile.data_mode || "live",
      });
      await writeAffiliateAuditLog(svc, {
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "affiliate.payout_requested",
        entity_type: "PayoutRequest",
        entity_id: request.id,
        after: { amount: request.requested_amount, currency: request.currency },
      });
      return Response.json({ ok: true, request });
    }

    // ════════════════════════════════════════════════════════════════
    // ── Admin actions (Platform Owner only) ──────────────────────────
    // ════════════════════════════════════════════════════════════════

    if (body.action?.startsWith("admin_")) {
      requireAdmin(user);
    }

    // ── Admin: get dashboard overview ────────────────────────────────
    if (body.action === "admin_get_dashboard") {
      const [allProfiles, pendingApps, activeAffiliates, allCommissions, pendingPayouts] = await Promise.all([
        svc.entities.AffiliateProfile.list(),
        svc.entities.AffiliateProfile.filter({ status: "pending" }),
        svc.entities.AffiliateProfile.filter({ status: { $in: ["active", "approved"] } }),
        svc.entities.Commission.list(),
        svc.entities.PayoutRequest.filter({ status: "pending" }),
      ]);
      const settings = await getProgrammeSettings(svc);
      return Response.json({
        settings,
        totalAffiliates: allProfiles.length,
        pendingApplications: pendingApps,
        activeAffiliates,
        allProfiles,
        totalPendingCommission: allCommissions
          .filter((c) => c.status === "pending")
          .reduce((s, c) => s + (c.amount || 0), 0),
        totalApprovedCommission: allCommissions
          .filter((c) => c.status === "approved")
          .reduce((s, c) => s + (c.amount || 0), 0),
        totalPaidCommission: allCommissions
          .filter((c) => c.status === "paid")
          .reduce((s, c) => s + (c.amount || 0), 0),
        pendingPayouts,
      });
    }

    // ── Admin: approve application ────────────────────────────────────
    if (body.action === "admin_approve") {
      const { affiliate_id } = body;
      if (!affiliate_id) return Response.json({ error: "Missing affiliate_id" }, { status: 400 });
      const profile = await svc.entities.AffiliateProfile.get(affiliate_id);
      if (profile.status !== "pending" && profile.status !== "approved") {
        return Response.json({ error: "Profile is not pending" }, { status: 400 });
      }
      const code = profile.affiliate_code || await generateUniqueCode(svc);
      await svc.entities.AffiliateProfile.update(affiliate_id, {
        status: "active",
        affiliate_code: code,
        approved_date: new Date().toISOString(),
        approved_by: user.id,
      });
      // Create referral link if not exists
      const existingLinks = await svc.entities.ReferralLink.filter({ affiliate_id });
      if (existingLinks.length === 0) {
        await svc.entities.ReferralLink.create({
          user_id: profile.user_id,
          affiliate_id,
          code,
          url_path: `/register?ref=${code}`,
          visit_count: 0,
          is_active: true,
        });
      }
      await writeAffiliateAuditLog(svc, {
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "affiliate.approved",
        entity_type: "AffiliateProfile",
        entity_id: affiliate_id,
        after: { status: "active", code },
      });
      return Response.json({ ok: true, code });
    }

    // ── Admin: reject application ────────────────────────────────────
    if (body.action === "admin_reject") {
      const { affiliate_id, reason } = body;
      if (!affiliate_id) return Response.json({ error: "Missing affiliate_id" }, { status: 400 });
      const profile = await svc.entities.AffiliateProfile.get(affiliate_id);
      await svc.entities.AffiliateProfile.update(affiliate_id, {
        status: "rejected",
        rejection_reason: reason || null,
      });
      await writeAffiliateAuditLog(svc, {
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "affiliate.rejected",
        entity_type: "AffiliateProfile",
        entity_id: affiliate_id,
        after: { status: "rejected", reason },
      });
      return Response.json({ ok: true });
    }

    // ── Admin: pause affiliate ────────────────────────────────────────
    if (body.action === "admin_pause") {
      const { affiliate_id } = body;
      const profile = await svc.entities.AffiliateProfile.get(affiliate_id);
      await svc.entities.AffiliateProfile.update(affiliate_id, {
        status: "paused",
        paused_date: new Date().toISOString(),
      });
      await writeAffiliateAuditLog(svc, {
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "affiliate.paused",
        entity_type: "AffiliateProfile",
        entity_id: affiliate_id,
        before: { status: profile.status },
        after: { status: "paused" },
      });
      return Response.json({ ok: true });
    }

    // ── Admin: activate paused affiliate ─────────────────────────────
    if (body.action === "admin_activate") {
      const { affiliate_id } = body;
      const profile = await svc.entities.AffiliateProfile.get(affiliate_id);
      await svc.entities.AffiliateProfile.update(affiliate_id, {
        status: "active",
        paused_date: null,
      });
      await writeAffiliateAuditLog(svc, {
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "affiliate.activated",
        entity_type: "AffiliateProfile",
        entity_id: affiliate_id,
        before: { status: profile.status },
        after: { status: "active" },
      });
      return Response.json({ ok: true });
    }

    // ── Admin: close affiliate ────────────────────────────────────────
    if (body.action === "admin_close") {
      const { affiliate_id } = body;
      const profile = await svc.entities.AffiliateProfile.get(affiliate_id);
      await svc.entities.AffiliateProfile.update(affiliate_id, {
        status: "closed",
        closed_date: new Date().toISOString(),
      });
      // Deactivate referral link
      const links = await svc.entities.ReferralLink.filter({ affiliate_id });
      for (const link of links) {
        await svc.entities.ReferralLink.update(link.id, { is_active: false });
      }
      await writeAffiliateAuditLog(svc, {
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "affiliate.closed",
        entity_type: "AffiliateProfile",
        entity_id: affiliate_id,
        before: { status: profile.status },
        after: { status: "closed" },
      });
      return Response.json({ ok: true });
    }

    // ── Admin: update programme settings ─────────────────────────────
    if (body.action === "admin_update_settings") {
      const settings = await getProgrammeSettings(svc);
      const updates = {};
      const fields = [
        "default_commission_type", "default_commission_value",
        "default_commission_frequency", "supported_countries",
        "default_payout_currency", "terms_version",
        "is_programme_active", "min_payout_amount", "payout_methods",
      ];
      for (const f of fields) {
        if (body[f] !== undefined) updates[f] = body[f];
      }
      updates.updated_by = user.id;
      updates.updated_date = new Date().toISOString();
      await svc.entities.AffiliateProgrammeSettings.update(settings.id, updates);
      await writeAffiliateAuditLog(svc, {
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "affiliate.settings_updated",
        entity_type: "AffiliateProgrammeSettings",
        entity_id: settings.id,
        before: settings,
        after: updates,
      });
      return Response.json({ ok: true, settings: { ...settings, ...updates } });
    }

    // ── Admin: manually record a verified conversion + commission ──
    if (body.action === "admin_record_conversion") {
      const { attribution_id, base_amount, description, conversion_reference, conversion_type } = body;
      if (!attribution_id) return Response.json({ error: "Missing attribution_id" }, { status: 400 });

      // Affiliate commissions are NOT earned on introductory access.
      // A referral becomes a commissionable paid conversion only after the
      // first verified monthly subscription payment.
      if (conversion_type === "introductory") {
        return Response.json({
          error: "Affiliate commissions are not earned on introductory access. A referral becomes a commissionable paid conversion only after the first verified monthly subscription payment.",
        }, { status: 400 });
      }

      const attribution = await svc.entities.ReferralAttribution.get(attribution_id);
      const affiliate = await svc.entities.AffiliateProfile.get(attribution.affiliate_id);

      const amount = calculateCommissionAmount(
        affiliate.commission_type,
        affiliate.commission_value,
        base_amount || 0
      );

      const commission = await svc.entities.Commission.create({
        user_id: affiliate.user_id,
        affiliate_id: affiliate.id,
        attribution_id,
        organisation_id: attribution.referred_organisation_id,
        organisation_name: attribution.referred_organisation_name,
        type: affiliate.commission_type,
        value: affiliate.commission_value,
        frequency: affiliate.commission_frequency,
        amount,
        currency: affiliate.payout_currency,
        status: "pending",
        is_manually_verified: true,
        verified_by: user.id,
        verified_date: new Date().toISOString(),
        description: description || "Manually verified conversion",
        conversion_reference: conversion_reference || null,
        data_mode: attribution.data_mode || "live",
      });

      await recalcAffiliateTotals(svc, affiliate.id);
      await writeAffiliateAuditLog(svc, {
        organisation_id: attribution.referred_organisation_id,
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "affiliate.conversion_recorded",
        entity_type: "Commission",
        entity_id: commission.id,
        after: { amount, manually_verified: true, attribution_id },
      });
      return Response.json({ ok: true, commission });
    }

    // ── Admin: approve a pending commission ──────────────────────────
    if (body.action === "admin_approve_commission") {
      const { commission_id } = body;
      const commission = await svc.entities.Commission.get(commission_id);
      if (commission.status !== "pending") {
        return Response.json({ error: "Commission is not pending" }, { status: 400 });
      }
      await svc.entities.Commission.update(commission_id, {
        status: "approved",
        approved_date: new Date().toISOString(),
        approved_by: user.id,
      });
      await recalcAffiliateTotals(svc, commission.affiliate_id);
      await writeAffiliateAuditLog(svc, {
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "affiliate.commission_approved",
        entity_type: "Commission",
        entity_id: commission_id,
        before: { status: "pending" },
        after: { status: "approved" },
      });
      return Response.json({ ok: true });
    }

    // ── Admin: cancel a commission ───────────────────────────────────
    if (body.action === "admin_cancel_commission") {
      const { commission_id, reason } = body;
      const commission = await svc.entities.Commission.get(commission_id);
      await svc.entities.Commission.update(commission_id, {
        status: "cancelled",
        description: (commission.description || "") + (reason ? ` [Cancelled: ${reason}]` : ""),
      });
      await recalcAffiliateTotals(svc, commission.affiliate_id);
      await writeAffiliateAuditLog(svc, {
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "affiliate.commission_cancelled",
        entity_type: "Commission",
        entity_id: commission_id,
        before: { status: commission.status },
        after: { status: "cancelled", reason },
      });
      return Response.json({ ok: true });
    }

    // ── Admin: approve a payout request ──────────────────────────────
    if (body.action === "admin_approve_payout") {
      const { payout_request_id } = body;
      const request = await svc.entities.PayoutRequest.get(payout_request_id);
      if (request.status !== "pending") {
        return Response.json({ error: "Request is not pending" }, { status: 400 });
      }
      await svc.entities.PayoutRequest.update(payout_request_id, {
        status: "approved",
        approved_date: new Date().toISOString(),
        approved_by: user.id,
      });
      await writeAffiliateAuditLog(svc, {
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "affiliate.payout_approved",
        entity_type: "PayoutRequest",
        entity_id: payout_request_id,
        before: { status: "pending" },
        after: { status: "approved" },
      });
      return Response.json({ ok: true });
    }

    // ── Admin: reject a payout request ───────────────────────────────
    if (body.action === "admin_reject_payout") {
      const { payout_request_id, reason } = body;
      const request = await svc.entities.PayoutRequest.get(payout_request_id);
      await svc.entities.PayoutRequest.update(payout_request_id, {
        status: "rejected",
        rejected_date: new Date().toISOString(),
        rejected_by: user.id,
        rejection_reason: reason || null,
      });
      await writeAffiliateAuditLog(svc, {
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "affiliate.payout_rejected",
        entity_type: "PayoutRequest",
        entity_id: payout_request_id,
        before: { status: request.status },
        after: { status: "rejected", reason },
      });
      return Response.json({ ok: true });
    }

    // ── Admin: record a processed payout ─────────────────────────────
    if (body.action === "admin_record_payout") {
      const { payout_request_id, payment_method, payment_reference, notes } = body;
      const request = await svc.entities.PayoutRequest.get(payout_request_id);
      if (request.status !== "approved" && request.status !== "pending") {
        return Response.json({ error: "Request must be approved first" }, { status: 400 });
      }

      const record = await svc.entities.PayoutRecord.create({
        user_id: request.user_id,
        affiliate_id: request.affiliate_id,
        payout_request_id,
        amount: request.requested_amount,
        currency: request.currency,
        payment_method: payment_method || "bank_transfer",
        payment_reference: payment_reference || null,
        processed_date: new Date().toISOString(),
        processed_by: user.id,
        commission_ids: [],
        status: "completed",
        notes: notes || null,
        data_mode: request.data_mode || "live",
      });

      // Mark all approved commissions for this affiliate as paid
      const approvedCommissions = await svc.entities.Commission.filter({
        affiliate_id: request.affiliate_id,
        status: "approved",
      });
      const commissionIds = [];
      for (const c of approvedCommissions) {
        await svc.entities.Commission.update(c.id, {
          status: "paid",
          paid_date: new Date().toISOString(),
          payout_id: record.id,
        });
        commissionIds.push(c.id);
      }
      await svc.entities.PayoutRecord.update(record.id, { commission_ids: commissionIds });

      // Mark the payout request as processed
      await svc.entities.PayoutRequest.update(payout_request_id, {
        status: "processed",
        processed_date: new Date().toISOString(),
        payout_record_id: record.id,
      });

      await recalcAffiliateTotals(svc, request.affiliate_id);
      await writeAffiliateAuditLog(svc, {
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "affiliate.payout_recorded",
        entity_type: "PayoutRecord",
        entity_id: record.id,
        after: { amount: record.amount, commissions: commissionIds.length },
      });
      return Response.json({ ok: true, record });
    }

    // ── Admin: correct referral attribution ──────────────────────────
    if (body.action === "admin_correct_attribution") {
      const { attribution_id, new_affiliate_id, reason } = body;
      if (!attribution_id || !new_affiliate_id || !reason) {
        return Response.json({
          error: "attribution_id, new_affiliate_id and reason are required",
        }, { status: 400 });
      }
      const attribution = await svc.entities.ReferralAttribution.get(attribution_id);
      const newAffiliate = await svc.entities.AffiliateProfile.get(new_affiliate_id);

      // Mark old attribution as corrected
      await svc.entities.ReferralAttribution.update(attribution_id, {
        status: "corrected",
        corrected_by: user.id,
        corrected_date: new Date().toISOString(),
        correction_reason: reason,
        corrected_to_affiliate_id: new_affiliate_id,
      });

      // Create new attribution
      const newAttribution = await svc.entities.ReferralAttribution.create({
        user_id: newAffiliate.user_id,
        affiliate_id: new_affiliate_id,
        referred_user_id: attribution.referred_user_id,
        referred_organisation_id: attribution.referred_organisation_id,
        referred_organisation_name: attribution.referred_organisation_name,
        referred_organisation_status: attribution.referred_organisation_status,
        code_used: newAffiliate.affiliate_code,
        status: "active",
        attributed_date: new Date().toISOString(),
        data_mode: attribution.data_mode || "live",
      });

      // Recalculate totals for both affiliates
      await recalcAffiliateTotals(svc, attribution.affiliate_id);
      await recalcAffiliateTotals(svc, new_affiliate_id);

      await writeAffiliateAuditLog(svc, {
        organisation_id: attribution.referred_organisation_id,
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "affiliate.attribution_corrected",
        entity_type: "ReferralAttribution",
        entity_id: attribution_id,
        before: { affiliate_id: attribution.affiliate_id },
        after: { affiliate_id: new_affiliate_id, reason, new_attribution_id: newAttribution.id },
      });
      return Response.json({ ok: true, new_attribution_id: newAttribution.id });
    }

    // ── Admin: get all attributions ──────────────────────────────────
    if (body.action === "admin_get_attributions") {
      const attributions = await svc.entities.ReferralAttribution.list("-attributed_date", 100);
      return Response.json({ attributions });
    }

    // ── Admin: get all commissions ───────────────────────────────────
    if (body.action === "admin_get_commissions") {
      const commissions = await svc.entities.Commission.list("-created_date", 100);
      return Response.json({ commissions });
    }

    // ── Admin: seed demo data ─────────────────────────────────────────
    if (body.action === "admin_seed_demo") {
      const existingDemo = await svc.entities.AffiliateProfile.filter({ data_mode: "demo" });
      if (existingDemo.length > 0) {
        return Response.json({ ok: true, message: "Demo data already exists", profile_id: existingDemo[0].id });
      }

      const settings = await getProgrammeSettings(svc);
      const demoCode = await generateUniqueCode(svc);

      const profile = await svc.entities.AffiliateProfile.create({
        user_id: "demo-affiliate-" + Date.now(),
        user_email: "demo.affiliate@fadsai.demo",
        user_name: "Demo Affiliate",
        status: "active",
        affiliate_code: demoCode,
        country: "IE",
        payout_currency: "EUR",
        commission_type: settings.default_commission_type,
        commission_value: settings.default_commission_value,
        commission_frequency: settings.default_commission_frequency,
        applied_date: new Date().toISOString(),
        approved_date: new Date().toISOString(),
        approved_by: user.id,
        data_mode: "demo",
        total_signups: 3,
        total_conversions: 1,
        total_pending_commission: 40,
        total_approved_commission: 80,
        total_paid_commission: 0,
      });

      await svc.entities.ReferralLink.create({
        user_id: profile.user_id,
        affiliate_id: profile.id,
        code: demoCode,
        url_path: `/register?ref=${demoCode}`,
        visit_count: 47,
        is_active: true,
      });

      // Create 3 demo attributions (fictional org IDs)
      const demoOrgs = [
        { name: "Sunrise Coffee Shop", status: "active" },
        { name: "Green Valley School", status: "trial" },
        { name: "Hope Community Church", status: "trial" },
      ];
      const attributionIds = [];
      for (const org of demoOrgs) {
        const attr = await svc.entities.ReferralAttribution.create({
          user_id: profile.user_id,
          affiliate_id: profile.id,
          referred_user_id: "demo-user-" + Math.random().toString(36).slice(2, 8),
          referred_organisation_id: "demo-org-" + Math.random().toString(36).slice(2, 8),
          referred_organisation_name: org.name,
          referred_organisation_status: org.status,
          code_used: demoCode,
          status: "active",
          attributed_date: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
          data_mode: "demo",
        });
        attributionIds.push(attr.id);
      }

      // Create demo commissions
      await svc.entities.Commission.create({
        user_id: profile.user_id,
        affiliate_id: profile.id,
        attribution_id: attributionIds[0],
        organisation_id: "demo-org-1",
        organisation_name: demoOrgs[0].name,
        type: "percentage",
        value: 20,
        frequency: "recurring",
        amount: 80,
        currency: "EUR",
        status: "approved",
        is_manually_verified: true,
        verified_by: user.id,
        verified_date: new Date().toISOString(),
        description: "Manually verified — first subscription payment",
        conversion_reference: "MANUAL-001",
        data_mode: "demo",
      });
      await svc.entities.Commission.create({
        user_id: profile.user_id,
        affiliate_id: profile.id,
        attribution_id: attributionIds[1],
        organisation_id: "demo-org-2",
        organisation_name: demoOrgs[1].name,
        type: "percentage",
        value: 20,
        frequency: "recurring",
        amount: 40,
        currency: "EUR",
        status: "pending",
        is_manually_verified: true,
        verified_by: user.id,
        verified_date: new Date().toISOString(),
        description: "Manually verified — trial signup conversion",
        conversion_reference: "MANUAL-002",
        data_mode: "demo",
      });

      await writeAffiliateAuditLog(svc, {
        actor_user_id: user.id,
        actor_user_email: user.email,
        action: "affiliate.demo_seeded",
        entity_type: "AffiliateProfile",
        entity_id: profile.id,
        after: { code: demoCode },
      });

      return Response.json({ ok: true, profile_id: profile.id, code: demoCode });
    }

    return Response.json({ error: "Unknown action: " + body.action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}