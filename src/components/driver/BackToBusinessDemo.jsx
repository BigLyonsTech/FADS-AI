import React, { useState } from "react";
import { useWorkspace } from "@/lib/useWorkspace";
import { DEMO_NAME_BY_TYPE } from "@/lib/workspaceTypes";
import { ArrowLeft } from "lucide-react";

// Small escape hatch shown on Driver Home in Demo Mode only. Switches back to
// the Business demo workspace so a curious user is never trapped inside a
// specialist (Taxi Driver / Self-Employed) demo. Reuses the existing
// switchWorkspace mechanism — no new workspace is created.
export default function BackToBusinessDemo() {
  const { activeOrg, organisations, switchWorkspace } = useWorkspace();
  const [busy, setBusy] = useState(false);

  if (!activeOrg || activeOrg.data_mode !== "demo") return null;
  const businessDemo = organisations.find(
    (o) => o.name === DEMO_NAME_BY_TYPE.small_business
  );
  if (!businessDemo || businessDemo.id === activeOrg.id) return null;

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await switchWorkspace(businessDemo.id);
      window.location.reload();
    } catch (e) {
      alert(e.response?.data?.error || e.message || "Unable to switch demo");
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-teal hover:underline min-h-touch px-1 py-1 disabled:opacity-50"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      {busy ? "Switching…" : "Back to Business Demo"}
    </button>
  );
}