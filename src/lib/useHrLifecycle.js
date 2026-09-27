import { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";

// All HR lifecycle data access goes through the hrLifecycle backend function
// so the server can enforce HR-role access control and audit every action.
export function useHrLifecycle() {
  const { activeOrg } = useWorkspace();
  const orgId = activeOrg?.id;

  const invoke = useCallback(async (payload) => {
    const res = await base44.functions.invoke("hrLifecycle", { ...payload, organisation_id: orgId });
    return res.data;
  }, [orgId]);

  // Onboarding templates
  const loadOnboardingTemplates = useCallback(async () => {
    return invoke({ action: "list_onboarding_templates" });
  }, [invoke]);

  const createOnboardingTemplate = useCallback(async (data) => {
    return invoke({ action: "create_onboarding_template", ...data });
  }, [invoke]);

  const updateOnboardingTemplate = useCallback(async (template_id, patch) => {
    return invoke({ action: "update_onboarding_template", template_id, ...patch });
  }, [invoke]);

  const deleteOnboardingTemplate = useCallback(async (template_id) => {
    return invoke({ action: "delete_onboarding_template", template_id });
  }, [invoke]);

  // Onboarding checklists
  const getOnboardingChecklist = useCallback(async (employee_id) => {
    return invoke({ action: "get_onboarding_checklist", employee_id });
  }, [invoke]);

  const createOnboardingChecklist = useCallback(async (data) => {
    return invoke({ action: "create_onboarding_checklist", ...data });
  }, [invoke]);

  const updateOnboardingTask = useCallback(async (data) => {
    return invoke({ action: "update_onboarding_task", ...data });
  }, [invoke]);

  const completeOnboarding = useCallback(async (checklist_id) => {
    return invoke({ action: "complete_onboarding", checklist_id });
  }, [invoke]);

  // Offboarding templates
  const loadOffboardingTemplates = useCallback(async () => {
    return invoke({ action: "list_offboarding_templates" });
  }, [invoke]);

  const createOffboardingTemplate = useCallback(async (data) => {
    return invoke({ action: "create_offboarding_template", ...data });
  }, [invoke]);

  const updateOffboardingTemplate = useCallback(async (template_id, patch) => {
    return invoke({ action: "update_offboarding_template", template_id, ...patch });
  }, [invoke]);

  const deleteOffboardingTemplate = useCallback(async (template_id) => {
    return invoke({ action: "delete_offboarding_template", template_id });
  }, [invoke]);

  // Offboarding checklists
  const getOffboardingChecklist = useCallback(async (employee_id) => {
    return invoke({ action: "get_offboarding_checklist", employee_id });
  }, [invoke]);

  const createOffboardingChecklist = useCallback(async (data) => {
    return invoke({ action: "create_offboarding_checklist", ...data });
  }, [invoke]);

  const updateOffboardingTask = useCallback(async (data) => {
    return invoke({ action: "update_offboarding_task", ...data });
  }, [invoke]);

  const completeOffboarding = useCallback(async (checklist_id) => {
    return invoke({ action: "complete_offboarding", checklist_id });
  }, [invoke]);

  const seedDemo = useCallback(async () => invoke({ action: "seed_demo" }), [invoke]);

  return {
    orgId,
    invoke,
    loadOnboardingTemplates,
    createOnboardingTemplate,
    updateOnboardingTemplate,
    deleteOnboardingTemplate,
    getOnboardingChecklist,
    createOnboardingChecklist,
    updateOnboardingTask,
    completeOnboarding,
    loadOffboardingTemplates,
    createOffboardingTemplate,
    updateOffboardingTemplate,
    deleteOffboardingTemplate,
    getOffboardingChecklist,
    createOffboardingChecklist,
    updateOffboardingTask,
    completeOffboarding,
    seedDemo,
  };
}