import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { TEMPLATE_CATEGORIES, TEMPLATE_WORKSPACES, isValidCanvaTemplateUrl } from "@/lib/contentWording";
import { Plus, Pencil, Trash2, Star, Loader2, Check } from "lucide-react";

// Admin-only Canva template management. Only platform owners (role=admin)
// can access this — the parent gates visibility. Add / edit / deactivate /
// delete templates with deliberately configured Canva share URLs.
export default function AdminTemplateManager({ open, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | "new" | template
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await base44.entities.CanvaTemplate.list("-updated_date", 200);
      setTemplates(all);
    } catch {
      setTemplates([]);
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
        await base44.entities.CanvaTemplate.create(data);
      } else if (editing?.id) {
        await base44.entities.CanvaTemplate.update(editing.id, data);
      }
      setEditing(null);
      await load();
    } catch (e) {
      setError(e.message || "Could not save template.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    try {
      await base44.entities.CanvaTemplate.delete(id);
      await load();
    } catch (e) {
      alert("Could not delete template: " + (e.message || "Unknown error"));
    }
  };

  const toggleActive = async (t) => {
    try {
      await base44.entities.CanvaTemplate.update(t.id, { active: !t.active });
      await load();
    } catch (e) {
      alert("Could not update template: " + (e.message || "Unknown error"));
    }
  };

  const toggleFeatured = async (t) => {
    try {
      await base44.entities.CanvaTemplate.update(t.id, { featured: !t.featured });
      await load();
    } catch (e) {
      alert("Could not update template: " + (e.message || "Unknown error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-brand-teal" /> Manage Canva Templates
          </DialogTitle>
        </DialogHeader>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Add button */}
        {!editing && (
          <Button className="gap-1.5 w-full sm:w-auto" onClick={() => setEditing("new")}>
            <Plus className="w-4 h-4" /> Add Template
          </Button>
        )}

        {/* Edit form */}
        {editing && (
          <TemplateEditForm
            template={editing === "new" ? null : editing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
            saving={saving}
          />
        )}

        {/* List */}
        {!editing && (
          <div className="space-y-2">
            {loading && <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>}
            {!loading && templates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No templates yet. Click "Add Template" to create your first one.
              </p>
            )}
            {templates.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="w-12 h-12 rounded bg-muted overflow-hidden shrink-0">
                  {t.preview_url ? (
                    <img src={t.preview_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Plus className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{t.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {t.category && <Badge variant="secondary" className="text-xs">{t.category}</Badge>}
                    <Badge variant="outline" className="text-xs capitalize">
                      {t.workspace === "small_business" ? "Business" : t.workspace}
                    </Badge>
                    {!t.active && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleFeatured(t)} title={t.featured ? "Unfeature" : "Feature"}>
                    <Star className={`w-4 h-4 ${t.featured ? "fill-brand-teal text-brand-teal" : "text-muted-foreground"}`} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleActive(t)} title={t.active ? "Deactivate" : "Activate"}>
                    {t.active ? <Check className="w-4 h-4 text-status-ok" /> : <span className="text-xs text-muted-foreground">Off</span>}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(t)} title="Edit">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(t.id)} title="Delete">
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

function TemplateEditForm({ template, onSave, onCancel, saving }) {
  const [name, setName] = useState(template?.name || "");
  const [previewUrl, setPreviewUrl] = useState(template?.preview_url || "");
  const [canvaUrl, setCanvaUrl] = useState(template?.canva_url || "");
  const [workspace, setWorkspace] = useState(template?.workspace || "all");
  const [category, setCategory] = useState(template?.category || TEMPLATE_CATEGORIES[0]);
  const [contentType, setContentType] = useState(template?.content_type || "");
  const [featured, setFeatured] = useState(template?.featured || false);
  const [active, setActive] = useState(template?.active !== false);
  const [formError, setFormError] = useState("");

  const handleSave = () => {
    if (!name.trim()) { setFormError("Template name is required."); return; }
    if (!canvaUrl.trim()) { setFormError("Canva template URL is required."); return; }
    if (!isValidCanvaTemplateUrl(canvaUrl.trim())) { setFormError("Enter a valid Canva template/share URL from canva.com."); return; }
    onSave({
      name: name.trim(),
      preview_url: previewUrl.trim(),
      canva_url: canvaUrl.trim(),
      workspace,
      category,
      content_type: contentType,
      featured,
      active,
    });
  };

  return (
    <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
      <h4 className="font-medium text-sm">{template ? "Edit Template" : "Add Template"}</h4>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Template Name *</Label>
          <Input className="h-9 mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bake Sale Flyer" />
        </div>
        <div>
          <Label className="text-xs">Canva Template Link *</Label>
          <Input className="h-9 mt-1" value={canvaUrl} onChange={(e) => setCanvaUrl(e.target.value)} placeholder="https://www.canva.com/…" />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Preview Image URL</Label>
          <Input className="h-9 mt-1" value={previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <Label className="text-xs">Workspace</Label>
          <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm mt-1" value={workspace} onChange={(e) => setWorkspace(e.target.value)}>
            {TEMPLATE_WORKSPACES.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Category</Label>
          <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm mt-1" value={category} onChange={(e) => setCategory(e.target.value)}>
            {TEMPLATE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Content Type (optional)</Label>
          <Input className="h-9 mt-1" value={contentType} onChange={(e) => setContentType(e.target.value)} placeholder="e.g. social_post, flyer" />
        </div>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active
          </label>
        </div>
      </div>
      {formError && <p className="text-sm text-red-500">{formError}</p>}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {template ? "Save Changes" : "Add Template"}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}