import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Play, Pause, Bot, Loader2, Search, Sparkles, ShieldCheck } from "lucide-react";
import { useDataMode } from "@/lib/useDataMode";
import { getDemoFinding } from "@/lib/demoWorkflowPreview";

// Preview dialog — shows the full template in customer-friendly language:
//   1. What FADS will check
//   2. What FADS found (Demo Mode only — real counts from the Demo dataset)
//   3. What FADS can prepare
//   4. What requires my approval
// Primary action is "Start My Actions" — activates the template (if needed) and
// navigates to the existing FADS page the workflow leads into.
export default function TemplatePreview({ template, open, onClose, active, onToggle, orgId, currency }) {
  const navigate = useNavigate();
  const { isDemoMode } = useDataMode();
  const [finding, setFinding] = useState(null);
  const [loadingFinding, setLoadingFinding] = useState(false);

  useEffect(() => {
    if (!open || !template || !isDemoMode) {
      setFinding(null);
      return;
    }
    let cancelled = false;
    setLoadingFinding(true);
    // Read-only: fetches existing Demo records so the preview feels real.
    // No records are created — idempotent on every open.
    getDemoFinding(template.id, orgId, currency)
      .then((result) => { if (!cancelled) setFinding(result); })
      .catch(() => { if (!cancelled) setFinding(null); })
      .finally(() => { if (!cancelled) setLoadingFinding(false); });
    return () => { cancelled = true; };
  }, [open, template, isDemoMode, orgId, currency]);

  if (!template) return null;

  const handleStart = async () => {
    if (!active && onToggle) {
      try { await onToggle(); } catch { /* ignore */ }
    }
    onClose();
    if (template.runTo) navigate(template.runTo);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-brand-navy">{template.name}</DialogTitle>
          <DialogDescription>{template.category} workflow</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          {/* 1. What FADS will check */}
          <section>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" /> FADS checks
            </p>
            <ul className="space-y-1">
              {(template.checks || []).map((c, i) => (
                <li key={i} className="text-sm text-brand-navy flex items-start gap-2">
                  <Check className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" /> {c}
                </li>
              ))}
            </ul>
          </section>

          {/* 2. What FADS found (Demo only) */}
          {isDemoMode && (
            <section className="bg-brand-mint/40 rounded-xl p-3">
              <p className="text-xs font-semibold text-brand-navy mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-teal" /> FADS found
              </p>
              {loadingFinding ? (
                <p className="text-sm text-brand-navy flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-teal" /> Checking your demo data…
                </p>
              ) : (
                <p className="text-sm text-brand-navy font-medium">
                  {finding || "FADS will check your demo data when you start."}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1.5">
                Preview uses your Demo data only — Live data is never touched.
              </p>
            </section>
          )}

          {/* 3. What FADS can prepare */}
          <section>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">FADS can</p>
            <ul className="space-y-1">
              {template.actions.map((a, i) => (
                <li key={i} className="text-sm text-brand-navy flex items-start gap-2">
                  <span className="text-brand-teal mt-0.5 shrink-0">•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 4. What requires my approval */}
          <section>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Requires my approval
            </p>
            <p className="text-sm text-brand-navy">
              {template.approval || "Nothing is sent until you review it."}
            </p>
          </section>

          <p className="text-xs text-muted-foreground">
            FADS prepares — you approve — FADS acts where supported. FADS never sends messages,
            moves money, or changes records without your explicit approval.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-col">
          {template.runTo && (
            <Button onClick={handleStart} className="w-full h-11 gap-1.5 bg-brand-teal text-brand-navy hover:bg-brand-teal/90">
              <Play className="w-4 h-4" /> {template.runLabel || "Start My Actions"}
            </Button>
          )}
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1 h-10" onClick={onClose}>Close</Button>
            <Button
              variant="ghost"
              className="flex-1 h-10 gap-1.5 text-brand-teal"
              onClick={() => { onToggle(); onClose(); }}
            >
              {active ? <><Pause className="w-4 h-4" /> Pause</> : <><Check className="w-4 h-4" /> Use Template</>}
            </Button>
            {template.askFadsQuestion && (
              <Button
                variant="ghost"
                className="flex-1 h-10 gap-1.5"
                onClick={() => { onClose(); navigate(`/assistant?q=${encodeURIComponent(template.askFadsQuestion)}`); }}
              >
                <Bot className="w-4 h-4" /> Ask FADS
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}