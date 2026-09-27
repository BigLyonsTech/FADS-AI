import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function HrNoteDialog({ open, onClose, onSave }) {
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (open) setContent("");
  }, [open]);

  const handleSave = async () => {
    if (!content.trim()) return;
    setBusy(true);
    try {
      await onSave({ content: content.trim(), is_restricted: true });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add HR Note</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Note</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Confidential HR note — visible to HR-authorised roles only"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            This note is restricted and visible only to HR-authorised roles.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={handleSave} disabled={busy || !content.trim()}>
            {busy && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Save Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}