// Workspace-adaptive wording + helpers for the Money Owed / Collections engine.
// ONE underlying engine — visible labels adapt by workspace type.
// Source of truth: existing Invoice entity (business/school/university) and
// GivingPledge entity (church — pledges only, never ordinary giving).

export function collectionsWording(org) {
  const orgType = org?.type || "small_business";
  switch (orgType) {
    case "school":
      return {
        title: "School Fees",
        subtitle: "See outstanding fees, remind parents and keep track of payments.",
        whoOwesMe: "Who Owes Fees?",
        accountNoun: "Fee Statement",
        recipientNoun: "Parent",
        whatFor: "Student / Fee",
        sendReminder: "Send Reminder",
        recordPayment: "Record Payment",
        collectedLabel: "Fees Collected",
        expectedLabel: "Total Outstanding",
        outstandingLabel: "Outstanding",
        overdueLabel: "Overdue",
        dueSoonLabel: "Due Soon",
        emptyMessage: "No outstanding school fees. All fees are paid or no fee statements have been issued yet.",
      };
    case "church":
      return {
        title: "Collections",
        subtitle: "Outstanding pledges and agreed payments only. Ordinary giving and donations are tracked separately in Giving.",
        whoOwesMe: "Who Owes Me?",
        accountNoun: "Pledge",
        recipientNoun: "Member/Donor",
        whatFor: "Fund",
        sendReminder: "Send Reminder",
        recordPayment: "Record Payment",
        collectedLabel: "Collected",
        expectedLabel: "Total Pledged",
        outstandingLabel: "Outstanding",
        overdueLabel: "Overdue",
        dueSoonLabel: "Due Soon",
        emptyMessage: "No outstanding pledges. Ordinary giving and donations are tracked in the Giving area.",
      };
    case "university":
      return {
        title: "Fee Collections",
        subtitle: "See outstanding fees, remind students/sponsors and keep track of payments.",
        whoOwesMe: "Who Owes Fees?",
        accountNoun: "Fee Statement",
        recipientNoun: "Student/Sponsor",
        whatFor: "Student / Fee",
        sendReminder: "Send Reminder",
        recordPayment: "Record Payment",
        collectedLabel: "Fees Collected",
        expectedLabel: "Total Outstanding",
        outstandingLabel: "Outstanding",
        overdueLabel: "Overdue",
        dueSoonLabel: "Due Soon",
        emptyMessage: "No outstanding fees. All fees are paid or no fee statements have been issued yet.",
      };
    default: // small_business
      return {
        title: "Customer Collections",
        subtitle: "See who owes you, send polite reminders and keep track of payments.",
        whoOwesMe: "Who Owes Me?",
        accountNoun: "Invoice",
        recipientNoun: "Customer",
        whatFor: "Invoice / Item",
        sendReminder: "Send Reminder",
        recordPayment: "Record Payment",
        collectedLabel: "Collected This Month",
        expectedLabel: "Total Owed",
        outstandingLabel: "Outstanding",
        overdueLabel: "Overdue",
        dueSoonLabel: "Due Soon",
        emptyMessage: "No outstanding invoices. All customers are paid up or no invoices have been issued yet.",
      };
  }
}

// Build a receivable object from an invoice for the AI reminder drafter.
export function invoiceToReceivable(invoice, key) {
  return {
    key: key || invoice.id,
    recipientName: invoice.customer_name || "there",
    outstandingAmount: Number(invoice.balance) || 0,
    currency: invoice.currency || "",
    dueDate: invoice.due_date || "",
    reference: invoice.invoice_number || "",
    description: (invoice.line_items || []).map((li) => li.description).filter(Boolean).join(", "),
  };
}

// Build a receivable object from a pledge (church).
export function pledgeToReceivable(pledge, currency, key) {
  const outstanding = (Number(pledge.pledged_amount) || 0) - (Number(pledge.contributed_amount) || 0);
  return {
    key: key || pledge.id,
    recipientName: pledge.contact_name || "there",
    outstandingAmount: outstanding,
    currency: currency || "",
    dueDate: pledge.target_date || "",
    reference: pledge.fund || "",
    description: pledge.fund || "",
  };
}

