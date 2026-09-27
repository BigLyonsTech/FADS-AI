import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Loader2 } from "lucide-react";
import { getCrmConfig, CONTACT_STATUS_OPTIONS, getContactTypeDescription, isEmployeeContactType } from "@/lib/crmWording";
import { useWorkspace } from "@/lib/useWorkspace";
import { useNavigate } from "react-router-dom";
import { Briefcase, ArrowRight } from "lucide-react";
import {
  COUNTRY_DIAL_CODES,
  suggestDialCountry,
  detectDialCountry,
  dialCodeByCode,
  formatWithDialCode,
} from "@/lib/phoneCountry";

export default function ContactDialog({ open, onClose, onSaved, record, orgId, orgType }) {
  const isEdit = !!record;
  const { activeOrg } = useWorkspace();
  const navigate = useNavigate();
  const config = getCrmConfig(activeOrg);
  const [form, setForm] = useState({});
  const [tagsStr, setTagsStr] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dialCode, setDialCode] = useState("");
  const [mobileRaw, setMobileRaw] = useState("");
  const [landlineRaw, setLandlineRaw] = useState("");
  const isEmployee = isEmployeeContactType(orgType, form.contact_type);

  useEffect(() => {
    if (!open) return;
    setError("");
    const suggested = suggestDialCountry(activeOrg);
    if (record) {
      setForm({
        first_name: record.first_name || "",
        last_name: record.last_name || "",
        email: record.email || "",
        phone: record.phone || "",
        organisation_name: record.organisation_name || "",
        contact_type: record.contact_type || config.contactTypes[0]?.value || "",
        status: record.status || "new",
        source: record.source || "",
        notes: record.notes || "",
        address: record.address || "",
        assigned_user_name: record.assigned_user_name || "",
        last_contact_date: record.last_contact_date || "",
        next_follow_up_date: record.next_follow_up_date || "",
      });
      setTagsStr((record.tags || []).join(", "));
      const existing = record.mobile || record.phone || "";
      setMobileRaw(existing);
      setLandlineRaw(record.landline || "");
      setDialCode((detectDialCountry(existing) || suggested)?.code || "");
    } else {
      setForm({
        first_name: "", last_name: "", email: "", phone: "",
        organisation_name: "", contact_type: config.contactTypes[0]?.value || "",
        status: "new", source: "", notes: "", address: "",
        assigned_user_name: "", last_contact_date: "", next_follow_up_date: "",
      });
      setTagsStr("");
      setMobileRaw("");
      setLandlineRaw("");
      setDialCode(suggested?.code || "");
    }
  }, [open, record, orgType, activeOrg]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setError("");
    if (!form.first_name) { setError("First name is required"); return; }
    if (!form.contact_type) { setError("Contact type is required"); return; }
    const dial = dialCodeByCode(dialCode)?.dial || "";
    const mobile = formatWithDialCode(dial, mobileRaw);
    const landline = formatWithDialCode(dial, landlineRaw);
    setBusy(true);
    try {
      const payload = {
        ...form,
        phone: mobile,
        mobile,
        landline,
        tags: tagsStr.split(",").map((t) => t.trim()).filter(Boolean),
      };
      await onSaved(payload, isEdit, record?.id);
    } catch (e) {
      setError(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit" : "New"} Contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && <div className="p-2 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}
          {/* Type-first: ask "What type of contact is this?" before anything else. */}
          <div>
            <Label>What type of contact is this? *</Label>
            <ResponsiveSelect
              value={form.contact_type || ""}
              onValueChange={(v) => set("contact_type", v)}
              placeholder="Select type"
              triggerClassName="h-11"
              options={config.contactTypes}
            />
            {form.contact_type && getContactTypeDescription(form.contact_type) && (
              <p className="text-xs text-muted-foreground mt-1.5">{getContactTypeDescription(form.contact_type)}</p>
            )}
          </div>

          {/* Staff/employees are managed in HR — direct the user there rather
              than creating a duplicate person record. */}
          {isEmployee && (
            <div className="rounded-lg bg-brand-mint/60 border border-brand-mint p-3 space-y-2">
              <div className="flex items-start gap-2 text-sm text-brand-navy">
                <Briefcase className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
                <span>
                  Staff are managed in the HR module with full employment details (department, role, pay, documents).
                  We recommend adding them there to avoid duplicate records.
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1"
                onClick={() => { onClose?.(); navigate("/hr/employees/new"); }}
              >
                Add in HR instead <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First name *</Label>
              <Input className="h-11" value={form.first_name || ""} onChange={(e) => set("first_name", e.target.value)} />
            </div>
            <div>
              <Label>Last name</Label>
              <Input className="h-11" value={form.last_name || ""} onChange={(e) => set("last_name", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input className="h-11" type="email" value={form.email || ""} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="space-y-3">
            <div>
              <Label>Mobile number</Label>
              <div className="flex gap-2">
                <ResponsiveSelect
                  value={dialCode}
                  onValueChange={setDialCode}
                  placeholder="Code"
                  triggerClassName="h-11 w-36 shrink-0"
                  options={COUNTRY_DIAL_CODES.map((c) => ({ value: c.code, label: `${c.flag} ${c.dial}` }))}
                />
                <Input className="h-11 flex-1" value={mobileRaw} onChange={(e) => setMobileRaw(e.target.value)} placeholder="086 123 4567" />
              </div>
            </div>
            <div>
              <Label>Landline number (optional)</Label>
              <div className="flex gap-2">
                <div className="h-11 w-36 shrink-0 flex items-center justify-center rounded-md border border-input text-sm text-muted-foreground">
                  {(() => { const c = dialCodeByCode(dialCode); return c ? `${c.flag} ${c.dial}` : "Code"; })()}
                </div>
                <Input className="h-11 flex-1" value={landlineRaw} onChange={(e) => setLandlineRaw(e.target.value)} placeholder="01 234 5678" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <ResponsiveSelect
                value={form.status || "new"}
                onValueChange={(v) => set("status", v)}
                placeholder="Select status"
                triggerClassName="h-11"
                options={CONTACT_STATUS_OPTIONS}
              />
            </div>
            <div>
              <Label>Source</Label>
              <ResponsiveSelect
                value={form.source || ""}
                onValueChange={(v) => set("source", v)}
                placeholder="Select source"
                triggerClassName="h-11"
                options={[{ value: "", label: "—" }, ...config.sourceOptions.map((s) => ({ value: s, label: s }))]}
              />
            </div>
          </div>
          <div>
            <Label>Organisation / Company / Household</Label>
            <Input className="h-11" value={form.organisation_name || ""} onChange={(e) => set("organisation_name", e.target.value)} />
          </div>
          <div>
            <Label>Tags (comma-separated)</Label>
            <Input className="h-11" value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="vip, hot-lead" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Last contact date</Label>
              <Input className="h-11" type="date" value={form.last_contact_date || ""} onChange={(e) => set("last_contact_date", e.target.value)} />
            </div>
            <div>
              <Label>Next follow-up</Label>
              <Input className="h-11" type="date" value={form.next_follow_up_date || ""} onChange={(e) => set("next_follow_up_date", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Assigned to</Label>
            <Input className="h-11" value={form.assigned_user_name || ""} onChange={(e) => set("assigned_user_name", e.target.value)} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button className="h-11" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}