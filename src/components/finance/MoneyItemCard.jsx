import React from "react";
import { X } from "lucide-react";

// Shared review/edit card for a single parsed money item (income or expense).
// Used by both the FADS Voice Player (Driver) and TalkToFadsRecorder
// (Self-Employed) so the review/approval UI stays identical across surfaces.
export default function MoneyItemCard({ item, index, currency, incomeCats, expenseCats, accounts, onUpdate, onRemove }) {
  return (
    <div className="rounded-xl border border-border p-3 space-y-2 bg-muted/20">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            item.direction === "in" ? "bg-status-ok/15 text-status-ok" : "bg-status-warn/15 text-status-warn"
          }`}
        >
          {item.direction === "in" ? "Money In" : "Money Out"}
        </span>
        <button onClick={() => onRemove(index)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Amount ({currency})</label>
          <input
            type="number" min="0" step="0.01"
            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={item.amount} onChange={(e) => onUpdate(index, { amount: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Date</label>
          <input
            type="date"
            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={item.date} onChange={(e) => onUpdate(index, { date: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground">Description</label>
        <input
          type="text"
          className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={item.description} onChange={(e) => onUpdate(index, { description: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Category</label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={item.category_id} onChange={(e) => onUpdate(index, { category_id: e.target.value })}
          >
            <option value="">—</option>
            {(item.direction === "in" ? incomeCats : expenseCats).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Account</label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={item.account_id} onChange={(e) => onUpdate(index, { account_id: e.target.value })}
          >
            <option value="">—</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground">Payment method</label>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={item.payment_method} onChange={(e) => onUpdate(index, { payment_method: e.target.value })}
        >
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="mobile_money">Mobile Money</option>
          <option value="other">Other</option>
        </select>
      </div>
    </div>
  );
}