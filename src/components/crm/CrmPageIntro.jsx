import React from "react";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

// Compact FADS intro banner for CRM pages. Answers the three beginner
// questions without cluttering the page:
//   1. What is this page for?
//   2. What can I do here?
//   3. What should I do next?
//
// `nextAction` is optional — { to, label } renders a button.
export default function CrmPageIntro({ whatIs, whatYouCanDo, nextAction }) {
  return (
    <div className="flex items-start gap-2.5 bg-brand-teal/5 border border-brand-teal/20 rounded-xl p-3">
      <FadsRobotAvatar size="sm" className="shrink-0 mt-0.5" />
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-brand-navy font-medium">{whatIs}</p>
        {whatYouCanDo && <p className="text-xs text-muted-foreground">{whatYouCanDo}</p>}
        {nextAction && (
          <Link
            to={nextAction.to}
            className="inline-flex items-center gap-1 text-xs text-brand-teal hover:underline font-medium pt-0.5 min-h-touch"
          >
            {nextAction.label} <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}