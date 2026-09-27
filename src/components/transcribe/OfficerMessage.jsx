import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Check, FileText, AlertCircle, Quote } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Officer message — shows the conversation message with citations,
// period note, insufficient-data badge, and copy/save controls.
export default function OfficerMessage({ message }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-brand-navy text-white rounded-2xl rounded-br-sm px-3.5 py-2 max-w-[85%]">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-3.5 py-2.5 max-w-[90%] space-y-2 w-full">
        {/* Draft label */}
        {message.action_type && (
          <div className="text-[10px] font-medium text-status-warn bg-status-warn/10 inline-block px-2 py-0.5 rounded-full">
            AI-generated draft — human review required
          </div>
        )}

        {/* Content */}
        <div className="text-sm text-foreground whitespace-pre-wrap">{message.content}</div>

        {/* Period note */}
        {message.period_note && (
          <p className="text-[11px] text-muted-foreground italic">{message.period_note}</p>
        )}

        {/* Insufficient data */}
        {message.insufficient_data && (
          <div className="flex items-center gap-1.5 text-xs text-status-warn">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Insufficient evidence in available transcripts</span>
          </div>
        )}

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div className="space-y-1.5 pt-1.5 border-t border-border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Sources</p>
            {message.citations.map((c, i) => (
              <Citation key={i} citation={c} />
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 pt-1">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-brand-navy px-1.5 py-0.5 rounded-md hover:bg-muted"
          >
            {copied ? <Check className="w-3 h-3 text-status-ok" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Citation({ citation }) {
  return (
    <Link
      to={citation.url}
      className="block group"
    >
      <div className="flex items-start gap-1.5 p-1.5 rounded-md hover:bg-muted transition-colors">
        <Quote className="w-3 h-3 text-brand-teal shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-brand-navy group-hover:underline truncate">
            {citation.label}
          </p>
          {citation.passage && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
              "{citation.passage}"
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}