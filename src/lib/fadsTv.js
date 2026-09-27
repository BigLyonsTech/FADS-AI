// FADS TV story builder — transforms EXISTING intelligence data into
// business-news stories. Pure computation, no new predictions. Reuses
// computeIntelligence output + lightweight CRM/HR/Inventory counts.
// Workspace-aware: different stories + wording for business/school/church.

import { formatCurrency } from "@/lib/currencyFormat";

// ── Forecast period helper ──────────────────────────────────────────────
// Scales EXISTING daily rates (avgDailyOut) to different time horizons.
// NOT a new prediction model — same model, different window.
export function projectCashForPeriod(cashflow, period) {
  if (!cashflow?.hasData) return null;
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  if (days === 30) return cashflow.projected30;
  return cashflow.cashNow + cashflow.expectedIn - cashflow.avgDailyOut * days;
}

export function periodLabel(period) {
  return period === "7d" ? "Next 7 Days" : period === "90d" ? "Next 90 Days" : "Next 30 Days";
}

// ── Confidence indicator ────────────────────────────────────────────────
export function forecastConfidence(intelligence) {
  const cf = intelligence?.cashflow;
  const health = intelligence?.health;
  if (cf?.hasData && health?.hasData) return { level: "strong", label: "Strong data" };
  if (cf?.hasData || health?.hasData) return { level: "some", label: "Some data" };
  return { level: "limited", label: "Limited data" };
}

// ── Workspace-specific watch labels ────────────────────────────────────
function watchLabels(orgType) {
  switch (orgType) {
    case "school":
      return { money: "FEES WATCH", customer: "ENROLMENT WATCH", business: "BUSINESS WATCH", people: "PEOPLE WATCH", stock: "STOCK WATCH" };
    case "church":
      return { money: "GIVING WATCH", customer: "COMMUNITY WATCH", business: "BUSINESS WATCH", people: "PEOPLE WATCH", stock: "STOCK WATCH" };
    case "taxi_driver":
    case "self_employed":
      return { money: "MONEY WATCH", cost: "COST WATCH", tax: "TAX WATCH", customer: "CUSTOMER WATCH", business: "BUSINESS WATCH", people: "PEOPLE WATCH", stock: "STOCK WATCH" };
    default:
      return { money: "MONEY WATCH", customer: "CUSTOMER WATCH", business: "BUSINESS WATCH", people: "PEOPLE WATCH", stock: "STOCK WATCH" };
  }
}

function isDriverOrg(orgType) {
  return orgType === "taxi_driver" || orgType === "self_employed";
}

// ── Driver-tuned FADS TV stories ───────────────────────────────────────
// Reuses the SAME intelligence engine. Adapts story labels/content to genuine
// Driver Finance/Tax data (earnings, running costs, tax readiness). No
// hard-coded numbers — every figure is derived from recorded records.
function buildDriverStories(intelligence, org) {
  const cur = org?.currency || "";
  const stories = [];
  const cf = intelligence?.cashflow;
  const health = intelligence?.health;

  // MONEY WATCH — earnings/income
  if (cf?.hasData && cf.avgDailyIn > 0) {
    const monthly = cf.avgDailyIn * 30;
    stories.push({
      key: "money",
      label: "MONEY WATCH",
      icon: "wallet",
      headline: `Based on your records, you're earning approximately ${formatCurrency(monthly, cur)} per month.`,
      actual: formatCurrency(monthly, cur),
    });
  }

  // COST WATCH — fuel/vehicle/running costs
  if (cf?.hasData && cf.avgDailyOut > 0) {
    const monthlyCost = cf.avgDailyOut * 30;
    const ahead = cf.netBurnPerDay > 0;
    stories.push({
      key: "cost",
      label: "COST WATCH",
      icon: "fuel",
      headline: ahead
        ? `Your running costs are approximately ${formatCurrency(monthlyCost, cur)} per month — currently ahead of your earnings.`
        : `Your running costs are approximately ${formatCurrency(monthlyCost, cur)} per month, within your earnings.`,
      actionUrl: "/finance/money-out",
      actionLabel: "Review costs",
    });
  }

  return stories;
}

