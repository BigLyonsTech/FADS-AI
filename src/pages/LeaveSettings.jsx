import React, { useEffect, useState, useCallback } from "react";
import { useHrLeave } from "@/lib/useHrLeave";
import { useWorkspace } from "@/lib/useWorkspace";
import BackToHR from "@/components/hr/BackToHR";
import LeaveTypeDialog from "@/components/hr/LeaveTypeDialog";
import LeavePolicyDialog from "@/components/hr/LeavePolicyDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Plus, Pencil, Trash2, Settings as SettingsIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function LeaveSettings() {
  const { activeOrg } = useWorkspace();
  const { toast } = useToast();
  const {
    loadLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType,
    loadPolicies, createPolicy, updatePolicy, deletePolicy,
  } = useHrLeave();

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [showPolicyDialog, setShowPolicyDialog] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);

  const loadData = useCallback(async () => {
    if (!activeOrg?.id) return;
    setLoading(true);
    try {
      const [typesData, polData] = await Promise.all([loadLeaveTypes(), loadPolicies()]);
      setLeaveTypes(typesData.leave_types || []);
      setPolicies(polData.policies || []);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  }, [activeOrg?.id, loadLeaveTypes, loadPolicies]);

  useEffect(() => { loadData(); }, [activeOrg?.id]);

  const handleSaveType = async (data) => {
    if (editingType) {
      await updateLeaveType(editingType.id, data);
      toast({ title: "Leave type updated" });
    } else {
      await createLeaveType(data);
      toast({ title: "Leave type created" });
    }
    setEditingType(null);
    await loadData();
  };

  const handleDeleteType = async (id) => {
    if (!confirm("Delete this leave type? Existing balances and requests will remain.")) return;
    await deleteLeaveType(id);
    toast({ title: "Leave type deleted" });
    await loadData();
  };

  const handleSavePolicy = async (data) => {
    if (editingPolicy) {
      await updatePolicy(editingPolicy.id, data);
      toast({ title: "Policy updated" });
    } else {
      await createPolicy(data);
      toast({ title: "Policy created" });
    }
    setEditingPolicy(null);
    await loadData();
  };

  const handleDeletePolicy = async (id) => {
    if (!confirm("Delete this policy?")) return;
    await deletePolicy(id);
    toast({ title: "Policy deleted" });
    await loadData();
  };

  if (loading) {
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

      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-brand-teal" /> Leave Settings
        </h1>
        <p className="text-sm text-muted-foreground">Configure leave types and policies for {activeOrg?.name}</p>
      </div>

      <Tabs defaultValue="types">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="types">Leave Types</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>

        {/* Leave Types */}
        <TabsContent value="types" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => { setEditingType(null); setShowTypeDialog(true); }}>
              <Plus className="w-4 h-4" /> Add Leave Type
            </Button>
          </div>

          {leaveTypes.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No leave types configured. Add one to get started.
            </Card>
          ) : (
            <div className="space-y-2">
              {leaveTypes.map((t) => (
                <Card key={t.id} className="p-3 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.colour }} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.is_paid ? "Paid" : "Unpaid"} · {t.default_annual_allowance} days
                      {t.requires_approval ? " · Requires approval" : " · Auto-approved"}
                      {t.carry_over_allowed ? ` · Carry-over (max ${t.carry_over_limit}d)` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingType(t); setShowTypeDialog(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteType(t.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Policies */}
        <TabsContent value="policies" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => { setEditingPolicy(null); setShowPolicyDialog(true); }}>
              <Plus className="w-4 h-4" /> Add Policy
            </Button>
          </div>

          {policies.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No leave policies configured. Add one to customise allowances for different contract types.
            </Card>
          ) : (
            <div className="space-y-2">
              {policies.map((p) => (
                <Card key={p.id} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(p.allowances || []).length} allowance(s)
                        {p.applicable_contract_types?.length > 0
                          ? ` · ${p.applicable_contract_types.join(", ")}`
                          : " · All contract types"}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => { setEditingPolicy(p); setShowPolicyDialog(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeletePolicy(p.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {(p.allowances || []).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border flex flex-wrap gap-2">
                      {p.allowances.map((a) => (
                        <span key={a.leave_type_id} className="text-xs bg-muted px-2 py-0.5 rounded">
                          {a.leave_type_name}: {a.annual_allowance}d
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <LeaveTypeDialog
        open={showTypeDialog}
        onClose={() => { setShowTypeDialog(false); setEditingType(null); }}
        onSubmit={handleSaveType}
        initial={editingType}
      />
      <LeavePolicyDialog
        open={showPolicyDialog}
        onClose={() => { setShowPolicyDialog(false); setEditingPolicy(null); }}
        onSubmit={handleSavePolicy}
        initial={editingPolicy}
        leaveTypes={leaveTypes}
      />
    </div>
  );
}