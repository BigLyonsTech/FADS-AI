import { useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";
import { useFinance } from "@/lib/useFinance";
import { CHURCH_FUNDS, GIVING_TYPE_FUNDS, isChurchFundName } from "@/lib/givingWording";

// Church Giving & Pledges data layer.
//
// FINANCE IS THE SOURCE OF TRUTH: recording a tithe/offering/donation creates a
// real FinanceTransaction (direction "in") via the existing `finance` backend
// function — no second ledger, no double-counting. Giving "funds" are income
// FinanceCategories; a fund category is created on demand the first time giving
// is recorded against it.
//
// Pledges are a lightweight commitment layer (GivingPledge entity). A pledge is
// NOT income; it tracks pledged vs contributed amounts. When giving is recorded
// against a pledge, the pledge's contributed_amount is incremented and the
// fulfilling FinanceTransaction id is stored on the pledge (linked_transaction_ids).
//
// Member/donor giving history links a CRMContact to FinanceTransactions by
// matching the FinanceContact email (the finance-side contact) to the CRMContact
// email — "where available".

export function useGiving() {
  const { activeOrg, activeRole } = useWorkspace();
  const { dataMode } = useDataMode();
  const orgId = activeOrg?.id;
  const fin = useFinance();
  const queryClient = useQueryClient();
  const seededFor = useRef(null);

  const canManage = ["organisation_owner", "administrator", "finance_user", "church_administrator"].includes(activeRole);

  // Pledges for the active org + data mode.
  const pledgesQuery = useQuery({
    queryKey: ["giving-pledges", orgId, dataMode],
    queryFn: async () => {
      if (!orgId) return [];
      return base44.entities.GivingPledge.filter(
        { organisation_id: orgId, data_mode: dataMode },
        "-created_date",
        500
      );
    },
    enabled: !!orgId,
    staleTime: 30000,
  });

  // CRM contacts of type member/donor (for pledge contact selection, WhatsApp
  // reminders, and member giving history). Lighter than the full CRM hook.
  const contactsQuery = useQuery({
    queryKey: ["giving-contacts", orgId, dataMode],
    queryFn: async () => {
      if (!orgId) return [];
      const all = await base44.entities.CRMContact.filter(
        { organisation_id: orgId, data_mode: dataMode },
        "-updated_date",
        500
      );
      return all.filter((c) => ["member", "donor", "visitor"].includes(c.contact_type));
    },
    enabled: !!orgId,
    staleTime: 30000,
  });

  const pledges = pledgesQuery.data || [];
  const crmContacts = contactsQuery.data || [];
  const { transactions, categories, contacts: financeContacts, accounts } = fin;

  const reload = useCallback(async () => {
    await Promise.all([
      pledgesQuery.refetch(),
      contactsQuery.refetch(),
      fin.reload(),
    ]);
  }, [pledgesQuery, contactsQuery, fin]);

  // ---- Resolve a fund to a FinanceCategory id, creating it if missing ----
  const ensureFundCategory = useCallback(async (fundName) => {
    const existing = categories.find(
      (c) => c.kind === "income" && c.name.toLowerCase() === String(fundName).toLowerCase()
    );
    if (existing) return existing.id;
    const res = await base44.functions.invoke("finance", {
      action: "create_category",
      organisation_id: orgId,
      name: fundName,
      kind: "income",
      data_mode: dataMode,
    });
    await fin.reload();
    return res.id;
  }, [categories, orgId, dataMode, fin]);

  // ---- Resolve a CRMContact to a FinanceContact id (by email), creating if needed ----
  const resolveFinanceContact = useCallback(async (crmContact) => {
    if (!crmContact) return null;
    // If a FinanceContact with the same email exists, reuse it.
    if (crmContact.email) {
      const match = financeContacts.find(
        (fc) => (fc.email || "").toLowerCase() === crmContact.email.toLowerCase()
      );
      if (match) return match.id;
    }
    // Otherwise create a matching FinanceContact (member/donor).
    const kind = crmContact.contact_type === "donor" ? "donor" : "member";
    const res = await base44.functions.invoke("finance", {
      action: "create_contact",
      organisation_id: orgId,
      kind,
      name: [crmContact.first_name, crmContact.last_name].filter(Boolean).join(" ") || crmContact.first_name,
      email: crmContact.email || null,
      phone: crmContact.phone || null,
      data_mode: dataMode,
    });
    await fin.reload();
    return res.id;
  }, [financeContacts, orgId, dataMode, fin]);

  // ---- Record giving (tithe/offering/donation to a fund) ----
  // Creates a real FinanceTransaction (direction "in") via the finance backend.
  // Optionally links to a pledge, incrementing its contributed_amount.
  const recordGiving = useCallback(async ({
    fund, amount, accountId, date, paymentMethod, contactId, pledgeId, note,
  }) => {
    if (!orgId) throw new Error("No active organisation");
    const amt = Number(amount);
    if (!fund || !amt || amt <= 0 || !accountId || !date) {
      throw new Error("Fund, amount, account and date are required");
    }
    // 1. Ensure the fund category exists.
    const categoryId = await ensureFundCategory(fund);
    // 2. Resolve the contact (CRMContact -> FinanceContact) if provided.
    let financeContactId = null;
    if (contactId) {
      const crm = crmContacts.find((c) => c.id === contactId);
      financeContactId = await resolveFinanceContact(crm);
    }
    // 3. Create the FinanceTransaction (finance = source of truth).
    const kindLabel = CHURCH_FUNDS.find((f) => f.toLowerCase() === String(fund).toLowerCase()) || fund;
    const res = await base44.functions.invoke("finance", {
      action: "create_transaction",
      organisation_id: orgId,
      direction: "in",
      account_id: accountId,
      category_id: categoryId,
      amount: amt,
      contact_id: financeContactId,
      date,
      payment_method: paymentMethod || "cash",
      description: note || `${kindLabel} giving`,
      status: "cleared",
      data_mode: dataMode,
    });
    const txnId = res.id;
    // 4. Optionally link to a pledge.
    if (pledgeId) {
      const pledge = pledges.find((p) => p.id === pledgeId);
      if (pledge) {
        const linked = pledge.linked_transaction_ids || [];
        if (!linked.includes(txnId)) linked.push(txnId);
        const contributed = Number(pledge.contributed_amount || 0) + amt;
        const status = contributed >= Number(pledge.pledged_amount) - 0.01 ? "fulfilled" : pledge.status;
        await base44.entities.GivingPledge.update(pledgeId, {
          contributed_amount: contributed,
          linked_transaction_ids: linked,
          status,
        });
        await pledgesQuery.refetch();
      }
    }
    await fin.reload();
    return { transaction_id: txnId };
  }, [orgId, dataMode, ensureFundCategory, resolveFinanceContact, crmContacts, pledges, pledgesQuery, fin]);

  // ---- Pledge CRUD (client-managed via SDK; RLS enforces org isolation) ----
  const createPledge = useCallback(async (data) => {
    const rec = await base44.entities.GivingPledge.create({
      organisation_id: orgId,
      data_mode: dataMode,
      fund: data.fund,
      pledged_amount: Number(data.pledged_amount) || 0,
      contributed_amount: 0,
      contact_id: data.contact_id || null,
      contact_name: data.contact_name || null,
      target_date: data.target_date || null,
      status: "open",
      note: data.note || null,
      linked_transaction_ids: [],
    });
    await pledgesQuery.refetch();
    return rec;
  }, [orgId, dataMode, pledgesQuery]);

  const updatePledge = useCallback(async (id, data) => {
    const patch = { ...data };
    if (patch.pledged_amount != null) patch.pledged_amount = Number(patch.pledged_amount) || 0;
    await base44.entities.GivingPledge.update(id, patch);
    await pledgesQuery.refetch();
  }, [pledgesQuery]);

  const deletePledge = useCallback(async (id) => {
    await base44.entities.GivingPledge.delete(id);
    await pledgesQuery.refetch();
  }, [pledgesQuery]);

  // ---- Derived giving stats (from finance transactions = source of truth) ----
  const givingTxns = transactions.filter(
    (t) => t.direction === "in" && t.status === "cleared" && isFundCategory(t.category_id)
  );

  function isFundCategory(categoryId) {
    const cat = categories.find((c) => c.id === categoryId);
    return cat && cat.kind === "income" && isChurchFundName(cat.name);
  }

  const fundName = (categoryId) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? cat.name : "Uncategorised";
  };

  const totalGiving = givingTxns.reduce((s, t) => s + Number(t.amount), 0);

  const byType = {};
  GIVING_TYPE_FUNDS.forEach((f) => {
    byType[f] = givingTxns
      .filter((t) => fundName(t.category_id).toLowerCase() === f.toLowerCase())
      .reduce((s, t) => s + Number(t.amount), 0);
  });

  const byFund = {};
  givingTxns.forEach((t) => {
    const f = fundName(t.category_id);
    byFund[f] = (byFund[f] || 0) + Number(t.amount);
  });

  const openPledges = pledges.filter((p) => p.status === "open");
  const outstandingPledges = openPledges.map((p) => ({
    ...p,
    outstanding: Math.max(0, Number(p.pledged_amount) - Number(p.contributed_amount || 0)),
  }));
  const totalOutstanding = outstandingPledges.reduce((s, p) => s + p.outstanding, 0);

  const today = new Date().toISOString().slice(0, 10);
  const pledgesNeedingFollowUp = outstandingPledges
    .filter((p) => p.outstanding > 0 && p.target_date && p.target_date <= today)
    .sort((a, b) => (a.target_date || "").localeCompare(b.target_date || ""));

  // ---- Member/donor giving history (CRMContact -> FinanceTransactions by email) ----
  const memberGiving = (crmContactId) => {
    const crm = crmContacts.find((c) => c.id === crmContactId);
    if (!crm || !crm.email) return [];
    const fcIds = financeContacts
      .filter((fc) => (fc.email || "").toLowerCase() === crm.email.toLowerCase())
      .map((fc) => fc.id);
    if (!fcIds.length) return [];
    return transactions.filter((t) => fcIds.includes(t.contact_id) && t.direction === "in" && t.status === "cleared");
  };

  // ---- Demo seed (pledges only; giving transactions come from the finance demo seed) ----
  useEffect(() => {
    if (!orgId || dataMode !== "demo" || pledgesQuery.isLoading || seededFor.current === orgId) return;
    if (pledges.length > 0) { seededFor.current = orgId; return; }
    if (!crmContacts.length) return; // wait for CRM contacts to exist (seeded by CRM hook)
    seededFor.current = orgId;
    seedDemoPledges(orgId, crmContacts);
  }, [orgId, dataMode, pledgesQuery.isLoading, pledges.length, crmContacts]);

  async function seedDemoPledges(orgId, contacts) {
    const ahead = (n) => {
      const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10);
    };
    const donor = contacts.find((c) => c.contact_type === "donor") || contacts[0];
    const member = contacts.find((c) => c.contact_type === "member") || contacts[1] || contacts[0];
    const rows = [
      {
        fund: "Building Fund",
        pledged_amount: 5000,
        contact_id: donor?.id || null,
        contact_name: donor ? `${donor.first_name} ${donor.last_name || ""}`.trim() : null,
        target_date: ahead(90),
        note: "Pledge towards the new church building project.",
      },
      {
        fund: "Missions",
        pledged_amount: 1200,
        contact_id: member?.id || null,
        contact_name: member ? `${member.first_name} ${member.last_name || ""}`.trim() : null,
        target_date: ahead(45),
        note: "Annual missions pledge.",
      },
      {
        fund: "Welfare",
        pledged_amount: 600,
        contact_id: null,
        contact_name: null,
        target_date: ahead(60),
        note: "Community welfare fund pledge.",
      },
    ];
    try {
      await base44.entities.GivingPledge.bulkCreate(
        rows.map((r) => ({ ...r, organisation_id: orgId, data_mode: "demo", contributed_amount: 0, status: "open", linked_transaction_ids: [] }))
      );
      await pledgesQuery.refetch();
    } catch {
      // non-fatal
    }
  }

  return {
    orgId,
    dataMode,
    canManage,
    loading: pledgesQuery.isLoading || fin.loading,
    pledges,
    crmContacts,
    accounts,
    categories,
    financeContacts,
    transactions,
    // stats
    givingTxns,
    totalGiving,
    byType,
    byFund,
    openPledges,
    outstandingPledges,
    totalOutstanding,
    pledgesNeedingFollowUp,
    memberGiving,
    // actions
    recordGiving,
    createPledge,
    updatePledge,
    deletePledge,
    reload,
  };
}