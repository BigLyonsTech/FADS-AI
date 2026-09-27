import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useInventory } from "@/lib/useInventory";
import { inventoryWording } from "@/lib/inventoryWording";
import { useFinance } from "@/lib/useFinance";
import { useDataMode } from "@/lib/useDataMode";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Save } from "lucide-react";
import { useInventoryDictation } from "@/lib/useInventoryDictation";
import VoiceDictationPanel from "@/components/shared/VoiceDictationPanel";

export default function InventoryItemEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeOrg } = useWorkspace();
  const { items, invalidate } = useInventory();
  const fin = useFinance();
  const { dataMode } = useDataMode();
  const w = inventoryWording(activeOrg?.type);
  const suppliers = fin.contacts.filter((c) => c.kind === "supplier");

  const existing = id ? items.find((i) => i.id === id) : null;
  const [form, setForm] = useState({
    name: "", sku: "", category: "", supplier_id: "", supplier_name: "",
    cost_price: 0, selling_price: 0, low_stock_level: 0, is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [receivedQuantity, setReceivedQuantity] = useState("");
  const [voiceReview, setVoiceReview] = useState(false);
  const pendingCreatedId = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name || "",
        sku: existing.sku || "",
        category: existing.category || "",
        supplier_id: existing.supplier_id || "",
        supplier_name: existing.supplier_name || "",
        cost_price: existing.cost_price ?? 0,
        selling_price: existing.selling_price ?? 0,
        low_stock_level: existing.low_stock_level ?? 0,
        is_active: existing.is_active !== false,
      });
    } else if (!id) {
      setForm({ name: "", sku: "", category: "", supplier_id: "", supplier_name: "", cost_price: 0, selling_price: 0, low_stock_level: 0, is_active: true });
      setReceivedQuantity("");
      setVoiceReview(false);
      pendingCreatedId.current = null;
    }
  }, [existing, id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSupplierChange = (val) => {
    const sup = suppliers.find((s) => s.id === val);
    set("supplier_id", val);
    set("supplier_name", sup?.name || "");
  };

  const micSupported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    !!navigator.mediaDevices.getUserMedia &&
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined";
  const [autoDictate] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("speak") === "1";
    } catch (e) {
      return false;
    }
  });
  const dictation = useInventoryDictation({
    autoStart: autoDictate,
    onParsed: (item) => {
      if (!item) return;
      setVoiceReview(true);
      if (item.name) set("name", item.name);
      if (item.sku) set("sku", item.sku);
      if (item.category) set("category", item.category);
      if (item.supplier_id) {
        set("supplier_id", item.supplier_id);
        set("supplier_name", item.supplier_name || "");
      } else if (item.supplier_name) {
        set("supplier_name", item.supplier_name);
      }
      if (item.cost_price != null) set("cost_price", item.cost_price);
      if (item.selling_price != null) set("selling_price", item.selling_price);
      if (item.low_stock_level != null) set("low_stock_level", item.low_stock_level);
      setReceivedQuantity(item.quantity != null ? String(item.quantity) : "");
    },
  });

  const submit = async () => {
    if (receivedQuantity !== "" && (!Number.isInteger(Number(receivedQuantity)) || Number(receivedQuantity) < 0)) {
      setError("Received quantity must be a whole number of zero or more.");
      return;
    }
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        organisation_id: activeOrg.id,
        name: form.name.trim(),
        sku: form.sku.trim(),
        category: form.category.trim(),
        supplier_id: form.supplier_id || null,
        supplier_name: form.supplier_name || "",
        cost_price: Number(form.cost_price) || 0,
        selling_price: Number(form.selling_price) || 0,
        low_stock_level: Number(form.low_stock_level) || 0,
        is_active: form.is_active,
        data_mode: dataMode,
      };
      if (existing) {
        await base44.entities.InventoryItem.update(existing.id, payload);
      } else {
        payload.current_quantity = 0;
        const itemId = pendingCreatedId.current || (await base44.entities.InventoryItem.create(payload)).id;
        pendingCreatedId.current = itemId;
        if (Number(receivedQuantity) > 0) {
          await base44.functions.invoke("inventory", {
            action: "add_movement",
            organisation_id: activeOrg.id,
            item_id: itemId,
            type: "stock_in",
            quantity: Number(receivedQuantity),
            date: new Date().toISOString().slice(0, 10),
            note: "Opening stock confirmed during item creation",
          });
        }
        pendingCreatedId.current = null;
      }
      await invalidate();
      navigate(existing ? `/inventory/${existing.id}` : "/inventory");
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <Link to={existing ? `/inventory/${existing.id}` : "/inventory"} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-navy">
        <ChevronLeft className="w-4 h-4" /> Back
      </Link>

      <h1 className="text-xl sm:text-2xl font-bold text-brand-navy">{existing ? "Edit" : "New"} {w.itemNoun}</h1>

      <Card><CardContent className="p-5 space-y-4">
        {micSupported && (
          <VoiceDictationPanel
            dictation={dictation}
            speakLabel="Speak an Item"
            preparingMessage="FADS is organising your stock…"
            example='e.g. “Add 12 bottles of water at €1.20 cost each”'
          />
        )}
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={w.itemNoun + " name"} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="sku">SKU / Reference</Label>
            <Input id="sku" value={form.sku} onChange={(e) => set("sku", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Input id="category" value={form.category} onChange={(e) => set("category", e.target.value)} list="inv-cats" placeholder="e.g. Books" />
            <datalist id="inv-cats">
              {w.categoryExamples.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>

        <div>
          <Label htmlFor="supplier">Supplier</Label>
          <select
            id="supplier"
            value={form.supplier_id}
            onChange={(e) => onSupplierChange(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-base md:text-sm"
          >
            <option value="">— None —</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {suppliers.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">No suppliers yet — add one in Finance → Suppliers.</p>
          )}
        </div>

        {!existing && (
          <div>
            <Label htmlFor="received-quantity">Quantity received (review before Save)</Label>
            <Input id="received-quantity" type="number" min="0" step="1" inputMode="numeric" value={receivedQuantity} onChange={(e) => setReceivedQuantity(e.target.value)} placeholder="Leave blank if not supplied" />
            <p className="text-xs text-muted-foreground mt-1">Stock is added only when you press Save. Leave blank if you are unsure.</p>
          </div>
        )}
        {voiceReview && (
          <p className="rounded-md border border-brand-teal/30 bg-brand-mint/40 p-3 text-sm">
            Review the name, received quantity, selling price and currency ({activeOrg?.currency || "not set"}) against “You said” above. Correct any field before Save; no SKU or price is assumed.
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="cost">Cost price</Label>
            <Input id="cost" type="number" inputMode="decimal" value={form.cost_price} onChange={(e) => set("cost_price", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="sell">Selling price</Label>
            <Input id="sell" type="number" inputMode="decimal" value={form.selling_price} onChange={(e) => set("selling_price", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="low">Low-stock level</Label>
            <Input id="low" type="number" inputMode="decimal" value={form.low_stock_level} onChange={(e) => set("low_stock_level", e.target.value)} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="w-4 h-4" />
          Active
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent></Card>

      <div className="flex gap-2">
        <Button className="h-11" onClick={submit} disabled={saving}>
          <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save"}
        </Button>
        <Button variant="outline" className="h-11" onClick={() => navigate(existing ? `/inventory/${existing.id}` : "/inventory")}>Cancel</Button>
      </div>
    </div>
  );
}