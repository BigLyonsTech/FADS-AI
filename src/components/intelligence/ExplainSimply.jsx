import React, { useState } from "react";
import { Lightbulb, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/useWorkspace";
import { useDataMode } from "@/lib/useDataMode";

// "Explain simply" — a contextual inline action that asks the central FADS AI
// assistant to explain a business insight in plain, everyday language. Reuses
// the existing assistant backend (explain action) with the same authorised
// workspace data. Does not navigate away or open a chat — the explanation
// appears inline so the user stays on the Intelligence page.
//
// Pass `dark` when the component sits on a navy/dark panel so the expanded
// explanation uses light text instead of the default navy.
export default function ExplainSimply({ topic, figure, label = "Explain simply", dark = false }) {
  const { activeOrg } = useWorkspace();
  const { dataMode } = useDataMode();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState("");

  const handleExplain = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (explanation) return;
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("assistant", {
        action: "explain",
        organisation_id: activeOrg?.id,
        data_mode: dataMode,
        topic,
        figure,
      });
      setExplanation(res.data.explanation);
    } catch (e) {
      setError(e.message || "Unable to explain right now");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={handleExplain}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-teal hover:underline"
      >
        <Lightbulb className="w-3.5 h-3.5" /> {label}
      </button>
    );
  }

  return (
    <div
      className={`rounded-xl p-3 space-y-2 ${
        dark
          ? "bg-white/5 border border-white/10"
          : "bg-brand-teal/5 border border-brand-teal/20"
      }`}
    >
      <div className="flex items-center justify-between">
        <p
          className={`text-xs font-medium flex items-center gap-1.5 ${
            dark ? "text-white" : "text-brand-navy"
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5 text-brand-teal" /> In simple terms
        </p>
        <button
          onClick={() => setOpen(false)}
          className={dark ? "text-white/40 hover:text-white" : "text-muted-foreground hover:text-foreground"}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {loading ? (
        <div
          className={`flex items-center gap-2 text-sm ${
            dark ? "text-white/50" : "text-muted-foreground"
          }`}
        >
          <Loader2 className="w-4 h-4 animate-spin" /> Explaining…
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <p
          className={`text-sm leading-relaxed ${
            dark ? "text-white/70" : "text-brand-navy"
          }`}
        >
          {explanation}
        </p>
      )}
    </div>
  );
}