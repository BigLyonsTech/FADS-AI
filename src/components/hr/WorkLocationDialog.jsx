import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Loader2 } from "lucide-react";

export default function WorkLocationDialog({ open, onClose, onSave, location }) {
  const [name, setName] = useState(location?.name || "");
  const [address, setAddress] = useState(location?.address || "");
  const [type, setType] = useState(location?.type || "office");
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    setName(location?.name || "");
    setAddress(location?.address || "");
    setType(location?.type || "office");
  }, [location, open]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSave({ name: name.trim(), address: address.trim() || null, type });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{location ? "Edit Location" : "New Location"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Head Office" />
          </div>
          <div>
            <Label>Type</Label>
            <ResponsiveSelect
              value={type}
              onValueChange={setType}
              placeholder="Select type"
              options={[
                { value: "office", label: "Office" },
                { value: "remote", label: "Remote" },
                { value: "hybrid", label: "Hybrid" },
                { value: "site", label: "Site" },
              ]}
            />
          </div>
          <div>
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={handleSave} disabled={busy || !name.trim()}>
            {busy && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}