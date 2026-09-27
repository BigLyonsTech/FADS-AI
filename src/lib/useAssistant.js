import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";

// FADS AI Assistant hook — manages the cross-module conversation, Today in
// FADS briefing, daily brief generation, and module access flags. All data
// is filtered server-side by organisation, role permissions, and data mode.

export function useAssistant() {
  const { activeOrg, activeRole } = useWorkspace();
  const { dataMode } = useDataMode();
  const orgId = activeOrg?.id;
  const navigate = useNavigate();

  const [conversation, setConversation] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [todayInFads, setTodayInFads] = useState(null);
  const [dailyBrief, setDailyBrief] = useState(null);
  const [moduleAccess, setModuleAccess] = useState({ finance: true, hr: false, transcribe: true, crm: true });
  const [aiTeam, setAiTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!orgId) {
      setConversation(null);
      setTodayInFads(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("assistant", {
        action: "get_conversation",
        organisation_id: orgId,
        data_mode: dataMode,
      });
      setConversation(res.data.conversation);
      setSuggestions(res.data.suggestions || []);
      setTodayInFads(res.data.today_in_fads);
      setDailyBrief(null);
      setModuleAccess(res.data.module_access || moduleAccess);
      setAiTeam(res.data.ai_team || []);
    } catch (e) {
      setError(e.message || "Failed to load assistant");
    } finally {
      setLoading(false);
    }
  }, [orgId, dataMode]);

  useEffect(() => {
    load();
  }, [load]);

  const ask = useCallback(
    async (question, role) => {
      if (!orgId || !question.trim() || asking) return;
      setAsking(true);
      setError("");
      try {
        const res = await base44.functions.invoke("assistant", {
          action: "ask",
          organisation_id: orgId,
          data_mode: dataMode,
          question: question.trim(),
          role: role || undefined,
        });
        setConversation(res.data.conversation);
        const response = res.data.response;
        const pa = response?.prepared_action;
        if (pa && (pa.type === "draft_invoice" || pa.type === "draft_receipt")) {
          try {
            const draftRes = await base44.functions.invoke("assistant", {
              action: pa.type,
              organisation_id: orgId,
              data_mode: dataMode,
              request: pa.request || {},
            });
            if (pa.type === "draft_invoice") {
              navigate("/finance/invoices/new", { state: { draft: draftRes.data.invoice, note: draftRes.data.note } });
            } else {
              navigate("/finance/receipts/new", { state: { draft: draftRes.data.receipt, note: draftRes.data.note } });
            }
          } catch (e2) {
            setError(e2.message || "Failed to prepare draft");
          }
        }
        return response;
      } catch (e) {
        setError(e.message || "Failed to get response");
      } finally {
        setAsking(false);
      }
    },
    [orgId, dataMode, asking, navigate]
  );

  const generateDailyBrief = useCallback(async () => {
    if (!orgId || generatingBrief) return;
    setGeneratingBrief(true);
    setError("");
    try {
      const res = await base44.functions.invoke("assistant", {
        action: "generate_daily_brief",
        organisation_id: orgId,
        data_mode: dataMode,
      });
      setDailyBrief(res.data.brief);
    } catch (e) {
      setError(e.message || "Failed to generate daily brief");
    } finally {
      setGeneratingBrief(false);
    }
  }, [orgId, dataMode, generatingBrief]);

  const clearConversation = useCallback(async () => {
    if (!orgId) return;
    try {
      await base44.functions.invoke("assistant", {
        action: "delete_conversation",
        organisation_id: orgId,
        data_mode: dataMode,
      });
      await load();
    } catch (e) {
      setError(e.message || "Failed to clear conversation");
    }
  }, [orgId, dataMode, load]);

  return {
    orgId,
    orgType: activeOrg?.type,
    orgName: activeOrg?.name,
    currency: activeOrg?.currency || "",
    dataMode,
    activeRole,
    conversation,
    suggestions,
    todayInFads,
    dailyBrief,
    moduleAccess,
    aiTeam,
    loading,
    asking,
    generatingBrief,
    error,
    ask,
    generateDailyBrief,
    clearConversation,
    reload: load,
  };
}