import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { base44 } from "@/api/base44Client";
import { useDataMode } from "@/lib/useDataMode";
import { Loader2 } from "lucide-react";

const KINDS = [
  { value: "customer", label: "Customer" },
  { value: "parent", label: "Parent/Guardian" },
  { value: "member", label: "Member" },
  { value: "donor", label: "Donor" },
  { value: "supplier", label: "Supplier" },
  { value: "other", label: "Other" },
];

export default function ContactDialog({ open, onClose, onSaved, record, orgId, defaultKind }) {
  const isEdit = !!record;
  const { dataMode } = useDataMode();
  const [kind, setKind] = useState(defaultKind || "customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (record) {
      setKind(record.kind || defaultKind || "customer");
      setName(record.name || "");
      setEmail(record.email || "");
      setPhone(record.phone || "");
      setAddress(record.address || "");
      setNotes(record.notes || "");
    } else {
      setKind(defaultKind || "customer");
      setName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setNotes("");
    }
  }, [open, record, defaultKind]);

  const submit = async () => {
    setError("");
    if (!name) {
      setError("Name is required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        organisation_id: orgId,
        data_mode: dataMode,
        kind,
        name,
        email,
        phone,
        address,
        notes,
      };
      let newId;
      if (isEdit) {
        await base44.functions.invoke("finance", {
          action: "update_contact",
          contact_id: record.id,
          ...payload,
        });
        newId = record.id;
      } else {
        const res = await base44.functions.invoke("finance", {
          action: "create_contact",
          ...payload,
        });
        newId = res?.data?.id || res?.id;
      }
      onSaved?.(newId, { id: newId, kind, name, email, phone, address });
      onClose?.();
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit" : "New"} Contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <div className="p-2 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
          <div>
            <Label>Type</Label>
            <ResponsiveSelect
              value={kind}
              onValueChange={setKind}
              placeholder="Select type"
              triggerClassName="h-11"
              options={KINDS}
            />
          </div>
          <div>
            <Label>Name</Label>
            <Input className="h-11" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Email (optional)</Label>
            <Input
              className="h-11"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label>Phone (optional)</Label>
            <Input className="h-11" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label>Address (optional)</Label>
            <Input
              className="h-11"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button className="h-11" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}