import React, { useEffect, useRef, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Users } from "lucide-react";
import { useAssistant } from "@/lib/useAssistant";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import AssistantChat from "@/components/assistant/AssistantChat";
import AssistantSuggestions from "@/components/assistant/AssistantSuggestions";
import TodayInFads from "@/components/assistant/TodayInFads";
import { MODULE_LABELS } from "@/lib/assistantWording";
import { getRoleIcon } from "@/lib/aiTeam";

export default function AssistantHome() {
  const assistant = useAssistant();
  const location = useLocation();
  const askedRef = useRef(false);
  const chatRef = useRef(null);
  const {
    loading, asking, generatingBrief, error,
    conversation, suggestions, todayInFads, dailyBrief,
    moduleAccess, aiTeam, ask, clearConversation, generateDailyBrief,
    orgName, dataMode,
  } = assistant;

  // When "Ask FADS" is tapped on a briefing card, send the question to the
  // existing assistant AND scroll the chat into view so the user sees the
  // response — on mobile the chat sits below the Today in FADS cards.
  const handleAskFads = useCallback((question) => {
    ask(question);
    if (chatRef.current) {
      setTimeout(() => {
        chatRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    }
  }, [ask]);

  const roleParam = new URLSearchParams(location.search).get("role");
  const activeRole = roleParam ? aiTeam.find((r) => r.id === roleParam) : null;
  const RoleIcon = activeRole ? getRoleIcon(activeRole.icon) : null;

  // Deep-link support: /assistant?q=<question> auto-asks once loaded.
  // Used by the Tax Centre's "Ask FADS — Tax" example questions and the AI
  // Team specialist cards (?role=<id>&q=<example>) so the existing assistant
  // receives the specialist focus overlay without a separate AI.
  useEffect(() => {
    if (loading || asking || askedRef.current) return;
    const params = new URLSearchParams(location.search);
    const q = params.get("q");
    const role = params.get("role");
    if (q) {
      askedRef.current = true;
      ask(q, role || undefined);
    }
  }, [loading, asking, location.search, ask]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-destructive text-sm">{error}</CardContent>
      </Card>
    );
  }

  const accessibleModules = Object.entries(moduleAccess)
    .filter(([, v]) => v)
    .map(([k]) => MODULE_LABELS[k] || k);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <FadsRobotAvatar size="md" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">FADS AI Assistant</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Your AI business companion</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant="outline" className="text-xs gap-1 max-w-[140px]">
            <ShieldCheck className="w-3 h-3 text-status-ok shrink-0" />
            <span className="truncate">{orgName || "No workspace"}</span>
          </Badge>
          <Badge variant={dataMode === "demo" ? "secondary" : "outline"} className="text-xs">
            {dataMode === "demo" ? "Demo Mode" : "Live Mode"}
          </Badge>
        </div>
      </div>

      {/* Active specialist + AI Team link */}
      {activeRole && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1.5 text-xs">
            {RoleIcon && <RoleIcon className="w-3 h-3 text-brand-teal" />}
            {activeRole.title}
          </Badge>
          <Link to="/ai-team" className="text-xs text-brand-teal hover:underline">
            Change specialist
          </Link>
        </div>
      )}

      {/* Module access indicators */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Connected to:</span>
        {accessibleModules.map((m) => (
          <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
        ))}
        {!moduleAccess.hr && <span className="text-muted-foreground/60">(HR access required for HR data)</span>}
      </div>

      {/* Today in FADS */}
      <TodayInFads
        todayInFads={todayInFads}
        dailyBrief={dailyBrief}
        generatingBrief={generatingBrief}
        onGenerateBrief={generateDailyBrief}
        onAskFads={handleAskFads}
      />

      {/* Chat */}
      <Card ref={chatRef}>
        <CardContent className="p-4 h-[50vh] min-h-[300px] flex flex-col">
          <AssistantChat
            conversation={conversation}
            suggestions={suggestions}
            asking={asking}
            onAsk={(q) => ask(q, roleParam || undefined)}
            onClear={clearConversation}
            orgName={orgName}
            dataMode={dataMode}
          />
        </CardContent>
      </Card>

      {/* Suggested questions — own row below the chat card, wraps naturally */}
      {conversation?.messages?.length > 0 && (
        <AssistantSuggestions
          suggestions={suggestions.slice(0, 3)}
          onPick={(q) => ask(q, roleParam || undefined)}
          compact
        />
      )}

      {/* AI Team link — own row, never overlaps */}
      <div className="flex justify-center pt-1">
        <Link to="/ai-team">
          <Button variant="outline" size="sm" className="gap-1.5 h-9">
            <Users className="w-4 h-4 text-brand-teal" />
            Your FADS AI Team
          </Button>
        </Link>
      </div>

      {/* Privacy note — clear spacing underneath controls */}
      <p className="text-xs text-muted-foreground text-center px-4 pt-2">
        The assistant only uses data you're permitted to access for this organisation.
        It never sends messages or changes records without your approval.
      </p>
    </div>
  );
}