function buildDriverPick(intelligence, org) {
  const { cashflow } = intelligence || {};
  if (cashflow?.status === "TIGHT" || cashflow?.status === "CAUTION") {
    return { headline: "I'd focus on keeping your running costs down and recording every fare — cash is tight right now.", url: "/finance/money-out", label: "Review costs with FADS" };
  }
  if (cashflow?.hasData && cashflow.avgDailyIn <= 0) {
    return { headline: "Record today's fares and expenses so I can keep your numbers accurate.", url: "/finance/money-in", label: "Record income with FADS" };
  }
  return { headline: "Your records look up to date. Keep logging each day's fares and costs.", url: "/finance", label: "Open Finance with FADS" };
}

function buildDriverBulletin(intelligence, org) {
  const { cashflow, health } = intelligence || {};
  const pick = buildDriverPick(intelligence, org);

  let goodNews;
  let goodNewsLabel = "GOOD NEWS";
  if (cashflow?.hasData && cashflow.netBurnPerDay <= 0) {
    goodNews = "Your earnings are currently outpacing your running costs.";
  } else if (cashflow?.hasData && cashflow.status === "OK") {
    goodNews = "Your cash position looks stable based on recent records.";
  } else if (health?.hasData && health.score >= 75) {
    goodNews = "Your business health looks strong right now.";
  } else {
    goodNews = "Every fare and expense you record helps me help you.";
    goodNewsLabel = "TODAY";
  }

  let watchThis;
  if (cashflow?.status === "TIGHT" || cashflow?.status === "CAUTION") {
    watchThis = "Running costs are ahead of earnings right now.";
  } else if (cashflow?.hasData && cashflow.avgDailyIn <= 0) {
    watchThis = "No income recorded recently.";
  } else {
    watchThis = "No immediate risks detected.";
  }

  return { goodNews, goodNewsLabel, watchThis, pick: pick.headline, pickUrl: pick.url };
}

function buildDriverTicker(intelligence, org) {
  const cur = org?.currency || "";
  const parts = [];
  const cf = intelligence?.cashflow;
  const health = intelligence?.health;
  if (cf?.hasData) {
    if (cf.avgDailyIn > 0) parts.push(`Earnings ~${formatCurrency(cf.avgDailyIn * 30, cur)}/mo`);
    if (cf.avgDailyOut > 0) parts.push(`Costs ~${formatCurrency(cf.avgDailyOut * 30, cur)}/mo`);
    parts.push(`Cash ${formatCurrency(cf.cashNow, cur)}`);
  }
  if (health?.hasData) {
    parts.push(`Health ${health.score}/${health.maxScore}`);
  }
  return parts.join("  ·  ");
}

