import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { computeInvoiceTotals } from "@/lib/invoiceUtils";
import { formatMoney } from "@/lib/financeWording";
import { useDataMode } from "@/lib/useDataMode";
import ContactDialog from "@/components/finance/ContactDialog";

// Shared invoice create/edit form. Computes line totals live; the backend
// recomputes authoritatively on save. `record` (optional) pre-fills for edit.
export default function InvoiceForm({
  orgId,
  currency,
  defaultTaxRate,
  contacts,
  customers,
  inventoryItems = [],
  enableInventoryLink = false,
  record,
  prefill,
  wording,
  onSaved,
  onCancel,
}) {
  const { dataMode } = useDataMode();
  const source = record || prefill || {};
  const [customerId, setCustomerId] = useState(source.customer_id || "");
  const [issueDate, setIssueDate] = useState(
    source.issue_date || new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = useState(source.due_date || "");
  const [items, setItems] = useState(
    source.line_items?.length
      ? source.line_items
      : [{ description: "", inventory_item_id: "", quantity: 1, unit_price: 0, discount: 0, tax_rate: "" }]
  );
  const [instructions, setInstructions] = useState(source.payment_instructions || "");
  const [notes, setNotes] = useState(source.notes || "");
  const [issueNow, setIssueNow] = useState(record?.status === "issued");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [extraCustomers, setExtraCustomers] = useState([]);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const allCustomers = [...customers, ...extraCustomers];
  const activeInventoryItems = useMemo(
    () => inventoryItems.filter((item) => item.is_active !== false),
    [inventoryItems]
  );

  const totals = useMemo(
    () => computeInvoiceTotals(items, defaultTaxRate),
    [items, defaultTaxRate]
  );

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };
  const addItem = () =>
    setItems((prev) => [...prev, { description: "", inventory_item_id: "", quantity: 1, unit_price: 0, discount: 0, tax_rate: "" }]);
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!customerId) return setError("Select a customer");
    if (!issueDate || !dueDate) return setError("Issue and due dates are required");
    if (!items.length || items.some((it) => !it.description && !it.unit_price)) {
      return setError("Add at least one line item with a description");
    }
    if (totals.total <= 0) {
      return setError("Invoice total must be greater than zero");
    }
    setSaving(true);
    try {
      const payload = {
        organisation_id: orgId,
        data_mode: dataMode,
        customer_id: customerId,
        issue_date: issueDate,
        due_date: dueDate,
        line_items: items,
        payment_instructions: instructions,
        notes,
        status: issueNow ? "issued" : "draft",
      };
      if (record) {
        await base44.functions.invoke("invoices", { action: "update_invoice", ...payload, invoice_id: record.id });
      } else {
        await base44.functions.invoke("invoices", { action: "create_invoice", ...payload });
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || err.data?.error || err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && (
        <div className="bg-status-bad/10 border border-status-bad/30 text-status-bad text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-1">
          <Label className="mb-1.5 block">{wording.customerNoun}</Label>
          <div className="flex gap-2">
            <ResponsiveSelect
              value={customerId}
              onValueChange={setCustomerId}
              placeholder="Select…"
              triggerClassName="h-11 flex-1"
              options={allCustomers.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 gap-1"
              onClick={() => setContactDialogOpen(true)}
              title="Create a new customer without leaving this invoice"
            >
              <Plus className="w-4 h-4" /> New
            </Button>
          </div>
        </div>
        <div>
          <Label className="mb-1.5 block">Issue Date</Label>
          <Input type="date" className="h-11" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1.5 block">Due Date</Label>
          <Input type="date" className="h-11" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>

      {/* Line items */}
      <div>
        <Label className="mb-2 block">Line Items</Label>
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="bg-muted/40 rounded-lg p-3 space-y-2">
              {enableInventoryLink && (
                <div>
                  <span className="text-[11px] text-muted-foreground">Inventory item (optional)</span>
                  <ResponsiveSelect
                    value={it.inventory_item_id || ""}
                    onValueChange={(value) => updateItem(idx, "inventory_item_id", value)}
                    placeholder="Service / no inventory item"
                    triggerClassName="h-10 mt-1"
                    options={[
                      { value: "", label: "Service / no inventory item" },
                      ...activeInventoryItems.map((item) => ({
                        value: item.id,
                        label: `${item.name}${item.sku ? ` · ${item.sku}` : ""} · ${Number(item.current_quantity) || 0} in stock`,
                      })),
                    ]}
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  className="h-11 flex-1"
                  placeholder="Description"
                  value={it.description}
                  onChange={(e) => updateItem(idx, "description", e.target.value)}
                />
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 text-status-bad"
                    onClick={() => removeItem(idx)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div>
                  <span className="text-[11px] text-muted-foreground">Qty</span>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    className="h-10"
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                  />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Unit Price</span>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    className="h-10"
                    value={it.unit_price}
                    onChange={(e) => updateItem(idx, "unit_price", e.target.value)}
                  />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Discount</span>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    className="h-10"
                    value={it.discount}
                    onChange={(e) => updateItem(idx, "discount", e.target.value)}
                  />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Tax %</span>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    className="h-10"
                    placeholder={String(defaultTaxRate || 0)}
                    value={it.tax_rate}
                    onChange={(e) => updateItem(idx, "tax_rate", e.target.value)}
                  />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Total</span>
                  <div className="h-10 flex items-center font-semibold text-brand-navy">
                    {formatMoney(
                      (Number(it.quantity) || 1) * (Number(it.unit_price) || 0) -
                        (Number(it.discount) || 0),
                      currency
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" className="h-10 mt-2" onClick={addItem}>
          <Plus className="w-4 h-4" /> Add Line
        </Button>
        {enableInventoryLink && (
          <p className="text-xs text-muted-foreground mt-2">
            Link inventory only for product lines. Service lines can stay unlinked. Creating or paying this invoice does not automatically reduce stock.
          </p>
        )}
      </div>

      {/* Totals */}
      <div className="bg-muted/40 rounded-lg p-4 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatMoney(totals.subtotal, currency)}</span>
        </div>
        {Number(totals.discount_total) > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span className="font-medium">-{formatMoney(totals.discount_total, currency)}</span>
          </div>
        )}
        {Number(totals.tax_total) > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span className="font-medium">{formatMoney(totals.tax_total, currency)}</span>
          </div>
        )}
        <div className="flex justify-between pt-1.5 border-t border-border">
          <span className="font-semibold text-brand-navy">Total</span>
          <span className="font-bold text-lg text-brand-navy">{formatMoney(totals.total, currency)}</span>
        </div>
      </div>

      <div>
        <Label className="mb-1.5 block">Payment Instructions</Label>
        <Textarea
          rows={2}
          placeholder="Bank details, payment terms…"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>
      <div>
        <Label className="mb-1.5 block">Notes</Label>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={issueNow}
          onChange={(e) => setIssueNow(e.target.checked)}
          className="w-4 h-4"
        />
        Issue this {wording.invoiceNoun.toLowerCase()} immediately
      </label>

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="h-11 flex-1" disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {record ? "Save Changes" : `Create ${wording.invoiceNoun}`}
        </Button>
        <Button type="button" variant="outline" className="h-11" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {contactDialogOpen && (
        <ContactDialog
          open
          onClose={() => setContactDialogOpen(false)}
          orgId={orgId}
          defaultKind={customers[0]?.kind || "customer"}
          onSaved={(newId, rec) => {
            if (newId && rec) {
              setExtraCustomers((prev) => [...prev, rec]);
              setCustomerId(newId);
            }
          }}
        />
      )}
    </form>
  );
}