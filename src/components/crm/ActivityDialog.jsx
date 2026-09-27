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
import { ACTIVITY_TYPE_OPTIONS } from "@/lib/crmWording";

export default function ActivityDialog({ open, onClose, onSaved, contactId, contactName }) {
  const [type, setType] = useState("note");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setType("note");
    setSubject("");
    setContent("");
  }, [open]);

  const submit = async () => {
    setError("");
    if (!content.trim()) { setError("Content is required"); return; }
    setBusy(true);
    try {
      await onSaved({ type, subject, content, contact_id: contactId, contact_name: contactName });
    } catch (e) {
      setError(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Note / Activity</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && <div className="p-2 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}
          <div>
            <Label>Type</Label>
            <ResponsiveSelect
              value={type}
              onValueChange={setType}
              placeholder="Select type"
              triggerClassName="h-11"
              options={ACTIVITY_TYPE_OPTIONS}
            />
          </div>
          <div>
            <Label>Subject</Label>
            <Input className="h-11" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Content *</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button className="h-11" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}