// ── Build TV stories from existing data ───────────────────────────────
export function buildTvStories(intelligence, org, crm, hr, inventory, period) {
  const orgType = org?.type || "small_business";
  const labels = watchLabels(orgType);
  const cur = org?.currency || "";
  const stories = [];

  // Driver-tuned stories (Taxi Driver / Self-Employed) — adapt labels/content
  // to genuine Driver Finance/Tax data. Falls through to generic stories below
  // for all other workspace types.
  if (isDriverOrg(orgType)) {
    return buildDriverStories(intelligence, org);
  }

  // MONEY / FEES / GIVING WATCH
  const cf = intelligence?.cashflow;
  const debt = intelligence?.debt;
  if (cf?.hasData) {
    const projected = projectCashForPeriod(cf, period);
    const isDecline = projected < cf.cashNow;
    let headline;
    if (orgType === "church") {
      headline = isDecline
        ? `Based on your current records, available funds may decline to approximately ${formatCurrency(projected, cur)} over ${periodLabel(period).toLowerCase()} if current spending continues.`
        : `Your recorded giving and income suggest funds may hold steady at approximately ${formatCurrency(projected, cur)} over ${periodLabel(period).toLowerCase()}.`;
    } else if (orgType === "school") {
      headline = isDecline
        ? `Based on your current records, cash may fall to approximately ${formatCurrency(projected, cur)} over ${periodLabel(period).toLowerCase()} if current spending continues.`
        : `Your recorded fees and income suggest cash may hold steady at approximately ${formatCurrency(projected, cur)} over ${periodLabel(period).toLowerCase()}.`;
    } else {
      headline = isDecline
        ? `Based on your current records, cash may fall to approximately ${formatCurrency(projected, cur)} over ${periodLabel(period).toLowerCase()} if current spending continues.`
        : `Your recorded income suggests cash may hold steady at approximately ${formatCurrency(projected, cur)} over ${periodLabel(period).toLowerCase()}.`;
    }
    stories.push({
      key: "money",
      label: labels.money,
      icon: "wallet",
      headline,
      actual: formatCurrency(cf.cashNow, cur),
      forecast: formatCurrency(projected, cur),
      isDecline,
    });
  }

  // Overdue (part of money watch for business/school, separate for church)
  if (debt?.hasData && debt.totalOverdue > 0 && orgType !== "church") {
    stories.push({
      key: "overdue",
      label: orgType === "school" ? "FEES WATCH" : "MONEY WATCH",
      icon: "alert",
      headline: `${formatCurrency(debt.totalOverdue, cur)} is overdue across ${debt.overdueCount} account${debt.overdueCount === 1 ? "" : "s"}.`,
      actionUrl: "/finance/money-owed",
      actionLabel: "Prepare Reminders",
    });
  }

  // CUSTOMER / ENROLMENT / COMMUNITY WATCH
  if (crm?.hasData) {
    const waiting = crm.leadsWaiting || 0;
    const followUpsDue = crm.followUpsDue || 0;
    if (waiting > 0 || followUpsDue > 0) {
      let headline;
      if (orgType === "school") {
        headline = waiting > 0
          ? `${waiting} enquir${waiting === 1 ? "y is" : "ies are"} still waiting for a response. Following these up may be your quickest opportunity this week.`
          : `${followUpsDue} parent follow-up${followUpsDue === 1 ? " is" : "s are"} due soon.`;
      } else if (orgType === "church") {
        headline = waiting > 0
          ? `${waiting} ${waiting === 1 ? "person is" : "people are"} waiting to hear back. A gentle follow-up could make a real difference.`
          : `${followUpsDue} member follow-up${followUpsDue === 1 ? " is" : "s are"} due soon.`;
      } else {
        headline = waiting > 0
          ? `${waiting} proposal${waiting === 1 ? " is" : "s are"} still waiting for a response. Following these up may be your quickest opportunity this week.`
          : `${followUpsDue} customer follow-up${followUpsDue === 1 ? " is" : "s are"} due soon.`;
      }
      stories.push({
        key: "customer",
        label: labels.customer,
        icon: "users",
        headline,
        actionUrl: waiting > 0 ? "/crm/leads" : "/crm/tasks",
        actionLabel: "Open CRM",
      });
    }
  }

  // BUSINESS WATCH
  const health = intelligence?.health;
  if (health?.hasData) {
    const pct = Math.round((health.score / health.maxScore) * 100);
    let headline;
    if (pct >= 75) {
      headline = `Your business looks healthy at ${health.score}/${health.maxScore}. ${health.strongest.name} is your strongest area right now.`;
    } else if (pct >= 50) {
      headline = `Your business needs some attention at ${health.score}/${health.maxScore}. ${health.weakest.name} is the area I'd focus on first.`;
    } else {
      headline = `Your business needs urgent attention at ${health.score}/${health.maxScore}. ${health.weakest.name} is the most critical area.`;
    }
    stories.push({
      key: "business",
      label: labels.business,
      icon: "activity",
      headline,
    });
  }

  // PEOPLE WATCH (only if HR data exists)
  if (hr?.hasData && hr.employeeCount > 0) {
    let headline;
    if (hr.pendingLeave > 0) {
      headline = `${hr.employeeCount} ${hr.employeeCount === 1 ? "team member" : "team members"} on record, with ${hr.pendingLeave} leave request${hr.pendingLeave === 1 ? "" : "s"} awaiting approval.`;
    } else {
      headline = `${hr.employeeCount} ${hr.employeeCount === 1 ? "team member" : "team members"} on record. No pending leave or compliance items.`;
    }
    stories.push({
      key: "people",
      label: labels.people,
      icon: "users",
      headline,
      actionUrl: "/hr",
      actionLabel: "Open HR",
    });
  }

  // STOCK WATCH (only if inventory data exists)
  if (inventory?.hasData && inventory.totalItems > 0) {
    const low = inventory.lowStockCount || 0;
    let headline;
    if (low > 0) {
      headline = `${low} item${low === 1 ? " is" : "s are"} running low in your inventory. Consider restocking soon to avoid disruption.`;
    } else {
      headline = `All ${inventory.totalItems} inventory item${inventory.totalItems === 1 ? "" : "s"} are above their low-stock threshold.`;
    }
    stories.push({
      key: "stock",
      label: labels.stock,
      icon: "package",
      headline,
      actionUrl: "/inventory",
      actionLabel: "Open Inventory",
    });
  }

  return stories;
}

