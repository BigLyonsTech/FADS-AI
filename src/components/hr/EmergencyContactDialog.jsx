import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

export default function EmergencyContactDialog({ open, onClose, onSave }) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (open) {
      setName(""); setRelationship(""); setPhone(""); setEmail(""); setIsPrimary(false);
    }
  }, [open]);

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) return;
    setBusy(true);
    try {
      await onSave({
        name: name.trim(),
        relationship: relationship.trim() || null,
        phone: phone.trim(),
        email: email.trim() || null,
        is_primary: isPrimary,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Emergency Contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Relationship</Label>
            <Input value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="e.g. Spouse, Parent" />
          </div>
          <div>
            <Label>Phone *</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={isPrimary} onCheckedChange={setIsPrimary} id="primary" />
            <Label htmlFor="primary" className="text-sm cursor-pointer">Primary contact</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={handleSave} disabled={busy || !name.trim() || !phone.trim()}>
            {busy && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}