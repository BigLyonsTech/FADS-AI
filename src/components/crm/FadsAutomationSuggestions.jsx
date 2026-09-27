import React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import { getFadsSuggestions } from "@/lib/automationWording";

// FADS recommendations panel — surfaces useful actions from live CRM data.
// The owner must approve any prepared communication. FADS never invents
// recipients, consent or contact information.
export default function FadsAutomationSuggestions({ crm, onPrepare }) {
  const suggestions = getFadsSuggestions(crm);
  if (!suggestions.length) {
    return (
      <div className="flex items-start gap-3 bg-brand-navy rounded-xl p-4 text-white">
        <FadsRobotAvatar size="md" className="shrink-0" />
        <div className="text-sm">
          <p className="font-semibold mb-0.5">Everything looks up to date</p>
          <p className="text-white/70 text-xs">
            No one needs urgent attention right now. I'll keep watching your pipeline.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {suggestions.map((s) => (
        <div
          key={s.id}
          className="flex items-start gap-3 rounded-xl border border-brand-teal/20 bg-brand-teal/5 p-3"
        >
          <FadsRobotAvatar size="sm" className="shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-brand-navy">
              <span className="font-semibold">FADS says: </span>
              {s.message}
            </p>
          </div>
          {onPrepare && (
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 shrink-0 border-brand-teal/40 text-brand-teal hover:bg-brand-teal/10 min-h-touch"
              onClick={() => onPrepare(s)}
            >
              Prepare <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}