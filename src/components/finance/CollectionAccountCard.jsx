import React from "react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/financeWording";
import { receivableStatus, receivableStatusBadge, receivableStatusLabel } from "@/lib/collectionsWording";
import { MessageCircle, CreditCard, FileText, Clock } from "lucide-react";

// Single outstanding account row for the Money Owed page. Shows name, amount,
// what it's for, due date, status, and last reminder (where available).
// Checkbox for multi-select. Quick actions: Send Reminder, Record Payment,
// View Invoice.
export default function CollectionAccountCard({
  account,
  selected,
  onToggleSelect,
  onSendReminder,
  onRecordPayment,
  wording,
  currency,
}) {
  const status = receivableStatus(account);
  const isOverdue = status === "overdue";
  const isPledge = !account.invoice_number;

  const description = isPledge
    ? account.fund || "Pledge"
    : (account.line_items || []).map((li) => li.description).filter(Boolean).join(", ") || account.invoice_number;

  const lastReminder = account.last_reminder_date
    ? new Date(account.last_reminder_date).toLocaleDateString()
    : null;

  const detailLink = isPledge ? "/church/giving" : `/finance/invoices/${account.id}`;

  return (
    <div className={`bg-card rounded-xl border p-4 ${isOverdue ? "border-status-bad/30" : "border-border"} ${selected ? "ring-2 ring-brand-teal" : ""}`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
          className="mt-1"
        />

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <p className="font-semibold text-brand-navy truncate">
                {account.customer_name || account.contact_name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {wording.whatFor}: {description}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className={`font-bold ${isOverdue ? "text-status-bad" : "text-brand-navy"}`}>
                {formatMoney(account.balance || ((account.pledged_amount || 0) - (account.contributed_amount || 0)), currency)}
              </p>
              <Badge variant="outline" className={`text-xs ${receivableStatusBadge(status)}`}>
                {receivableStatusLabel(status)}
              </Badge>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
            {account.due_date && (
              <span className={`flex items-center gap-1 ${isOverdue ? "text-status-bad" : ""}`}>
                <Clock className="w-3 h-3" />
                Due {account.due_date}
              </span>
            )}
            {lastReminder && (
              <span>Last reminder: {lastReminder}</span>
            )}
            {!isPledge && account.invoice_number && (
              <span>{account.invoice_number}</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={onSendReminder}
            >
              <MessageCircle className="w-3.5 h-3.5" /> {wording.sendReminder}
            </Button>
            {!isPledge && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                onClick={onRecordPayment}
              >
                <CreditCard className="w-3.5 h-3.5" /> {wording.recordPayment}
              </Button>
            )}
            <Link to={detailLink}>
              <Button size="sm" variant="ghost" className="h-8 gap-1.5">
                <FileText className="w-3.5 h-3.5" /> View {isPledge ? "Pledge" : wording.accountNoun}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}