// ── FADS' Pick — ONE clear priority ────────────────────────────────────
export function buildFadsPick(intelligence, crm, inventory, org) {
  const cur = org?.currency || "";
  const { cashflow, debt, health } = intelligence || {};
  const orgType = org?.type || "small_business";

  // Driver-tuned pick (Taxi Driver / Self-Employed).
  if (isDriverOrg(orgType)) {
    return buildDriverPick(intelligence, org);
  }

  // Priority 1: Cash is tight
  if (cashflow?.status === "TIGHT" || cashflow?.status === "CAUTION") {
    const overdueStr = debt?.totalOverdue > 0 ? `the ${formatCurrency(debt.totalOverdue, cur)} in overdue payments` : "reducing non-essential spending";
    return {
      headline: orgType === "church"
        ? `I'd focus on ${overdueStr} before increasing spending.`
        : `I'd start by following up ${overdueStr} before increasing spending.`,
      url: "/finance/money-owed",
      label: "Do this with FADS",
    };
  }

  // Priority 2: Overdue money
  if (debt?.totalOverdue > 0) {
    return {
      headline: `I'd follow up the ${formatCurrency(debt.totalOverdue, cur)} in overdue payments first — that's your quickest win.`,
      url: "/finance/money-owed",
      label: "Do this with FADS",
    };
  }

  // Priority 3: CRM leads waiting
  if (crm?.leadsWaiting > 0) {
    return {
      headline: `${crm.leadsWaiting} ${crm.leadsWaiting === 1 ? "proposal is" : "proposals are"} waiting for a response. Following up may be your quickest opportunity this week.`,
      url: "/crm/leads",
      label: "Do this with FADS",
    };
  }

  // Priority 4: Low inventory
  if (inventory?.lowStockCount > 0) {
    return {
      headline: `${inventory.lowStockCount} item${inventory.lowStockCount === 1 ? "" : "s"} in your inventory ${inventory.lowStockCount === 1 ? "is" : "are"} running low. I'd restock before it becomes a problem.`,
      url: "/inventory",
      label: "Do this with FADS",
    };
  }

  // Priority 5: Health weakest area
  if (health?.hasData) {
    const fixUrls = {
      "Cash flow": "/finance/transactions",
      "Profitability": "/finance/transactions",
      "Debt collection": "/finance/money-owed",
      "Expense control": "/finance/transactions",
      "Record completeness": "/finance/transactions",
    };
    return {
      headline: `I'd focus on improving ${health.weakest.name.toLowerCase()} — that's the area with the most room to improve right now.`,
      url: fixUrls[health.weakest.name] || "/assistant",
      label: "Do this with FADS",
    };
  }

  // Default
  return {
    headline: "Keep recording your income and expenses so I can give you better forecasts.",
    url: "/assistant",
    label: "Ask FADS",
  };
}

