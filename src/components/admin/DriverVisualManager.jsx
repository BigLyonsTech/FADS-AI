import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Star, Loader2, Check, Car } from "lucide-react";

const VEHICLE_TYPES = [
  { value: "modern_taxi", label: "Modern Taxi" },
  { value: "ev_taxi", label: "Electric / EV Taxi" },
  { value: "black_cab", label: "Black Cab" },
  { value: "private_hire", label: "Private Hire / Saloon" },
  { value: "everyday_car", label: "Everyday Driver Car" },
  { value: "other", label: "Other" },
];

// Admin-only FADS Driver visual management. Only platform owners (role=admin)
// can access — the parent PlatformAdmin gates visibility. Add / edit /
// activate / feature / delete approved FADS Driver visuals. The FADS robot
// stays consistent across all visuals; only the vehicle/scene varies.
export default function DriverVisualManager({ open, onClose }) {
  const [visuals, setVisuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | "new" | visual
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await base44.entities.DriverVisual.list("sort_order", 200);
      setVisuals(all);
    } catch {
      setVisuals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleSave = async (data) => {
    setSaving(true);
    setError("");
    try {
      if (editing === "new") {
        await base44.entities.DriverVisual.create(data);
      } else if (editing?.id) {
        await base44.entities.DriverVisual.update(editing.id, data);
      }
      setEditing(null);
      await load();
    } catch (e) {
      setError(e.message || "Could not save visual.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this Driver visual? This cannot be undone.")) return;
    try {
      await base44.entities.DriverVisual.delete(id);
      await load();
    } catch (e) {
      alert("Could not delete: " + (e.message || "Unknown error"));
    }
  };

  const toggle = async (v, field) => {
    try {
      await base44.entities.DriverVisual.update(v.id, { [field]: !v[field] });
      await load();
    } catch (e) {
      alert("Could not update: " + (e.message || "Unknown error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-brand-teal" /> Manage FADS Driver Visuals
          </DialogTitle>
        </DialogHeader>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {!editing && (
          <Button className="gap-1.5 w-full sm:w-auto" onClick={() => setEditing("new")}>
            <Plus className="w-4 h-4" /> Add Visual
          </Button>
        )}

        {editing && (
          <DriverVisualEditForm
            visual={editing === "new" ? null : editing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
            saving={saving}
          />
        )}

        {!editing && (
          <div className="space-y-2">
            {loading && <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>}
            {!loading && visuals.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No Driver visuals yet. Add approved FADS-robot-with-vehicle images here.
              </p>
            )}
            {visuals.map((v) => (
              <div key={v.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="w-14 h-14 rounded bg-muted overflow-hidden shrink-0">
                  {v.image_url ? (
                    <img src={v.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Car className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{v.title}</div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {v.vehicle_type && (
                      <Badge variant="secondary" className="text-xs capitalize">{v.vehicle_type.replace(/_/g, " ")}</Badge>
                    )}
                    {v.featured && (
                      <Badge variant="outline" className="text-xs text-brand-teal border-brand-teal/30">Featured</Badge>
                    )}
                    {!v.active && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggle(v, "featured")} title={v.featured ? "Unfeature" : "Feature"}>
                    <Star className={`w-4 h-4 ${v.featured ? "fill-brand-teal text-brand-teal" : "text-muted-foreground"}`} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggle(v, "active")} title={v.active ? "Deactivate" : "Activate"}>
                    {v.active ? <Check className="w-4 h-4 text-status-ok" /> : <span className="text-xs text-muted-foreground">Off</span>}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(v)} title="Edit">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(v.id)} title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DriverVisualEditForm({ visual, onSave, onCancel, saving }) {
  const [imageUrl, setImageUrl] = useState(visual?.image_url || "");
  const [title, setTitle] = useState(visual?.title || "");
  const [vehicleType, setVehicleType] = useState(visual?.vehicle_type || "modern_taxi");
  const [featured, setFeatured] = useState(visual?.featured || false);
  const [active, setActive] = useState(visual?.active !== false);
  const [sortOrder, setSortOrder] = useState(visual?.sort_order || 0);
  const [formError, setFormError] = useState("");

  const handleSave = () => {
    if (!imageUrl.trim()) { setFormError("Image URL is required."); return; }
    if (!title.trim()) { setFormError("Title is required."); return; }
    if (!imageUrl.trim().startsWith("http")) { setFormError("Image URL must start with https://"); return; }
    onSave({
      image_url: imageUrl.trim(),
      title: title.trim(),
      vehicle_type: vehicleType,
      featured,
      active,
      sort_order: Number(sortOrder) || 0,
    });
  };

  return (
    <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
      <h4 className="font-medium text-sm">{visual ? "Edit Visual" : "Add Visual"}</h4>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Label className="text-xs">Image URL *</Label>
          <Input className="h-9 mt-1" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://media.base44.com/…" />
        </div>
        <div>
          <Label className="text-xs">Title *</Label>
          <Input className="h-9 mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. City Taxi" />
        </div>
        <div>
          <Label className="text-xs">Vehicle / Scene Type</Label>
          <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm mt-1" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
            {VEHICLE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Sort order</Label>
          <Input className="h-9 mt-1" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </div>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> Featured
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
          </label>
        </div>
      </div>
      {imageUrl && (
        <div className="w-full h-24 rounded-lg overflow-hidden border border-border">
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      {formError && <p className="text-sm text-red-500">{formError}</p>}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {visual ? "Save Changes" : "Add Visual"}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}