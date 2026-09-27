import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { getRoleIcon } from "@/lib/aiTeam";

// Single specialist card for the FADS AI Team grid. "Ask" deep-links to the
// central Ask FADS assistant with the specialist role pre-selected, so the
// same conversation, data, and permissions are reused.
export default function AiTeamCard({ role }) {
  const navigate = useNavigate();
  const Icon = getRoleIcon(role.icon);

  const handleAsk = () => {
    const params = new URLSearchParams({
      role: role.id,
      q: role.exampleQuestion,
    });
    navigate(`/assistant?${params.toString()}`);
  };

  return (
    <Card className="flex flex-col h-full">
      <CardContent className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-teal/15 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-brand-teal" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm leading-tight">{role.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{role.purpose}</p>
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 px-3 py-2 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70 font-medium mb-0.5">Example</p>
          <p className="text-xs text-foreground/80 italic leading-snug">"{role.exampleQuestion}"</p>
        </div>

        <Button onClick={handleAsk} size="sm" className="w-full h-9 gap-1.5 mt-auto">
          Ask <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}