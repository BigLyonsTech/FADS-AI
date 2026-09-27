import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles, Loader2, Info, ShieldAlert } from "lucide-react";
import { REVIEW_STATUSES } from "@/lib/transcribeConstants";
import FadsRobotLoader from "@/components/FadsRobotLoader";

// AI panel — shows the generate button, draft notice, and review status controls.
// All AI outputs are labelled "Draft — requires human review".
export default function AIPanel({ session, onGenerate, onReview, generating }) {
  const hasAI = session.ai_generated_date || session.summary || session.minutes || (session.decisions && session.decisions.length > 0);
  const transcribeMessages = [
    "FADS AI IS LISTENING TO YOUR CONVERSATION...",
    "TURNING YOUR CONVERSATION INTO USEFUL NOTES...",
    "FINDING THE IMPORTANT BITS...",
    "CREATING YOUR MEETING INTELLIGENCE...",
    "ALMOST READY...",
  ];
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!generating) {
      setMessageIndex(0);
      return;
    }
    const timer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % transcribeMessages.length);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [generating]);

  return (
    <div className="space-y-3">
      {!hasAI ? (
        generating ? (
          <div className="border border-dashed border-border rounded-xl">
            <FadsRobotLoader compact message={transcribeMessages[messageIndex]} />
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-border rounded-xl">
            <div className="w-12 h-12 rounded-full bg-brand-mint flex items-center justify-center mx-auto mb-3">
              <Bot className="w-6 h-6 text-brand-teal" />
            </div>
            <h3 className="font-medium text-brand-navy mb-1">Meeting Intelligence</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              Generate a draft summary, minutes, decisions and action points from this transcript.
            </p>
            <Button onClick={onGenerate}>
              <Sparkles className="w-4 h-4" />
              Generate AI Drafts
            </Button>
          </div>
        )
      ) : (
        <>
          <DraftNotice />
          {session.ai_generated_date && (
            <p className="text-xs text-muted-foreground">
              AI drafts generated {new Date(session.ai_generated_date).toLocaleString()}
            </p>
          )}
          <ReviewStatusControls session={session} onReview={onReview} />
        </>
      )}
    </div>
  );
}

function DraftNotice() {
  return (
    <div className="bg-status-warn/10 border border-status-warn/30 rounded-xl p-3 flex items-start gap-2">
      <ShieldAlert className="w-4 h-4 text-status-warn shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-medium text-status-warn">Draft — requires human review</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Verify names, figures, safeguarding information, decisions and action points before using as an official record.
        </p>
      </div>
    </div>
  );
}

function ReviewStatusControls({ session, onReview }) {
  const current = session.review_status || "draft";
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-muted-foreground">Review status:</span>
      {REVIEW_STATUSES.map((r) => (
        <button
          key={r.value}
          onClick={() => onReview(r.value)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            current === r.value
              ? "text-white border-transparent"
              : "bg-card border-border text-muted-foreground hover:bg-muted"
          }`}
          style={current === r.value ? { background: r.color } : {}}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}