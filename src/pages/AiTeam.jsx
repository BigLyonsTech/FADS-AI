import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles, ArrowLeft, History, Activity, TrendingUp, ArrowRight } from "lucide-react";
import { useAssistant } from "@/lib/useAssistant";
import AiTeamCard from "@/components/assistant/AiTeamCard";

// "Your FADS AI Team" — specialist role cards that deep-link into the central
// Ask FADS assistant. These are NOT separate chatbots: each role is a focus
// overlay on the same authorised workspace data, conversation, and AI. The
// main Ask FADS remains the easiest entry point.
export default function AiTeam() {
  const { aiTeam, loading, orgName, dataMode } = useAssistant();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="bg-brand-navy text-white rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand-teal flex items-center justify-center shrink-0">
            <Bot className="w-6 h-6 text-brand-navy" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">Meet Your FADS AI Team</h1>
            <p className="text-sm text-white/70 mt-0.5">
              Your AI specialists work from the same FADS business data — helping you understand what is happening, what may happen next, and what to do about it.
            </p>
            {orgName && (
              <p className="text-sm text-white/80 mt-2">
                {orgName} · {dataMode === "demo" ? "Demo" : "Live"} mode
              </p>
            )}
          </div>
        </div>
        <div className="mt-4">
          <Link to="/assistant">
            <Button className="bg-brand-teal text-brand-navy hover:bg-brand-teal/90 h-11 min-h-touch w-full sm:w-auto gap-2">
              <Sparkles className="w-4 h-4" /> Ask FADS
            </Button>
          </Link>
        </div>
      </div>

      {/* Intro */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Each specialist focuses on one area of your business — but they all share the same secure
            workspace data and the central Ask FADS assistant. Ask a question in plain language and the
            right specialist steps in automatically, or pick one below to focus the conversation.
          </p>
        </CardContent>
      </Card>

      {/* FADS Principle */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "What happened", icon: History },
          { label: "What is happening", icon: Activity },
          { label: "What may happen next", icon: TrendingUp },
          { label: "What should I do next", icon: ArrowRight },
        ].map((p) => (
          <div key={p.label} className="bg-card rounded-xl border border-border p-3 text-center">
            <p.icon className="w-4 h-4 text-brand-teal mx-auto mb-1" />
            <p className="text-xs font-medium text-brand-navy">{p.label}</p>
          </div>
        ))}
      </div>

      {/* Specialist cards */}
      {aiTeam.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No AI Team roles available for this workspace.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {aiTeam.map((role) => (
            <AiTeamCard key={role.id} role={role} />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center pb-4">
        Specialists only use data you're permitted to access. They create drafts — never send messages
        or change records without your approval.
      </p>
    </div>
  );
}