import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Loader2, X, ShieldCheck } from "lucide-react";

export default function DocumentVerifyDialog({ open, onClose, onSave, docTitle }) {
  const [status, setStatus] = useState("verified");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStatus("verified");
      setNotes("");
    }
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(status, notes);
      onClose();
    } catch (e) {
      // handled by parent
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !saving && onClose()}>
      <Card className="p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-brand-teal" /> Verify Document</h2>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}><X className="w-4 h-4" /></Button>
        </div>
        <p className="text-sm text-muted-foreground mb-3">Verify or reject: <span className="font-medium text-foreground">{docTitle}</span></p>
        <div className="space-y-3">
          <div>
            <Label>Verification Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Verification Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notes about the verification..." />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm Verification
          </Button>
        </div>
      </Card>
    </div>
  );
}