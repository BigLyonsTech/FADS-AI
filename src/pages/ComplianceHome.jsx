import React, { useEffect, useState, useCallback } from "react";
import { useHrCompliance } from "@/lib/useHrCompliance";
import { useHr } from "@/lib/useHr";
import { useWorkspace } from "@/lib/useWorkspace";
import BackToHR from "@/components/hr/BackToHR";
import ComplianceItemDialog from "@/components/hr/ComplianceItemDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Loader2, Plus, Pencil, Trash2, CheckCircle2, AlertTriangle, ShieldCheck, Info } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const STATUS_COLOURS = {
  pending: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
};

const CATEGORY_COLOURS = {
  tax: "bg-blue-100 text-blue-700",
  employment_law: "bg-purple-100 text-purple-700",
  health_safety: "bg-red-100 text-red-700",
  data_protection: "bg-teal-100 text-teal-700",
  licensing: "bg-amber-100 text-amber-700",
  insurance: "bg-green-100 text-green-700",
  other: "bg-gray-100 text-gray-600",
};

export default function ComplianceHome() {
  const { activeOrg } = useWorkspace();
  const { toast } = useToast();
  const { employees, loadEmployees } = useHr();
  const {
    listItems, getAlerts, createItem, updateItem, deleteItem, completeItem, seedDemo,
  } = useHrCompliance();

  const [items, setItems] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const loadData = useCallback(async () => {
    if (!activeOrg?.id) return;
    setLoading(true);
    try {
      const [itemsData, alertsData] = await Promise.all([listItems(), getAlerts()]);
      setItems(itemsData.items || []);
      setAlerts(alertsData.alerts || []);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  }, [activeOrg?.id, listItems, getAlerts]);

  useEffect(() => {
    if (activeOrg?.id) {
      loadEmployees();
      loadData();
    }
  }, [activeOrg?.id]);

  // Auto-seed demo
  useEffect(() => {
    if (activeOrg?.data_mode === "demo" && items.length === 0 && !loading && !seeding) {
      const doSeed = async () => {
        setSeeding(true);
        try {
          await seedDemo();
          await loadData();
        } catch (e) { /* ignore */ }
        finally { setSeeding(false); }
      };
      doSeed();
    }
  }, [activeOrg?.data_mode, items.length, loading, seeding]);

  const handleSave = async (data) => {
    if (editingItem) {
      await updateItem(editingItem.id, data);
      toast({ title: "Compliance item updated" });
    } else {
      await createItem(data);
      toast({ title: "Compliance item created" });
    }
    setEditingItem(null);
    await loadData();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this compliance item?")) return;
    await deleteItem(id);
    toast({ title: "Item deleted" });
    await loadData();
  };

  const handleComplete = async (item) => {
    const notes = prompt("Completion notes (optional):") || "";
    await completeItem(item.id, notes);
    toast({ title: "Marked as completed" });
    await loadData();
  };

  const filteredItems = categoryFilter === "all"
    ? items
    : items.filter((i) => i.category === categoryFilter);

  if (loading && items.length === 0) {
    return (
      <div className="space-y-4">
        <BackToHR label="Back to HR" to="/hr" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BackToHR label="Back to HR" to="/hr" />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-teal" /> Compliance
          </h1>
          <p className="text-sm text-muted-foreground">{activeOrg?.name}</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setEditingItem(null); setShowDialog(true); }}>
          <Plus className="w-4 h-4" /> Add Item
        </Button>
      </div>

      {seeding && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-brand-mint/30 p-3 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin" /> Setting up demo compliance data...
        </div>
      )}

      {/* Disclaimer */}
      <Card className="p-3 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            Compliance information here is operational guidance, not legal advice. Always consult a qualified professional for your specific legal and regulatory obligations.
          </p>
        </div>
      </Card>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-status-warn" /> Alerts ({alerts.length})
          </h2>
          {alerts.map((a) => (
            <Card key={a.id} className={`p-3 ${a.effective_status === "overdue" ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{a.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOURS[a.effective_status] || "bg-gray-100"}`}>
                      {a.effective_status === "overdue" ? "OVERDUE" : "Due soon"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Deadline: {a.deadline_date}
                    {a.owner_name ? ` · Owner: ${a.owner_name}` : " · No owner assigned"}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleComplete(a)}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Filter */}
      <ResponsiveSelect
        value={categoryFilter}
        onValueChange={setCategoryFilter}
        placeholder="All Categories"
        triggerClassName="w-48"
        options={[
          { value: "all", label: "All Categories" },
          { value: "tax", label: "Tax" },
          { value: "employment_law", label: "Employment Law" },
          { value: "health_safety", label: "Health & Safety" },
          { value: "data_protection", label: "Data Protection" },
          { value: "licensing", label: "Licensing" },
          { value: "insurance", label: "Insurance" },
          { value: "other", label: "Other" },
        ]}
      />

      {/* Items */}
      {filteredItems.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No compliance items found. Add one to start tracking deadlines and reminders.
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <Card key={item.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-medium text-sm">{item.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLOURS[item.category] || "bg-gray-100"}`}>
                      {item.category.replace(/_/g, " ")}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOURS[item.effective_status] || STATUS_COLOURS[item.status] || "bg-gray-100"}`}>
                      {item.effective_status || item.status}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mb-1">{item.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Deadline: {item.deadline_date || "—"}
                    {item.owner_name ? ` · Owner: ${item.owner_name}` : ""}
                    {item.recurrence !== "one_off" ? ` · ${item.recurrence}` : ""}
                    {item.last_completed_date ? ` · Last done: ${item.last_completed_date}` : ""}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {item.effective_status !== "completed" && (
                    <Button size="sm" variant="ghost" onClick={() => handleComplete(item)} title="Mark complete">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => { setEditingItem(item); setShowDialog(true); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ComplianceItemDialog
        open={showDialog}
        onClose={() => { setShowDialog(false); setEditingItem(null); }}
        onSubmit={handleSave}
        initial={editingItem}
        employees={employees}
      />
    </div>
  );
}