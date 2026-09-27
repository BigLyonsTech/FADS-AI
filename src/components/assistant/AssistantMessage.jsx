import React from "react";
import { Link } from "react-router-dom";
import { User, AlertCircle, ExternalLink } from "lucide-react";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import { MODULE_LABELS, MODULE_COLORS } from "@/lib/assistantWording";

export default function AssistantMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {isUser ? (
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-brand-navy text-white">
          <User className="w-4 h-4" />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-brand-teal/15 overflow-hidden">
          <FadsRobotAvatar size="sm" />
        </div>
      )}
      <div className={`flex-1 min-w-0 ${isUser ? "text-right" : ""}`}>
        <div className={`inline-block text-left rounded-2xl px-4 py-3 max-w-[90%] ${isUser ? "bg-brand-navy text-white" : "bg-card border"}`}>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>

        {/* Module indicators + period note */}
        {!isUser && (message.modules_used?.length > 0 || message.period_note) && (
          <div className="flex flex-wrap items-center gap-2 mt-1.5 px-1">
            {message.modules_used?.map((m) => (
              <span key={m} className={`text-xs font-medium ${MODULE_COLORS[m] || "text-muted-foreground"}`}>
                {MODULE_LABELS[m] || m}
              </span>
            ))}
            {message.period_note && (
              <span className="text-xs text-muted-foreground">{message.period_note}</span>
            )}
          </div>
        )}

        {/* Insufficient data badge */}
        {!isUser && message.insufficient_data && (
          <div className="flex items-center gap-1 mt-1.5 px-1 text-xs text-status-warn">
            <AlertCircle className="w-3 h-3" /> Insufficient data
          </div>
        )}

        {/* Citations */}
        {!isUser && message.citations?.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.citations.map((c, i) => (
              <Link
                key={i}
                to={c.url}
                className="flex items-center gap-1.5 text-xs text-brand-teal hover:underline"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                <span className="truncate">{c.label}</span>
                <span className="text-muted-foreground shrink-0">· {MODULE_LABELS[c.module] || c.module}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}