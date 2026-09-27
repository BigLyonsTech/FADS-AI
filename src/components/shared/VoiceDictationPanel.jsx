import React from "react";
import { Button } from "@/components/ui/button";
import { Mic, Loader2, RotateCcw } from "lucide-react";
import FadsRobotLoader from "@/components/FadsRobotLoader";

// Shared transcription panel for the Finance "Speak a Record" and Inventory
// "Speak an Item" flows. Shows the live spoken words (where the browser Web
// Speech API is available), explicit state labels (Listening… / Transcribing… /
// Preparing your record…), and the final "You said:" transcript for review.
// The user still edits the form and presses Save themselves.
export default function VoiceDictationPanel({
  dictation,
  example,
  speakLabel = "Speak",
  preparingMessage = "FADS is getting your record ready…",
}) {
  const { micSupported, mode, phase, liveTranscript, interimText, transcript, error, toggle, cancel } = dictation;
  if (!micSupported) return null;

  return (
    <div className="rounded-lg border border-brand-teal/30 bg-brand-mint/40 p-3 space-y-3">
      {phase === "idle" && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-2 border-brand-teal text-brand-teal"
            onClick={toggle}
          >
            <Mic className="w-4 h-4" /> {speakLabel}
          </Button>
          {example && <span className="text-xs text-muted-foreground">{example}</span>}
        </div>
      )}

      {phase === "listening" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-status-bad animate-pulse" />
            <span className="text-sm font-medium text-brand-navy">Listening…</span>
            <Button type="button" className="h-11 gap-2 bg-status-bad text-white" onClick={toggle}>
              <span className="w-2.5 h-2.5 rounded-full bg-white" /> Stop &amp; transcribe
            </Button>
            <Button type="button" variant="ghost" className="h-11" onClick={cancel}>
              Cancel
            </Button>
          </div>
          <div className="rounded-md bg-black/5 border border-border p-3 min-h-[64px]">
            {mode === "live" ? (
              <p className="text-sm text-brand-navy">
                {liveTranscript}
                {interimText && <span className="text-muted-foreground italic"> {interimText}</span>}
                {!liveTranscript && !interimText && (
                  <span className="text-muted-foreground">Start speaking — your words will appear here.</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Listening — FADS is recording your voice. Your words will be transcribed when you press Stop.
              </p>
            )}
          </div>
        </div>
      )}

      {phase === "transcribing" && (
        <div className="flex items-center gap-2 text-sm text-brand-navy">
          <Loader2 className="w-4 h-4 animate-spin" /> Transcribing…
        </div>
      )}

      {phase === "preparing" && (
        <FadsRobotLoader compact message={preparingMessage} />
      )}

      {phase === "done" && (
        <div className="space-y-2">
          {transcript && (
            <div className="rounded-md bg-brand-mint border border-brand-teal/30 p-3">
              <p className="text-[10px] uppercase tracking-wide text-brand-teal font-semibold mb-0.5">You said:</p>
              <p className="text-sm text-brand-navy">“{transcript}”</p>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 border-brand-teal text-brand-teal"
              onClick={toggle}
            >
              <RotateCcw className="w-4 h-4" /> Speak again
            </Button>
            <span className="text-xs text-muted-foreground">Review the filled fields below and press Save.</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-2 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
      )}
    </div>
  );
}