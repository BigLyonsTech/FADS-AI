import React, { useMemo, useState } from "react";
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

const emptyLine = () => ({
  description: "",
  inventory_item_id: "",
  quantity: 1,
  unit_price: 0,
  discount: 0,
  tax_rate: "",
});

export default function QuotationForm({
  orgId,
  currency,
  defaultTaxRate,
  customers,
  inventoryItems = [],
  record,
  onSaved,
  onCancel,
}) {
  const { dataMode } = useDataMode();
  const source = record || {};
  const [customerId, setCustomerId] = useState(source.customer_id || "");
  const [issueDate, setIssueDate] = useState(
    source.issue_date || new Date().toISOString().slice(0, 10)
  );
  const [validUntil, setValidUntil] = useState(source.valid_until || "");
  const [items, setItems] = useState(
    source.line_items?.length ? source.line_items : [emptyLine()]
  );
  const [notes, setNotes] = useState(source.notes || "");
  const [terms, setTerms] = useState(source.terms || "");
  const [extraCustomers, setExtraCustomers] = useState([]);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const allCustomers = [...customers, ...extraCustomers];
  const activeInventoryItems = useMemo(
    () => inventoryItems.filter((item) => item.is_active !== false),
    [inventoryItems]
  );
  const totals = useMemo(
    () => computeInvoiceTotals(items, defaultTaxRate),
    [items, defaultTaxRate]
  );

  const updateItem = (index, field, value) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!customerId) return setError("Select a customer.");
    if (!issueDate || !validUntil) return setError("Issue and valid-until dates are required.");
    if (validUntil < issueDate) return setError("Valid-until date cannot be before the issue date.");
    if (!items.length || items.some((item) => !item.description && !item.unit_price)) {
      return setError("Add at least one line item with a description.");
    }
    if (totals.total <= 0) {
      return setError("Quotation total must be greater than zero.");
    }

    setSaving(true);
    try {
      const payload = {
        organisation_id: orgId,
        data_mode: dataMode,
        customer_id: customerId,
        issue_date: issueDate,
        valid_until: validUntil,
        line_items: items,
        notes,
        terms,
      };

      let savedId = record?.id;
      if (record?.id) {
        await base44.functions.invoke("quotations", {
          action: "update_quotation",
          quotation_id: record.id,
          ...payload,
        });
      } else {
        const response = await base44.functions.invoke("quotations", {
          action: "create_quotation",
          ...payload,
        });
        const result = response?.data ?? response;
        savedId = result?.id;
      }
      onSaved?.(savedId);
    } catch (err) {
      setError(err.response?.data?.error || err.data?.error || err.message || "Failed to save quotation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-status-bad/30 bg-status-bad/10 p-3 text-sm text-status-bad">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label className="mb-1.5 block">Customer</Label>
          <div className="flex gap-2">
            <ResponsiveSelect
              value={customerId}
              onValueChange={setCustomerId}
              placeholder="Select customer…"
              triggerClassName="h-11 flex-1"
              options={allCustomers.map((customer) => ({
                value: customer.id,
                label: customer.name,
              }))}
            />
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 gap-1"
              onClick={() => setContactDialogOpen(true)}
            >
              <Plus className="w-4 h-4" /> New
            </Button>
          </div>
        </div>
        <div>
          <Label className="mb-1.5 block">Issue Date</Label>
          <Input
            type="date"
            className="h-11"
            value={issueDate}
            onChange={(event) => setIssueDate(event.target.value)}
          />
        </div>
        <div>
          <Label className="mb-1.5 block">Valid Until</Label>
          <Input
            type="date"
            className="h-11"
            value={validUntil}
            onChange={(event) => setValidUntil(event.target.value)}
          />
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Products / Services</Label>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="rounded-lg bg-muted/40 p-3 space-y-2">
              <div>
                <span className="text-[11px] text-muted-foreground">
                  Inventory item (optional)
                </span>
                <ResponsiveSelect
                  value={item.inventory_item_id || ""}
                  onValueChange={(value) => updateItem(index, "inventory_item_id", value)}
                  placeholder="Service / no inventory item"
                  triggerClassName="h-10 mt-1"
                  options={[
                    { value: "", label: "Service / no inventory item" },
                    ...activeInventoryItems.map((inventoryItem) => ({
                      value: inventoryItem.id,
                      label: `${inventoryItem.name}${inventoryItem.sku ? ` · ${inventoryItem.sku}` : ""} · ${Number(inventoryItem.current_quantity) || 0} in stock`,
                    })),
                  ]}
                />
              </div>

              <div className="flex gap-2">
                <Input
                  className="h-11 flex-1"
                  placeholder="Description"
                  value={item.description || ""}
                  onChange={(event) => updateItem(index, "description", event.target.value)}
                />
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 text-status-bad"
                    onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
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
                    value={item.quantity}
                    onChange={(event) => updateItem(index, "quantity", event.target.value)}
                  />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Unit Price</span>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    className="h-10"
                    value={item.unit_price}
                    onChange={(event) => updateItem(index, "unit_price", event.target.value)}
                  />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Discount</span>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    className="h-10"
                    value={item.discount || 0}
                    onChange={(event) => updateItem(index, "discount", event.target.value)}
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
                    value={item.tax_rate ?? ""}
                    onChange={(event) => updateItem(index, "tax_rate", event.target.value)}
                  />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Total</span>
                  <div className="h-10 flex items-center font-semibold text-brand-navy">
                    {formatMoney(totals.line_items[index]?.total || 0, currency)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-10 mt-2"
          onClick={() => setItems((current) => [...current, emptyLine()])}
        >
          <Plus className="w-4 h-4" /> Add Line
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Link inventory only when the quotation is for a product. Services can stay unlinked.
          Quotations never reduce stock.
        </p>
      </div>

      <div className="rounded-lg bg-muted/40 p-4 space-y-1.5 text-sm">
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
          <span className="font-bold text-lg text-brand-navy">
            {formatMoney(totals.total, currency)}
          </span>
        </div>
      </div>

      <div>
        <Label className="mb-1.5 block">Notes</Label>
        <Textarea
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional note for the customer"
        />
      </div>

      <div>
        <Label className="mb-1.5 block">Terms</Label>
        <Textarea
          rows={3}
          value={terms}
          onChange={(event) => setTerms(event.target.value)}
          placeholder="Validity, scope, deposit or other quotation terms"
        />
      </div>

      <div className="rounded-lg border border-brand-teal/20 bg-brand-mint/30 p-3 text-xs text-brand-navy">
        Saving or accepting a quotation does not create a sale, invoice, payment, money owed or stock movement.
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="h-11 flex-1" disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {record?.id ? "Save Changes" : "Create Quotation"}
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
          defaultKind="customer"
          onSaved={(newId, customer) => {
            if (newId && customer) {
              setExtraCustomers((current) => [...current, customer]);
              setCustomerId(newId);
            }
          }}
        />
      )}
    </form>
  );
}
