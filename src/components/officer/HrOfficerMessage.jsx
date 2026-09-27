import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  User, Bot, FileText, Users, CheckCircle2, CalendarDays,
  CalendarCheck, ShieldCheck, ClipboardList, AlertCircle,
  ExternalLink, Copy, Check, Save, Trash2,
} from "lucide-react";

const CITATION_ICONS = {
  employee: Users,
  onboarding: ClipboardList,
  offboarding: ClipboardList,
  document: FileText,
  leave_request: CalendarDays,
  leave_balance: CalendarCheck,
  attendance: CalendarCheck,
  compliance_item: ShieldCheck,
  report: FileText,
};

// HR Officer chat message bubble. Officer messages include source citations
// as clickable chips, plus copy and save-as-draft controls.
export default function HrOfficerMessage({ message, onSaveDraft, canSaveDraft }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveDraft = () => {
    if (!onSaveDraft) return;
    // Extract first line as title, rest as content
    const lines = message.content.split("\n");
    const title = lines[0].slice(0, 80) || "HR Officer draft";
    onSaveDraft(title, message.content);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end gap-2">
        <div className="max-w-[85%] sm:max-w-[75%] bg-brand-navy text-white rounded-2xl rounded-br-md px-4 py-2.5">
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <div className="w-7 h-7 rounded-full bg-brand-navy/80 flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="w-7 h-7 rounded-full bg-brand-teal flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-4 h-4 text-brand-navy" />
      </div>
      <div className="max-w-[85%] sm:max-w-[75%] space-y-2">
        <div
          className={`bg-card rounded-2xl rounded-bl-md border px-4 py-3 ${
            message.insufficient_data
              ? "border-status-warn/40 bg-status-warn/5"
              : "border-border"
          }`}
        >
          {message.insufficient_data && (
            <div className="flex items-center gap-1.5 text-status-warn text-xs mb-2">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Insufficient data</span>
            </div>
          )}
          <p className="text-sm whitespace-pre-wrap break-words text-foreground">
            {message.content}
          </p>
          {message.period_note && (
            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
              {message.period_note}
            </p>
          )}
        </div>

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.citations.map((c, i) => {
              const Icon = CITATION_ICONS[c.type] || FileText;
              return (
                <Link
                  key={i}
                  to={c.url}
                  className="inline-flex items-center gap-1 bg-brand-mint/60 text-brand-navy text-xs px-2 py-1 rounded-full border border-brand-teal/20 hover:bg-brand-mint transition-colors"
                >
                  <Icon className="w-3 h-3" />
                  <span className="max-w-[180px] truncate">{c.label}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                </Link>
              );
            })}
          </div>
        )}

        {/* Copy + Save-as-draft controls */}
        {canSaveDraft && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-brand-navy px-2 py-1 rounded-md hover:bg-muted transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-status-ok" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> Copy
                </>
              )}
            </button>
            <button
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-brand-navy px-2 py-1 rounded-md hover:bg-muted transition-colors"
              title="Save as draft"
            >
              {saved ? (
                <>
                  <Check className="w-3 h-3 text-status-ok" /> Saved
                </>
              ) : (
                <>
                  <Save className="w-3 h-3" /> Save as draft
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}