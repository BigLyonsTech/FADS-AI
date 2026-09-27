import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Check, ExternalLink } from "lucide-react";
import FadsRobot from "@/components/FadsRobot";

// Reusable guided tour modal featuring the FADS robot.
// Shows one step at a time with Next / Back / Skip / Finish controls.
// Completed tours are remembered in localStorage so they don't auto-restart.
// Works as a bottom sheet on mobile and a centered modal on desktop.
export default function GuidedTour({ tour, onClose }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const current = tour.steps[step];
  const isLast = step === tour.steps.length - 1;

  const finish = () => {
    localStorage.setItem(`fads-tour-completed-${tour.id}`, "1");
    onClose();
  };

  const next = () => {
    if (isLast) finish();
    else setStep(step + 1);
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  const showMe = () => {
    if (current.route) navigate(current.route);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl w-full sm:max-w-md p-5 space-y-4 pb-safe max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FadsRobot />
            <div>
              <p className="text-xs text-muted-foreground">{tour.name}</p>
              <p className="text-sm font-semibold text-brand-navy">
                Step {step + 1} of {tour.steps.length}
              </p>
            </div>
          </div>
          <button
            onClick={finish}
            className="text-muted-foreground hover:text-foreground p-2 -mr-2 min-h-touch min-w-touch flex items-center justify-center"
            aria-label="Skip tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold text-brand-navy">{current.title}</h3>
          <p className="text-sm text-muted-foreground">{current.text}</p>
        </div>

        {current.route && (
          <Button variant="outline" className="w-full h-11 gap-1.5" onClick={showMe}>
            <ExternalLink className="w-4 h-4" /> Show me
          </Button>
        )}

        <div className="flex items-center justify-between pt-1">
          <Button variant="ghost" className="h-11 text-muted-foreground min-h-touch" onClick={finish}>
            Skip Tour
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-11 min-h-touch"
              disabled={step === 0}
              onClick={back}
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <Button
              className="h-11 bg-brand-navy hover:bg-brand-navy/90 min-h-touch"
              onClick={next}
            >
              {isLast ? (
                <>Finish <Check className="w-4 h-4" /></>
              ) : (
                <>Next <ChevronRight className="w-4 h-4" /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}