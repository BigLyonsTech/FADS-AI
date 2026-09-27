import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useHrOfficer } from "@/lib/useHrOfficer";
import { canAccessHr } from "@/lib/hrWording";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bot, Send, Trash2, Loader2, AlertCircle,
  ChevronDown, ChevronUp, Sparkles, FileText, Eye, EyeOff,
} from "lucide-react";
import HrOfficerMessage from "@/components/officer/HrOfficerMessage";
import HrOfficerBriefing from "@/components/officer/HrOfficerBriefing";
import BackToHR from "@/components/hr/BackToHR";
import { useToast } from "@/components/ui/use-toast";

const ACCESS_LABELS = {
  hr_admin: "HR Admin",
  manager: "Manager",
  employee: "Employee",
};

export default function HrOfficer() {
  const { activeOrg, activeRole, loading: wsLoading } = useWorkspace();
  const {
    conversation, status, suggestions, accessLevel, dataMode,
    briefing, briefingLoading, loadBriefing, drafts, loadDrafts,
    saveDraft, deleteDraft, loading, asking, error, ask, deleteConversation,
  } = useHrOfficer(activeOrg);
  const { toast } = useToast();

  const [input, setInput] = useState("");
  const [showBriefing, setShowBriefing] = useState(true);
  const [showDrafts, setShowDrafts] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const messagesEndRef = useRef(null);

  const messages = conversation?.messages || [];
  const showSuggestions = messages.length <= 2 && !asking;
  const isHrAdmin = canAccessHr(activeRole);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, asking]);

  // Load briefing and drafts after conversation loads
  useEffect(() => {
    if (activeOrg?.id && !loading) {
      loadBriefing();
      loadDrafts();
    }
  }, [activeOrg?.id, loading]);

  const handleSend = () => {
    const q = input.trim();
    if (!q || asking || !status?.is_enabled) return;
    setInput("");
    ask(q);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    await deleteConversation();
    setConfirmDelete(false);
  };

  const handleSaveDraft = async (title, content) => {
    const draft = await saveDraft("letter", title, content);
    if (draft) {
      toast({ title: "Draft saved", description: "Find it in the Saved Drafts panel." });
    }
  };

  const handleDeleteDraft = async (draft_id) => {
    await deleteDraft(draft_id);
    toast({ title: "Draft deleted" });
  };

  const handleCopyDraft = (content) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard" });
  };

  if (wsLoading || loading) {
    return (
      <div className="space-y-4">
        <BackToHR label="Back to HR" to="/hr" />
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-teal mb-3" />
          <p className="text-sm text-muted-foreground">Loading HR Officer…</p>
        </div>
      </div>
    );
  }

  if (!activeOrg) {
    return (
      <div className="space-y-4">
        <BackToHR label="Back to HR" to="/hr" />
        <div className="text-center py-20 text-muted-foreground">
          <p>Select an organisation to start chatting with the HR Officer.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <BackToHR label="Back to HR" to="/hr" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-brand-teal flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-brand-navy" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-brand-navy truncate">HR Officer</h1>
            <p className="text-xs text-muted-foreground truncate">
              {activeOrg.name}
              {accessLevel && (
                <span className="ml-1.5 text-brand-teal">
                  · {ACCESS_LABELS[accessLevel] || accessLevel}
                </span>
              )}
              {dataMode && (
                <span className={`ml-1.5 ${dataMode === "demo" ? "text-status-warn" : "text-status-ok"}`}>
                  · {dataMode === "demo" ? "Demo" : "Live"}
                </span>
              )}
              {status && (
                <span className={`ml-1.5 ${status.is_enabled ? "text-status-ok" : "text-status-bad"}`}>
                  · {status.is_enabled ? `${status.remaining}/${status.allowance} questions left` : "Unavailable"}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBriefing(!showBriefing)}
            className="h-8 text-xs"
          >
            {showBriefing ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Briefing
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDrafts(!showDrafts)}
            className="h-8 text-xs"
          >
            {showDrafts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Drafts {drafts.length > 0 && `(${drafts.length})`}
          </Button>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className={`h-8 text-xs ${confirmDelete ? "text-status-bad" : "text-muted-foreground"}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {confirmDelete ? "Confirm?" : ""}
            </Button>
          )}
        </div>
      </div>

      {/* Today's Briefing */}
      {showBriefing && (
        <div className="bg-card border border-border rounded-xl p-3">
          <HrOfficerBriefing
            briefing={briefing}
            loading={briefingLoading}
            accessLevel={accessLevel}
          />
        </div>
      )}

      {/* Saved Drafts */}
      {showDrafts && (
        <div className="bg-card border border-border rounded-xl p-3 space-y-2">
          <h3 className="text-sm font-medium text-brand-navy flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-brand-teal" /> Saved Drafts
          </h3>
          {drafts.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No saved drafts. Use the "Save as draft" button on any HR Officer response to store it here for later review.
            </p>
          ) : (
            <div className="space-y-1.5">
              {drafts.map((d) => (
                <div key={d.draft_id} className="border border-border rounded-lg p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{d.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.draft_type.replace(/_/g, " ")} · {new Date(d.saved_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => handleCopyDraft(d.content)} title="Copy">
                        <FileText className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteDraft(d.draft_id)} title="Delete">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3 whitespace-pre-wrap">
                    {d.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Disabled banner */}
      {status && !status.is_enabled && (
        <div className="bg-status-warn/10 border border-status-warn/30 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-status-warn shrink-0 mt-0.5" />
          <p className="text-xs text-status-warn">{status.reason || "The HR Officer is currently unavailable."}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-2 scrollbar-hide min-h-[300px]">
        {messages.length === 0 && !asking && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-brand-teal/20 flex items-center justify-center mx-auto mb-4">
              <Bot className="w-7 h-7 text-brand-teal" />
            </div>
            <h2 className="text-base font-semibold text-brand-navy mb-1">
              Hi! I'm your HR Officer
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Ask me about {isHrAdmin ? "employees, leave, attendance, compliance, documents, onboarding and offboarding" : "your leave, attendance, documents and onboarding"}.
              I'll answer based on your verified records and cite my sources.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <HrOfficerMessage
            key={i}
            message={msg}
            onSaveDraft={handleSaveDraft}
            canSaveDraft={msg.role === "officer"}
          />
        ))}

        {asking && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-teal flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-brand-navy" />
            </div>
            <div className="bg-card rounded-2xl rounded-bl-md border border-border px-4 py-3">
              <div className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-teal" />
                <span className="text-xs text-muted-foreground">Reviewing your HR records…</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {showSuggestions && status?.is_enabled && (
        <div className="pb-2">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
              <Sparkles className="w-3.5 h-3.5 text-brand-teal" />
              <span>Suggested questions</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => ask(s.question)}
                  disabled={asking}
                  className="shrink-0 inline-flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-2 text-xs text-brand-navy hover:border-brand-teal hover:bg-brand-mint/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-border pt-3">
        <div className="flex items-end gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={status?.is_enabled ? "Ask about your HR information…" : "HR Officer unavailable"}
            disabled={!status?.is_enabled || asking}
            className="h-11 text-sm rounded-xl"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || asking || !status?.is_enabled}
            size="icon"
            className="h-11 w-11 rounded-xl shrink-0"
          >
            {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Informational only — not professional HR or legal advice. The HR Officer cannot approve leave, hire, dismiss, or edit records.
        </p>
      </div>
    </div>
  );
}