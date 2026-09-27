import React from "react";
import { Mic, AlertCircle, Users, ShieldCheck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

// Permission gate shown before requesting microphone access. Explains
// what happens, asks for consent to record others, and requires the
// user to deliberately press Start before the microphone is activated.
export default function PermissionGate({ onConfirm, onCancel, isSupported, canRecord, mode }) {
  const canStart = canRecord !== undefined ? canRecord : isSupported;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-brand-navy text-white rounded-xl p-4">
        <div className="w-12 h-12 rounded-full bg-brand-teal/20 flex items-center justify-center shrink-0">
          <Mic className="w-6 h-6 text-brand-teal" />
        </div>
        <div>
          <h3 className="font-semibold">Ready to record?</h3>
          <p className="text-sm text-white/70">
            We'll ask for microphone access when you press Start.
          </p>
        </div>
      </div>

      {!canStart && (
        <div className="bg-status-warn/10 border border-status-warn/30 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-status-warn shrink-0 mt-0.5" />
          <p className="text-xs text-status-warn">
            Recording isn't available in this browser. You can still create a
            session and type your transcript manually.
          </p>
        </div>
      )}
      {canStart && !isSupported && (
        <div className="bg-brand-teal/10 border border-brand-teal/30 rounded-xl p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
          <p className="text-xs text-brand-navy">
            Live transcription isn't available in this browser, but FADS can
            record your audio and transcribe it after you stop.
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        <div className="flex items-start gap-2">
          <Users className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-brand-navy">Consent:</span> Make sure
            everyone present knows they are being recorded and has agreed to it.
          </p>
        </div>
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-brand-navy">Privacy:</span> Audio is
            processed live in your browser and is <strong>not stored</strong> unless
            you explicitly save the transcript.
          </p>
        </div>
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-brand-navy">Draft:</span> Automated
            transcription is a draft. Review names, figures and decisions before
            using it as an official record.
          </p>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button onClick={onConfirm} className="flex-1 h-11" disabled={!canStart}>
          <Mic className="w-4 h-4" /> Start Recording
        </Button>
        <Button onClick={onCancel} variant="outline" className="h-11">
          Back
        </Button>
      </div>
    </div>
  );
}