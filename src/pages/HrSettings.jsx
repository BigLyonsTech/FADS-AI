import React, { useState, useEffect, useCallback } from "react";
import { useHrDocuments } from "@/lib/useHrDocuments";
import { useHrLifecycle } from "@/lib/useHrLifecycle";
import { useWorkspace } from "@/lib/useWorkspace";
import { hrWording } from "@/lib/hrWording";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2, AlertCircle, FileText, ClipboardList, LogOut,
  Plus, Pencil, Trash2, Settings as SettingsIcon,
} from "lucide-react";
import DocumentTypeDialog from "@/components/hr/DocumentTypeDialog";
import ChecklistTemplateDialog from "@/components/hr/ChecklistTemplateDialog";
import ConfirmDialog from "@/components/finance/ConfirmDialog";
import { DOCUMENT_CATEGORIES } from "@/lib/hrDocuments";

export default function HrSettings() {
  const { activeOrg } = useWorkspace();
  const w = hrWording(activeOrg?.type);
  const isDemo = activeOrg?.data_mode === "demo";

  const {
    loadDocumentTypes, createDocumentType, updateDocumentType, deleteDocumentType,
    seedDemo: seedDocuments,
  } = useHrDocuments();
  const {
    loadOnboardingTemplates, createOnboardingTemplate, updateOnboardingTemplate, deleteOnboardingTemplate,
    loadOffboardingTemplates, createOffboardingTemplate, updateOffboardingTemplate, deleteOffboardingTemplate,
    seedDemo: seedLifecycle,
  } = useHrLifecycle();

  const [tab, setTab] = useState("types");
  const [docTypes, setDocTypes] = useState([]);
  const [onbTemplates, setOnbTemplates] = useState([]);
  const [offTemplates, setOffTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [editType, setEditType] = useState(null);
  const [showOnbDialog, setShowOnbDialog] = useState(false);
  const [editOnb, setEditOnb] = useState(null);
  const [showOffDialog, setShowOffDialog] = useState(false);
  const [editOff, setEditOff] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [typesData, onbData, offData] = await Promise.all([
        loadDocumentTypes(),
        loadOnboardingTemplates(),
        loadOffboardingTemplates(),
      ]);
      setDocTypes(typesData.document_types || []);
      setOnbTemplates(onbData.templates || []);
      setOffTemplates(offData.templates || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [loadDocumentTypes, loadOnboardingTemplates, loadOffboardingTemplates]);

  useEffect(() => { load(); }, [load]);

  // Auto-seed demo data
  useEffect(() => {
    if (isDemo && !loading && !seeding && docTypes.length === 0 && onbTemplates.length === 0) {
      const doSeed = async () => {
        setSeeding(true);
        try {
          await seedDocuments();
          await seedLifecycle();
          await load();
        } catch (e) {
          // may already be seeded
        } finally {
          setSeeding(false);
        }
      };
      doSeed();
    }
  }, [isDemo, loading, docTypes.length, onbTemplates.length]);

  const handleSaveType = async (data) => {
    if (editType) {
      await updateDocumentType(editType.id, data);
    } else {
      await createDocumentType(data);
    }
    setEditType(null);
    await load();
  };

  const handleSaveOnb = async (data) => {
    if (editOnb) {
      await updateOnboardingTemplate(editOnb.id, data);
    } else {
      await createOnboardingTemplate(data);
    }
    setEditOnb(null);
    await load();
  };

  const handleSaveOff = async (data) => {
    if (editOff) {
      await updateOffboardingTemplate(editOff.id, data);
    } else {
      await createOffboardingTemplate(data);
    }
    setEditOff(null);
    await load();
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      if (deleteTarget.type === "docType") await deleteDocumentType(deleteTarget.id);
      else if (deleteTarget.type === "onb") await deleteOnboardingTemplate(deleteTarget.id);
      else if (deleteTarget.type === "off") await deleteOffboardingTemplate(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 text-destructive mb-3" />
        <p className="text-sm text-destructive mb-3">{error}</p>
        <Button variant="outline" onClick={load}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-heading font-bold flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-brand-teal" />
          HR Settings
        </h1>
        <p className="text-sm text-muted-foreground">{activeOrg?.name}</p>
      </div>

      {seeding && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-brand-mint/30 p-3 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin" />
          Setting up demo HR configuration...
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="types" className="gap-1.5"><FileText className="w-4 h-4" /> Document Types</TabsTrigger>
          <TabsTrigger value="onboarding" className="gap-1.5"><ClipboardList className="w-4 h-4" /> Onboarding</TabsTrigger>
          <TabsTrigger value="offboarding" className="gap-1.5"><LogOut className="w-4 h-4" /> Offboarding</TabsTrigger>
        </TabsList>

        {/* Document Types */}
        <TabsContent value="types" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Configure document categories for your {w.staffPlural.toLowerCase()}.</p>
            <Button size="sm" className="gap-1.5" onClick={() => { setEditType(null); setShowTypeDialog(true); }}>
              <Plus className="w-4 h-4" /> Add Type
            </Button>
          </div>
          {docTypes.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No document types configured yet</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {docTypes.map((t) => (
                <Card key={t.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {DOCUMENT_CATEGORIES.find((c) => c.value === t.category)?.label || t.category}
                      </span>
                      {t.is_required_for_onboarding && <span className="text-xs text-blue-600">Required for onboarding</span>}
                      {t.has_expiry && <span className="text-xs text-amber-600">Has expiry</span>}
                      {t.is_confidential_default && <span className="text-xs text-purple-600">Confidential</span>}
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditType(t); setShowTypeDialog(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget({ id: t.id, type: "docType", name: t.name })}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Onboarding Templates */}
        <TabsContent value="onboarding" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Templates for onboarding new {w.staffPlural.toLowerCase()}.</p>
            <Button size="sm" className="gap-1.5" onClick={() => { setEditOnb(null); setShowOnbDialog(true); }}>
              <Plus className="w-4 h-4" /> Add Template
            </Button>
          </div>
          {onbTemplates.length === 0 ? (
            <Card className="p-8 text-center">
              <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No onboarding templates yet</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {onbTemplates.map((t) => (
                <Card key={t.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{t.name}</p>
                      {t.is_active && <span className="text-xs text-status-ok bg-green-50 px-2 py-0.5 rounded-full">Active</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{(t.tasks || []).length} tasks</p>
                    {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditOnb(t); setShowOnbDialog(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget({ id: t.id, type: "onb", name: t.name })}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Offboarding Templates */}
        <TabsContent value="offboarding" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Templates for offboarding departing {w.staffPlural.toLowerCase()}.</p>
            <Button size="sm" className="gap-1.5" onClick={() => { setEditOff(null); setShowOffDialog(true); }}>
              <Plus className="w-4 h-4" /> Add Template
            </Button>
          </div>
          {offTemplates.length === 0 ? (
            <Card className="p-8 text-center">
              <LogOut className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No offboarding templates yet</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {offTemplates.map((t) => (
                <Card key={t.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{t.name}</p>
                      {t.is_active && <span className="text-xs text-status-ok bg-green-50 px-2 py-0.5 rounded-full">Active</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{(t.tasks || []).length} tasks</p>
                    {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditOff(t); setShowOffDialog(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget({ id: t.id, type: "off", name: t.name })}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <DocumentTypeDialog
        open={showTypeDialog}
        onClose={() => { setShowTypeDialog(false); setEditType(null); }}
        onSave={handleSaveType}
        editType={editType}
      />
      <ChecklistTemplateDialog
        open={showOnbDialog}
        onClose={() => { setShowOnbDialog(false); setEditOnb(null); }}
        onSave={handleSaveOnb}
        editTemplate={editOnb}
        type="onboarding"
      />
      <ChecklistTemplateDialog
        open={showOffDialog}
        onClose={() => { setShowOffDialog(false); setEditOff(null); }}
        onSave={handleSaveOff}
        editTemplate={editOff}
        type="offboarding"
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This action cannot be undone. Existing records created from this template will not be affected."
        confirmLabel="Delete"
        busy={busy}
      />
    </div>
  );
}