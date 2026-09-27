import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";
import { useTranscribe } from "@/lib/useTranscribe";
import { useTranscribeOfficer } from "@/lib/useTranscribeOfficer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Bot, Send, Loader2, Trash2, AlertCircle, ChevronDown, ChevronUp,
  Sparkles, FileText, Gavel, CheckSquare, GitCompare, ListTodo, ClipboardList,
} from "lucide-react";
import OfficerMessage from "@/components/transcribe/OfficerMessage";
import OfficerSuggestions from "@/components/transcribe/OfficerSuggestions";
import OfficerFilters from "@/components/transcribe/OfficerFilters";
import { useToast } from "@/components/ui/use-toast";

const ACTIONS = [
  { value: "find_decisions", label: "Decisions", icon: Gavel },
  { value: "find_action_points", label: "Actions", icon: CheckSquare },
  { value: "compare_themes", label: "Compare", icon: GitCompare },
  { value: "draft_briefing", label: "Briefing", icon: FileText },
  { value: "draft_agenda", label: "Agenda", icon: ListTodo },
  { value: "draft_minutes", label: "Minutes", icon: ClipboardList },
];

export default function TranscribeOfficer() {
  const { activeOrg, loading: wsLoading } = useWorkspace();
  const { folders, tags } = useTranscribe(activeOrg);
  const {
    conversation, status, suggestions, drafts,
    loading, asking, error,
    ask, runAction, saveDraft, deleteDraft, deleteConversation,
  } = useTranscribeOfficer(activeOrg);
  const { toast } = useToast();

  const [question, setQuestion] = useState("");
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages?.length]);

  const handleAsk = () => {
    if (!question.trim() || asking) return;
    ask(question, filters);
    setQuestion("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const handleSaveDraft = async (msg) => {
    const title = msg.content.slice(0, 60) + (msg.content.length > 60 ? "…" : "");
    await saveDraft(msg.action_type || "answer", title, msg.content);
    toast({ title: "Draft saved" });
  };

  if (wsLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal mb-3" />
        <p className="text-sm text-muted-foreground">Loading Transcribe Officer…</p>
      </div>
    );
  }

  if (!activeOrg) {
    return <div className="text-center py-20 text-muted-foreground">Select an organisation to use the Transcribe Officer.</div>;
  }

  const messages = conversation?.messages || [];
  const hasMessages = messages.length > 0;

  return (
    <div className="space-y-3 max-w-3xl mx-auto flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-teal flex items-center justify-center">
            <Bot className="w-5 h-5 text-brand-navy" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-brand-navy">Transcribe Officer</h1>
            <p className="text-xs text-muted-foreground">
              {activeOrg.name} · {status ? `${status.remaining}/${status.allowance} questions left` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {drafts.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowDrafts(!showDrafts)} className="h-8">
              <FileText className="w-3.5 h-3.5" /> Drafts ({drafts.length})
            </Button>
          )}
          {hasMessages && (
            <Button variant="outline" size="sm" onClick={() => { if (confirm("Clear conversation history?")) deleteConversation(); }} className="h-8 text-destructive hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-2.5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Usage warning */}
      {status && !status.allowed && (
        <div className="bg-status-warn/10 border border-status-warn/30 rounded-xl p-2.5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-status-warn shrink-0 mt-0.5" />
          <p className="text-xs text-status-warn">{status.reason}</p>
        </div>
      )}

      {/* Drafts panel */}
      {showDrafts && drafts.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Saved Drafts</p>
          {drafts.map((d) => (
            <div key={d.draft_id} className="flex items-start justify-between gap-2 p-2 rounded-md bg-muted/50">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-brand-navy truncate">{d.title}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{d.content}</p>
              </div>
              <button onClick={() => deleteDraft(d.draft_id)} className="text-muted-foreground hover:text-destructive shrink-0">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-1.5">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-brand-navy"
        >
          {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          Search scope {Object.values(filters).some(Boolean) && <span className="text-brand-teal">•</span>}
        </button>
        {showFilters && (
          <OfficerFilters value={filters} onChange={setFilters} folders={folders} tags={tags} />
        )}
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-2 min-h-[200px]">
        {!hasMessages && (
          <div className="text-center py-8 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-mint flex items-center justify-center mx-auto">
              <Bot className="w-7 h-7 text-brand-teal" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-brand-navy mb-1">Ask across your transcripts</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Search transcript text, summaries, minutes, participants, decisions and action points. Every answer cites its sources.
              </p>
            </div>
            <div className="max-w-md mx-auto">
              <OfficerSuggestions suggestions={suggestions} onAsk={(q) => ask(q, filters)} disabled={asking} />
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <OfficerMessage key={i} message={msg} />
        ))}

        {asking && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-3.5 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-brand-teal" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.value}
              onClick={() => runAction(a.value, filters)}
              disabled={asking}
              className="inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded-md border border-border bg-card hover:bg-muted transition-colors disabled:opacity-50"
            >
              <Icon className="w-3 h-3 text-brand-teal" /> {a.label}
            </button>
          );
        })}
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question across your transcripts…"
          className="flex-1 min-h-[44px] max-h-[120px] resize-none text-sm"
          disabled={asking || (status && !status.allowed)}
        />
        <Button onClick={handleAsk} disabled={!question.trim() || asking || (status && !status.allowed)} className="h-11 px-3">
          {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-muted-foreground text-center">
        AI-generated drafts require human review. Verify names, figures, decisions and safeguarding information before use.
      </p>
    </div>
  );
}