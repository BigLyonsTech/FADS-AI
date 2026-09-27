import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ListChecks, Loader2, Users } from "lucide-react";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import BriefingCard from "@/components/assistant/BriefingCard";
import DailyBrief from "@/components/assistant/DailyBrief";

const CARD_ORDER = ["needs_attention", "money", "people", "relationships", "meetings"];

export default function TodayInFads({ todayInFads, dailyBrief, generatingBrief, onGenerateBrief, onAskFads }) {
  if (!todayInFads) return null;

  const { cards, priorities, date } = todayInFads;
  const dateLabel = date ? new Date(date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "";

  return (
    <div className="space-y-4">
      {/* Header with Generate Daily Brief button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FadsRobotAvatar size="sm" />
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-teal" />
              Today in FADS
            </h2>
            <p className="text-xs text-muted-foreground">
              {dateLabel ? `${dateLabel} · ` : ""}Here's what I found in your organisation today.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/ai-team">
            <Button variant="outline" className="h-9 gap-2 text-xs sm:text-sm">
              <Users className="w-4 h-4" /> <span className="hidden sm:inline">Ask Your AI Team</span><span className="sm:hidden">AI Team</span>
            </Button>
          </Link>
          <Button onClick={onGenerateBrief} disabled={generatingBrief} className="h-9 gap-2 text-xs sm:text-sm">
            {generatingBrief ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generatingBrief ? "Generating…" : "Daily Brief"}
          </Button>
        </div>
      </div>

      {/* Daily Brief */}
      {dailyBrief && <DailyBrief brief={dailyBrief} />}

      {/* 5 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {CARD_ORDER.map((key) => (
          <BriefingCard key={key} card={cards[key]} onAskFads={onAskFads} />
        ))}
      </div>

      {/* Suggested Priorities */}
      {priorities && priorities.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-brand-teal" />
              Suggested Priorities
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ol className="space-y-1.5">
              {priorities.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-brand-teal font-medium shrink-0">{i + 1}.</span>
                  <span>{p.text}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}