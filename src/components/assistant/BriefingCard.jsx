import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, Info, Lock, MessageCircle } from "lucide-react";

const SEVERITY_ICONS = {
  alert: AlertCircle,
  warn: AlertTriangle,
  info: Info,
};

const SEVERITY_STYLES = {
  alert: "text-status-bad",
  warn: "text-status-warn",
  info: "text-brand-teal",
};

export default function BriefingCard({ card, onAskFads }) {
  if (!card) return null;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span>{card.title}</span>
          {card.has_access === false && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-2 pt-0">
        {card.summary && <p className="text-sm text-muted-foreground leading-relaxed">{card.summary}</p>}

        {card.has_access === false ? (
          <p className="text-xs text-muted-foreground italic">No access to this module.</p>
        ) : !card.has_data ? (
          <p className="text-xs text-muted-foreground italic">No data available.</p>
        ) : (
          <div className="space-y-1.5 flex-1">
            {card.items?.slice(0, 5).map((item, i) => {
              const ItemIcon = SEVERITY_ICONS[item.severity] || Info;
              return (
                <div key={i} className="flex items-start gap-2">
                  <ItemIcon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.info}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-tight">{item.label}</div>
                    {item.detail && <div className="text-xs text-muted-foreground truncate">{item.detail}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {card.has_access !== false && card.ask_fads && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full min-h-touch mt-auto text-xs gap-1.5 text-brand-teal hover:text-brand-teal cursor-pointer touch-manipulation"
            onClick={() => onAskFads(card.ask_fads)}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Ask FADS
          </Button>
        )}
      </CardContent>
    </Card>
  );
}