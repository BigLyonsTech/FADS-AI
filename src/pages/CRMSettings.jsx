import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ArrowUp, ArrowDown, Palette } from "lucide-react";
import { useCrm } from "@/lib/useCrm";
import { getDefaultStages } from "@/lib/crmWording";
import BackToCRM from "@/components/crm/BackToCRM";
import CrmPageIntro from "@/components/crm/CrmPageIntro";

const COLORS = ["#64748b", "#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4", "#10b981", "#22c55e", "#ef4444", "#ec4899", "#f97316"];

export default function CRMSettings() {
  const crm = useCrm();
  const { loading, stages } = crm;

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  const sorted = [...stages].sort((a, b) => (a.order || 0) - (b.order || 0));

  const addStage = async () => {
    if (!newName.trim()) return;
    await crm.createStage({
      name: newName.trim(),
      order: sorted.length,
      color: newColor,
      is_default: false,
    });
    setNewName("");
    setNewColor(COLORS[0]);
  };

  const moveStage = async (stage, direction) => {
    const idx = sorted.findIndex((s) => s.id === stage.id);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    const other = sorted[newIdx];
    await crm.updateStage(stage.id, { order: other.order });
    await crm.updateStage(other.id, { order: stage.order });
  };

  const deleteStage = async (stage) => {
    if (!confirm(`Delete stage "${stage.name}"? Leads in this stage will keep the name but won't appear in the board.`)) return;
    await crm.deleteStage(stage.id);
  };

  const updateColor = async (stage, color) => {
    await crm.updateStage(stage.id, { color });
  };

  const updateName = async (stage, name) => {
    await crm.updateStage(stage.id, { name });
  };

  const resetDefaults = async () => {
    if (!confirm("Reset pipeline to default stages? This will delete all current stages and recreate defaults.")) return;
    for (const s of stages) {
      await crm.deleteStage(s.id);
    }
    const defaults = getDefaultStages(crm.orgType);
    for (const s of defaults) {
      await crm.createStage({ name: s.name, order: s.order, color: s.color, is_default: s.order === 0 });
    }
    await crm.reload();
  };

  return (
    <div className="space-y-4">
      <BackToCRM />
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">CRM Settings</h1>
        <Button variant="outline" size="sm" className="h-9" onClick={resetDefaults}>
          Reset to defaults
        </Button>
      </div>

      <CrmPageIntro
        whatIs="This is where you set up the stages of your sales journey — the steps a potential customer goes through from first contact to saying yes."
        whatYouCanDo="Add, rename, reorder, or colour-code your stages. Most people don't need to change this unless they want different steps."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline Stages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No stages configured. Add stages below or reset to defaults.</p>
          ) : sorted.map((stage, idx) => (
            <div key={stage.id} className="flex items-center gap-2 p-2 rounded-lg border">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveStage(stage, -1)} disabled={idx === 0} className="p-0.5 disabled:opacity-30">
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button onClick={() => moveStage(stage, 1)} disabled={idx === sorted.length - 1} className="p-0.5 disabled:opacity-30">
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
              <div className="relative">
                <Palette className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="color"
                  value={stage.color || COLORS[0]}
                  onChange={(e) => updateColor(stage, e.target.value)}
                  className="w-9 h-9 rounded border cursor-pointer ml-6"
                />
              </div>
              <Input
                className="h-9 flex-1"
                value={stage.name}
                onChange={(e) => updateName(stage, e.target.value)}
              />
              {stage.is_default && <span className="text-xs text-muted-foreground">default</span>}
              <button onClick={() => deleteStage(stage)} className="p-1">
                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}

          {/* Add new stage */}
          <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed">
            <div className="w-9 h-9" />
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-9 h-9 rounded border cursor-pointer"
            />
            <Input
              className="h-9 flex-1"
              placeholder="New stage name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addStage()}
            />
            <Button size="sm" className="h-9 gap-1" onClick={addStage}>
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}