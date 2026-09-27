import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Mic, FileAudio, Users, Briefcase, Sparkles, List,
  GraduationCap, BookOpen, Heart, Church, Mic2, FileText,
  ChevronRight,
} from "lucide-react";

// Type-aware Quick Actions for the Transcribe dashboard, grouped into
// RECORD / UNDERSTAND / LIBRARY. All link to the existing Studio and
// Library — one shared Transcribe product. Each record action can preselect
// a session_type via URL query param (?type=lecture) so the Studio opens with
// the right category.
const ACTIONS = {
  small_business: [
    { group: "RECORD", label: "Record Meeting", sub: "Business or team meeting", icon: Briefcase, type: "business_meeting" },
    { group: "RECORD", label: "Voice Note", sub: "Quick voice memo", icon: Mic2, type: "voice_note" },
    { group: "RECORD", label: "Client Conversation", sub: "Client or sales call", icon: Users, type: "business_meeting" },
    { group: "RECORD", label: "Team Meeting", sub: "Internal team sync", icon: Briefcase, type: "business_meeting" },
    { group: "UNDERSTAND", label: "Generate Meeting Notes", sub: "AI summary & action points", icon: Sparkles, to: "/transcribe" },
    { group: "LIBRARY", label: "View Transcripts", sub: "Browse the library", icon: List, to: "/transcribe" },
  ],
  school: [
    { group: "RECORD", label: "Record Staff Meeting", sub: "Staff or faculty meeting", icon: Briefcase, type: "business_meeting" },
    { group: "RECORD", label: "Parent Meeting", sub: "Parent-teacher conversation", icon: Users, type: "business_meeting" },
    { group: "RECORD", label: "Lesson / Training Notes", sub: "Lesson or training session", icon: BookOpen, type: "lecture" },
    { group: "RECORD", label: "Voice Note", sub: "Quick voice memo", icon: Mic2, type: "voice_note" },
    { group: "UNDERSTAND", label: "Generate Meeting Minutes", sub: "AI summary & action points", icon: Sparkles, to: "/transcribe" },
    { group: "LIBRARY", label: "View Transcripts", sub: "Browse the library", icon: List, to: "/transcribe" },
  ],
  university: [
    { group: "RECORD", label: "Record Lecture", sub: "Lecture or seminar", icon: GraduationCap, type: "lecture" },
    { group: "RECORD", label: "Department Meeting", sub: "Department or faculty meeting", icon: Briefcase, type: "business_meeting" },
    { group: "RECORD", label: "Research Notes", sub: "Research discussion", icon: FileText, type: "other" },
    { group: "RECORD", label: "Staff Meeting", sub: "Internal staff sync", icon: Users, type: "business_meeting" },
    { group: "UNDERSTAND", label: "Generate Lecture / Meeting Notes", sub: "AI summary & action points", icon: Sparkles, to: "/transcribe" },
    { group: "LIBRARY", label: "View Transcripts", sub: "Browse the library", icon: List, to: "/transcribe" },
  ],
  church: [
    { group: "RECORD", label: "Record Service", sub: "Service or worship", icon: Church, type: "other" },
    { group: "RECORD", label: "Sermon Notes", sub: "Sermon or message", icon: FileText, type: "other" },
    { group: "RECORD", label: "Ministry Meeting", sub: "Ministry team meeting", icon: Heart, type: "business_meeting" },
    { group: "RECORD", label: "Leadership Meeting", sub: "Leadership team meeting", icon: Users, type: "business_meeting" },
    { group: "UNDERSTAND", label: "Generate Service / Meeting Notes", sub: "AI summary & action points", icon: Sparkles, to: "/transcribe" },
    { group: "LIBRARY", label: "View Transcripts", sub: "Browse the library", icon: List, to: "/transcribe" },
  ],
};

const GROUP_ORDER = ["RECORD", "UNDERSTAND", "LIBRARY"];

export default function TranscribeQuickActions({ orgType }) {
  const navigate = useNavigate();
  const actions = ACTIONS[orgType] || ACTIONS.small_business;

  const handleClick = (action) => {
    if (action.to) {
      navigate(action.to);
    } else {
      navigate(`/transcribe/studio?type=${action.type}`);
    }
  };

  const grouped = GROUP_ORDER.map((g) => ({
    group: g,
    items: actions.filter((a) => a.group === g),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {grouped.map(({ group, items }) => (
        <div key={group}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">{group}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {items.map((a) => (
              <button key={a.label} onClick={() => handleClick(a)} className="text-left">
                <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 hover:bg-accent/50 transition-colors min-h-touch">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <a.icon className="w-4 h-4 text-brand-teal shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-brand-navy truncate">{a.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.sub}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}