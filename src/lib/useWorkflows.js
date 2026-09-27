import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";

// Loads per-org workflow template activations and recent run history. Reuses
// the existing base44 entity SDK with RLS-enforced organisation_id filtering.
// "Activating" a template creates/updates a WorkflowTemplate record; "running"
// a template creates a lightweight WorkflowRun record for history.
export function useWorkflows() {
  const { activeOrg } = useWorkspace();
  const { dataMode } = useDataMode();
  const [activations, setActivations] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [acts, runList] = await Promise.all([
        base44.entities.WorkflowTemplate.filter({
          organisation_id: activeOrg.id,
          data_mode: dataMode,
        }),
        base44.entities.WorkflowRun.filter(
          { organisation_id: activeOrg.id, data_mode: dataMode },
          "-started_date",
          20
        ),
      ]);
      setActivations(acts);
      setRuns(runList);
    } catch (e) {
      // ignore — entities may not exist yet on first load
    } finally {
      setLoading(false);
    }
  }, [activeOrg, dataMode]);

  useEffect(() => {
    load();
  }, [load]);

  const isTemplateActive = useCallback(
    (templateId) =>
      activations.some((a) => a.template_id === templateId && a.status === "active"),
    [activations]
  );

  const activateTemplate = useCallback(
    async (template) => {
      if (!activeOrg) return;
      const existing = activations.find((a) => a.template_id === template.id);
      if (existing) {
        await base44.entities.WorkflowTemplate.update(existing.id, {
          status: existing.status === "active" ? "paused" : "active",
        });
      } else {
        await base44.entities.WorkflowTemplate.create({
          organisation_id: activeOrg.id,
          template_id: template.id,
          category: template.category,
          name: template.name,
          status: "active",
          config: template.configDefaults || {},
          data_mode: dataMode,
        });
      }
      await load();
    },
    [activeOrg, activations, dataMode, load]
  );

  const runWorkflow = useCallback(
    async (template, summary) => {
      if (!activeOrg) return;
      try {
        await base44.entities.WorkflowRun.create({
          organisation_id: activeOrg.id,
          template_id: template.id,
          template_name: template.name,
          category: template.category,
          status: "completed",
          started_date: new Date().toISOString(),
          completed_date: new Date().toISOString(),
          actions_prepared: template.actions || [],
          summary: summary || template.name,
          data_mode: dataMode,
        });
        await load();
      } catch (e) {
        // ignore
      }
    },
    [activeOrg, dataMode, load]
  );

  return {
    activations,
    runs,
    loading,
    isTemplateActive,
    activateTemplate,
    runWorkflow,
    reload: load,
  };
}