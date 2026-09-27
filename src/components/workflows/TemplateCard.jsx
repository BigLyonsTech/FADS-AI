import React from "react";
import { Link } from "react-router-dom";
import { Check, Pause, Eye, Play, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// One template card — shows name, trigger, actions, approval requirement and
// status. "Use Template" activates/pauses; "Preview" opens the detail dialog.
// When active, a "Run" button navigates to the relevant existing FADS page.
export default function TemplateCard({ template, active, onToggle, onPreview }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-3 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-brand-navy leading-tight">{template.name}</h3>
        {active ? (
          <Badge className="bg-status-ok/15 text-status-ok border-transparent shrink-0">Active</Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground shrink-0">Available</Badge>
        )}
      </div>
      <div className="space-y-2 text-sm flex-1">
        <div>
          <p className="text-xs font-medium text-muted-foreground">When</p>
          <p className="text-brand-navy">{template.trigger}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">FADS will</p>
          <ul className="space-y-0.5 mt-0.5">
            {template.actions.map((a, i) => (
              <li key={i} className="text-brand-navy flex items-start gap-1.5">
                <span className="text-brand-teal mt-0.5 shrink-0">•</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
        {template.approval && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">You approve</p>
            <p className="text-brand-navy">{template.approval}</p>
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-auto pt-2">
        <Button
          size="sm"
          variant={active ? "outline" : "default"}
          className="h-9 gap-1.5 flex-1"
          onClick={onToggle}
        >
          {active ? (
            <><Pause className="w-3.5 h-3.5" /> Pause</>
          ) : (
            <><Check className="w-3.5 h-3.5" /> Use Template</>
          )}
        </Button>
        <Button size="sm" variant="ghost" className="h-9 gap-1.5" onClick={onPreview}>
          <Eye className="w-3.5 h-3.5" /> Preview
        </Button>
      </div>
      {active && template.runTo && (
        <Link to={template.runTo}>
          <Button size="sm" className="w-full h-9 gap-1.5 bg-brand-teal text-brand-navy hover:bg-brand-teal/90">
            <Play className="w-3.5 h-3.5" /> {template.runLabel || "Run Workflow"}
          </Button>
        </Link>
      )}
      {active && template.askFadsQuestion && (
        <Link to={`/assistant?q=${encodeURIComponent(template.askFadsQuestion)}`}>
          <Button size="sm" variant="ghost" className="w-full h-8 gap-1.5 text-xs text-brand-teal">
            <Bot className="w-3.5 h-3.5" /> Ask FADS
          </Button>
        </Link>
      )}
    </div>
  );
}