// ── Morning Bulletin — 3 compact items ─────────────────────────────────
export function buildBulletin(intelligence, crm, inventory, org) {
  const cur = org?.currency || "";
  const { cashflow, debt, health } = intelligence || {};
  const orgType = org?.type || "small_business";

  // Driver-tuned bulletin (Taxi Driver / Self-Employed).
  if (isDriverOrg(orgType)) {
    return buildDriverBulletin(intelligence, org);
  }

  const pick = buildFadsPick(intelligence, crm, inventory, org);

  // Good news — only label as "GOOD NEWS" when there's a genuine positive
  // development from real data. Otherwise fall back to a factual "TODAY" update.
  let goodNews;
  let goodNewsLabel = "GOOD NEWS";
  if (health?.hasData && health.score >= 75) {
    goodNews = `Business health is strong at ${health.score}/${health.maxScore}.`;
  } else if (cashflow?.hasData && cashflow.status === "OK") {
    goodNews = "Cash flow looks stable based on recent records.";
  } else if (cashflow?.hasData && cashflow.netBurnPerDay <= 0) {
    goodNews = "Income is currently outpacing spending.";
  } else if (health?.hasData) {
    goodNews = `${health.strongest.name} is your strongest area right now.`;
  } else {
    goodNews = "You're getting started — every record helps me help you.";
    goodNewsLabel = "TODAY";
  }

  // Watch this
  let watchThis;
  if (debt?.totalOverdue > 0) {
    watchThis = `${formatCurrency(debt.totalOverdue, cur)} is overdue.`;
  } else if (cashflow?.status === "TIGHT" || cashflow?.status === "CAUTION") {
    watchThis = "Cash flow may become tight soon.";
  } else if (crm?.leadsWaiting > 0) {
    watchThis = `${crm.leadsWaiting} ${crm.leadsWaiting === 1 ? "proposal" : "proposals"} waiting for a response.`;
  } else if (inventory?.lowStockCount > 0) {
    watchThis = `${inventory.lowStockCount} item${inventory.lowStockCount === 1 ? "" : "s"} running low in stock.`;
  } else if (health?.hasData && health.score < 75) {
    watchThis = `${health.weakest.name} needs attention.`;
  } else {
    watchThis = "No immediate risks detected.";
  }

  return { goodNews, goodNewsLabel, watchThis, pick: pick.headline, pickUrl: pick.url };
}

// ── Ticker text ────────────────────────────────────────────────────────
export function buildTicker(intelligence, crm, inventory, org) {
  const cur = org?.currency || "";
  const parts = [];
  const orgType = org?.type || "small_business";

  // Driver-tuned ticker (Taxi Driver / Self-Employed).
  if (isDriverOrg(orgType)) {
    return buildDriverTicker(intelligence, org);
  }

  const cf = intelligence?.cashflow;
  const debt = intelligence?.debt;

  if (cf?.hasData) {
    parts.push(`Cash ${formatCurrency(cf.cashNow, cur)}`);
  }
  if (debt?.totalOverdue > 0) {
    parts.push(`Overdue ${formatCurrency(debt.totalOverdue, cur)}`);
  }
  if (debt?.totalOutstanding > 0 && debt.totalOutstanding !== debt.totalOverdue) {
    parts.push(`Outstanding ${formatCurrency(debt.totalOutstanding, cur)}`);
  }
  if (crm?.leadsWaiting > 0) {
    parts.push(`${crm.leadsWaiting} lead${crm.leadsWaiting === 1 ? "" : "s"}`);
  }
  if (crm?.followUpsDue > 0) {
    parts.push(`${crm.followUpsDue} follow-up${crm.followUpsDue === 1 ? "" : "s"}`);
  }
  if (inventory?.lowStockCount > 0) {
    parts.push(`${inventory.lowStockCount} low stock`);
  }
  if (intelligence?.health?.hasData) {
    parts.push(`Health ${intelligence.health.score}/${intelligence.health.maxScore}`);
  }
  return parts.join("  ·  ");
}