// Compute summary stats from outstanding invoices and payments.
export function computeCollectionsSummary(invoices, payments) {
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const monthKey = new Date().toISOString().slice(0, 7);

  const outstanding = invoices.filter((i) => {
    const balance = Number(i.balance) || 0;
    return balance > 0 && i.status !== "cancelled" && i.status !== "draft";
  });

  const totalOwed = outstanding.reduce((s, i) => s + Number(i.balance), 0);
  const overdue = outstanding.filter((i) => i.due_date && i.due_date < today);
  const overdueTotal = overdue.reduce((s, i) => s + Number(i.balance), 0);
  const dueSoon = outstanding.filter((i) => i.due_date && i.due_date >= today && i.due_date <= sevenDaysLater);
  const dueSoonTotal = dueSoon.reduce((s, i) => s + Number(i.balance), 0);

  const collectedThisMonth = payments
    .filter((p) => p.date && p.date.startsWith(monthKey))
    .reduce((s, p) => s + Number(p.amount), 0);

  return {
    outstanding,
    totalOwed,
    overdue,
    overdueTotal,
    dueSoon,
    dueSoonTotal,
    collectedThisMonth,
    count: outstanding.length,
    overdueCount: overdue.length,
    dueSoonCount: dueSoon.length,
  };
}

// Compute summary stats from pledges (church).
export function computePledgeSummary(pledges) {
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const outstanding = pledges.filter((p) => {
    const bal = (Number(p.pledged_amount) || 0) - (Number(p.contributed_amount) || 0);
    return p.status === "open" && bal > 0.01;
  });

  const totalOwed = outstanding.reduce((s, p) => s + ((Number(p.pledged_amount) || 0) - (Number(p.contributed_amount) || 0)), 0);
  const overdue = outstanding.filter((p) => p.target_date && p.target_date < today);
  const overdueTotal = overdue.reduce((s, p) => s + ((Number(p.pledged_amount) || 0) - (Number(p.contributed_amount) || 0)), 0);
  const dueSoon = outstanding.filter((p) => p.target_date && p.target_date >= today && p.target_date <= sevenDaysLater);
  const dueSoonTotal = dueSoon.reduce((s, p) => s + ((Number(p.pledged_amount) || 0) - (Number(p.contributed_amount) || 0)), 0);
  const collectedThisMonth = 0; // Pledge contributions tracked in Giving

  return {
    outstanding,
    totalOwed,
    overdue,
    overdueTotal,
    dueSoon,
    dueSoonTotal,
    collectedThisMonth,
    count: outstanding.length,
    overdueCount: overdue.length,
    dueSoonCount: dueSoon.length,
  };
}

// Derive display status for a receivable: Paid / Part Paid / Outstanding / Overdue
export function receivableStatus(invoice) {
  const balance = Number(invoice.balance) || 0;
  if (balance <= 0.01) return "paid";
  const today = new Date().toISOString().slice(0, 10);
  if (invoice.due_date && invoice.due_date < today) return "overdue";
  if (Number(invoice.amount_paid) > 0) return "part_paid";
  return "outstanding";
}

export function receivableStatusBadge(status) {
  switch (status) {
    case "paid": return "bg-status-ok/15 text-status-ok border-status-ok/30";
    case "overdue": return "bg-status-bad/15 text-status-bad border-status-bad/30";
    case "part_paid": return "bg-status-warn/15 text-status-warn border-status-warn/30";
    default: return "bg-brand-teal/15 text-brand-teal border-brand-teal/30";
  }
}

export function receivableStatusLabel(status) {
  return { paid: "Paid", overdue: "Overdue", part_paid: "Part Paid", outstanding: "Outstanding" }[status] || status;
}