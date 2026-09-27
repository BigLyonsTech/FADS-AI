import { useEffect, useState, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";

// Loads computed report data for the active organisation and selected
// Demo/Live mode. The backend verifies membership before service-role reads
// and enforces both scope values on every report source query.
export function useReports(filters) {
  const { activeOrg } = useWorkspace();
  const { dataMode } = useDataMode();
  const orgId = activeOrg?.id;
  const scopeKey = `${orgId || ""}:${dataMode}`;
  const currentScopeRef = useRef(scopeKey);
  const requestIdRef = useRef(0);
  currentScopeRef.current = scopeKey;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const requestScope = `${orgId || ""}:${dataMode}`;
    const requestId = ++requestIdRef.current;
    setData(null);
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("reports", {
        action: "get_report_data",
        organisation_id: orgId,
        data_mode: dataMode,
        ...filters,
      });
      if (
        requestId === requestIdRef.current &&
        currentScopeRef.current === requestScope
      ) {
        setData(res.data);
      }
    } catch (e) {
      if (
        requestId === requestIdRef.current &&
        currentScopeRef.current === requestScope
      ) {
        setError(e.response?.data?.error || e.message || "Failed to load reports");
      }
    } finally {
      if (
        requestId === requestIdRef.current &&
        currentScopeRef.current === requestScope
      ) {
        setLoading(false);
      }
    }
  }, [orgId, dataMode, JSON.stringify(filters)]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

// Exports a single report as CSV (server-side, audited).
export async function exportReportCsv(orgId, dataMode, reportType, filters) {
  const res = await base44.functions.invoke("reports", {
    action: "export_report_csv",
    organisation_id: orgId,
    data_mode: dataMode,
    report_type: reportType,
    ...filters,
  });
  return res.data?.csv || "";
}