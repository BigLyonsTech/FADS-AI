import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useDataMode } from "@/lib/useDataMode";
import { Loader2, Plus, Trash2, Save, AlertCircle } from "lucide-react";

// Bulk Finance Entry — lets an authorised finance user add multiple existing
// Finance transactions in one table. Each row is saved through the existing
// "create_transaction" finance action, so it reuses the exact same fields,
// server-side validation, organisation isolation and finance-role permission
// check as a single transaction. No new finance logic is introduced.

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "cleared", label: "Cleared" },
  { value: "pending", label: "Pending" },
  { value: "cancelled", label: "Cancelled" },
];

let ROW_SEQ = 0;
const makeRow = (defaultAccountId) => ({
  rowId: ++ROW_SEQ,
  date: new Date().toISOString().slice(0, 10),
  direction: "in",
  account_id: defaultAccountId || "",
  contact_id: "",
  category_id: "",
  description: "",
  amount: "",
  payment_method: "cash",
  reference: "",
  status: "cleared",
  internal_notes: "",
  error: "",
  saving: false,
});

export default function BulkFinanceEntryDialog({
  open,
  onClose,
  onSaved,
  accounts,
  categories,
  contacts,
  orgId,
  wording,
  currency,
}) {
  const { dataMode } = useDataMode();
  const defaultAccountId = accounts[0]?.id || "";
  const [rows, setRows] = useState(() => [makeRow(defaultAccountId)]);
  const [busy, setBusy] = useState(false);

  const updateRow = (rowId, patch) =>
    setRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, ...patch, error: "" } : r))
    );

  const addRow = () => setRows((prev) => [...prev, makeRow(defaultAccountId)]);
  const removeRow = (rowId) =>
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));

  const contactsFor = (dir) =>
    contacts.filter((c) => (dir === "out" ? c.kind === "supplier" : c.kind !== "supplier"));
  const categoriesFor = (dir) =>
    categories.filter((c) => c.kind === (dir === "in" ? "income" : "expense"));

  const isValid = (r) => r.account_id && r.amount && Number(r.amount) > 0 && r.date;
  const validCount = rows.filter(isValid).length;

  const saveAll = async () => {
    if (busy) return;
    // Mark invalid rows with an error so the user can see what to fix.
    setRows((prev) =>
      prev.map((r) => (isValid(r) ? { ...r, error: "" } : { ...r, error: "Account, amount and date are required" }))
    );
    const toSave = rows.filter(isValid);
    if (toSave.length === 0) return;

    setBusy(true);
    let savedCount = 0;
    const resultByRowId = new Map();
    // Save sequentially to avoid bursting the platform request rate limit
    // (mirrors the single-transaction flow, one request per row).
    for (const r of toSave) {
      setRows((prev) => prev.map((x) => (x.rowId === r.rowId ? { ...x, saving: true } : x)));
      try {
        await base44.functions.invoke("finance", {
          action: "create_transaction",
          organisation_id: orgId,
          data_mode: dataMode,
          direction: r.direction,
          account_id: r.account_id,
          category_id: r.category_id || null,
          contact_id: r.contact_id || null,
          amount: Number(r.amount),
          date: r.date,
          reference: r.reference,
          description: r.description,
          payment_method: r.payment_method,
          internal_notes: r.internal_notes,
          status: r.status,
        });
        savedCount++;
        resultByRowId.set(r.rowId, { saved: true });
      } catch (e) {
        resultByRowId.set(r.rowId, {
          saved: false,
          error: e.response?.data?.error || e.message || "Failed",
        });
      }
      setRows((prev) =>
        prev.map((x) =>
          x.rowId === r.rowId
            ? {
                ...x,
                saving: false,
                error: resultByRowId.get(r.rowId).error || "",
              }
            : x
        )
      );
    }
    // Remove successfully saved rows; keep failed/invalid rows for fixing.
    setRows((prev) => prev.filter((r) => !resultByRowId.get(r.rowId)?.saved));
    setBusy(false);
    if (savedCount > 0) onSaved?.();
  };

  const inputCls = "h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose?.()}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Bulk Finance Entry</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-1">
          Add multiple transactions at once. Each saved row becomes a normal Finance
          transaction for {wording?.moneyIn ? "this workspace" : "this organisation"}.
          Currency: <span className="font-medium text-brand-navy">{currency}</span>.
        </p>

        <div className="max-h-[58vh] overflow-auto border border-border rounded-lg">
          <table className="min-w-[1120px] w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-muted/90 backdrop-blur z-10">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="p-2 font-medium whitespace-nowrap">Date</th>
                <th className="p-2 font-medium whitespace-nowrap">Type</th>
                <th className="p-2 font-medium whitespace-nowrap">Account</th>
                <th className="p-2 font-medium whitespace-nowrap">Customer / Supplier</th>
                <th className="p-2 font-medium whitespace-nowrap">Description</th>
                <th className="p-2 font-medium whitespace-nowrap">Category</th>
                <th className="p-2 font-medium whitespace-nowrap">Amount</th>
                <th className="p-2 font-medium whitespace-nowrap">Currency</th>
                <th className="p-2 font-medium whitespace-nowrap">Payment Method</th>
                <th className="p-2 font-medium whitespace-nowrap">Reference</th>
                <th className="p-2 font-medium whitespace-nowrap">Status</th>
                <th className="p-2 font-medium whitespace-nowrap">Notes</th>
                <th className="p-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.rowId} className="border-t border-border align-top">
                  <td className="p-1">
                    <input
                      type="date"
                      className={inputCls}
                      value={r.date}
                      onChange={(e) => updateRow(r.rowId, { date: e.target.value })}
                    />
                  </td>
                  <td className="p-1">
                    <select
                      className={inputCls}
                      value={r.direction}
                      onChange={(e) =>
                        updateRow(r.rowId, {
                          direction: e.target.value,
                          category_id: "",
                          contact_id: "",
                        })
                      }
                    >
                      <option value="in">{wording?.moneyIn || "Income"}</option>
                      <option value="out">{wording?.moneyOut || "Expense"}</option>
                    </select>
                  </td>
                  <td className="p-1">
                    <select
                      className={inputCls}
                      value={r.account_id}
                      onChange={(e) => updateRow(r.rowId, { account_id: e.target.value })}
                    >
                      <option value="">Select…</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1">
                    <select
                      className={inputCls}
                      value={r.contact_id}
                      onChange={(e) => updateRow(r.rowId, { contact_id: e.target.value })}
                    >
                      <option value="">—</option>
                      {contactsFor(r.direction).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1">
                    <input
                      type="text"
                      className={inputCls}
                      value={r.description}
                      onChange={(e) => updateRow(r.rowId, { description: e.target.value })}
                      placeholder="Description"
                    />
                  </td>
                  <td className="p-1">
                    <select
                      className={inputCls}
                      value={r.category_id}
                      onChange={(e) => updateRow(r.rowId, { category_id: e.target.value })}
                    >
                      <option value="">—</option>
                      {categoriesFor(r.direction).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputCls}
                      value={r.amount}
                      onChange={(e) => updateRow(r.rowId, { amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="text"
                      className={`${inputCls} bg-muted/40`}
                      value={currency}
                      disabled
                      title="Currency is set by your organisation"
                    />
                  </td>
                  <td className="p-1">
                    <select
                      className={inputCls}
                      value={r.payment_method}
                      onChange={(e) => updateRow(r.rowId, { payment_method: e.target.value })}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1">
                    <input
                      type="text"
                      className={inputCls}
                      value={r.reference}
                      onChange={(e) => updateRow(r.rowId, { reference: e.target.value })}
                      placeholder="Ref"
                    />
                  </td>
                  <td className="p-1">
                    <select
                      className={inputCls}
                      value={r.status}
                      onChange={(e) => updateRow(r.rowId, { status: e.target.value })}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1">
                    <input
                      type="text"
                      className={inputCls}
                      value={r.internal_notes}
                      onChange={(e) => updateRow(r.rowId, { internal_notes: e.target.value })}
                      placeholder="Notes"
                    />
                  </td>
                  <td className="p-1 text-center align-middle">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={busy}
                      onClick={() => removeRow(r.rowId)}
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={13} className="p-6 text-center text-sm text-muted-foreground">
                    No rows yet. Click “Add row” to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {rows.some((r) => r.error) && (
          <div className="mt-1 space-y-1">
            {rows.map((r, i) =>
              r.error ? (
                <div key={r.rowId} className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Row {i + 1}: {r.error}
                </div>
              ) : null
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            className="h-10 gap-1.5"
            onClick={addRow}
            disabled={busy}
          >
            <Plus className="w-4 h-4" /> Add row
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-10 gap-1.5"
              onClick={saveAll}
              disabled={busy || rows.length === 0}
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save All{validCount > 0 ? ` (${validCount})` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}