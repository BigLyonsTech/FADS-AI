import React, { useState } from "react";
import { Link } from "react-router-dom";
import FadsRobotAvatar from "@/components/FadsRobotAvatar";
import {
  MousePointerClick, Search, Upload, Camera, Mic, FileUp,
  LogIn, HelpCircle, ChevronDown, RefreshCw, Bot, LifeBuoy,
} from "lucide-react";

// Something isn't working — a simple, non-technical troubleshooting path.
// FADS asks "What seems to be happening?" and gives simple first steps
// plus action buttons (Try again / Take me there / Ask FADS / Contact Support).
const ISSUES = [
  {
    icon: MousePointerClick,
    label: "A button isn't working",
    steps: ["Refresh the page — most stuck buttons fix themselves.", "If it's still not working, try Ask FADS or contact Support."],
    actions: [{ label: "Refresh", icon: RefreshCw, onClick: () => window.location.reload() }, { label: "Ask FADS", to: "/assistant?q=A button isn't working. What should I do?", icon: Bot }],
  },
  {
    icon: Search,
    label: "I can't find something",
    steps: ["Try the 'How do I…?' section above — it lists common things people look for.", "Or ask FADS in plain language: 'Where do I record an expense?'"],
    actions: [{ label: "How do I…?", to: "#how-do-i", icon: HelpCircle }, { label: "Ask FADS", to: "/assistant?q=I can't find something in FADS. Can you help?", icon: Bot }],
  },
  {
    icon: Upload,
    label: "I can't upload something",
    steps: ["Check the file is a CSV, Excel, or image file.", "Make sure the file is under 25 MB.", "Try a smaller file or fewer rows if importing a spreadsheet."],
    actions: [{ label: "Ask FADS", to: "/assistant?q=I can't upload a file. What should I check?", icon: Bot }],
  },
  {
    icon: Camera,
    label: "Camera / receipt scanner problem",
    steps: ["Make sure your browser has camera permission.", "Try the 'Upload Receipt' option instead of 'Open Camera'.", "On mobile, use the browser's site settings to allow camera access."],
    actions: [{ label: "Take me there", to: "/finance?scan=1", icon: Camera }, { label: "Ask FADS", to: "/assistant?q=The receipt scanner camera isn't working. What should I do?", icon: Bot }],
  },
  {
    icon: Mic,
    label: "Recording / microphone problem",
    steps: ["Allow microphone access when your browser asks.", "Check your device's microphone isn't being used by another app.", "Try uploading an audio file instead of recording live."],
    actions: [{ label: "Take me there", to: "/transcribe/studio", icon: Mic }, { label: "Ask FADS", to: "/assistant?q=The microphone isn't working for recording. What should I do?", icon: Bot }],
  },
  {
    icon: FileUp,
    label: "Import problem",
    steps: ["Make sure your file is CSV format.", "Check the first row has column headers (like Name, Email, Phone).", "Try a small file first (5–10 rows) to test."],
    actions: [{ label: "Take me there", to: "/crm/contacts", icon: FileUp }, { label: "Ask FADS", to: "/assistant?q=I'm having trouble importing my contacts. What format should I use?", icon: Bot }],
  },
  {
    icon: LogIn,
    label: "Login / account problem",
    steps: ["Use 'Forgot password' on the login screen if you can't sign in.", "Make sure you're using the email that received your invitation.", "Ask your organisation owner to resend the invitation if it's missing."],
    actions: [{ label: "Contact Support", to: "/support", icon: LifeBuoy }],
  },
  {
    icon: HelpCircle,
    label: "Something else",
    steps: ["Tell FADS what's happening in your own words — I'll do my best to help.", "If I can't fix it, contact Support and we'll look into it."],
    actions: [{ label: "Ask FADS", to: "/assistant?q=Something isn't working and I need help.", icon: Bot }, { label: "Contact Support", to: "/support", icon: LifeBuoy }],
  },
];

export default function Troubleshooting() {
  const [open, setOpen] = useState(null);

  return (
    <div id="troubleshooting" className="space-y-3 scroll-mt-4">
      <div className="flex items-center gap-2">
        <FadsRobotAvatar size="sm" />
        <h2 className="text-lg font-bold text-brand-navy">Something isn't working</h2>
      </div>
      <div className="flex items-start gap-2 bg-brand-teal/5 rounded-xl p-3">
        <FadsRobotAvatar size="sm" className="shrink-0" />
        <p className="text-sm text-brand-navy">&ldquo;What seems to be happening?&rdquo;</p>
      </div>

      <div className="space-y-2">
        {ISSUES.map((issue, i) => (
          <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between p-3.5 min-h-touch text-left"
            >
              <span className="flex items-center gap-2.5 text-sm font-medium text-brand-navy">
                <issue.icon className="w-4 h-4 text-brand-teal shrink-0" /> {issue.label}
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`} />
            </button>
            {open === i && (
              <div className="px-3.5 pb-3.5 space-y-3">
                <div className="space-y-1.5">
                  {issue.steps.map((step, j) => (
                    <p key={j} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-brand-teal shrink-0">•</span> {step}
                    </p>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {issue.actions.map((a, j) =>
                    a.onClick ? (
                      <button
                        key={j}
                        onClick={a.onClick}
                        className="inline-flex items-center gap-1.5 bg-brand-navy text-white rounded-lg px-3 py-2 text-xs font-medium min-h-touch hover:bg-brand-navy/90 transition-colors"
                      >
                        <a.icon className="w-3.5 h-3.5" /> {a.label}
                      </button>
                    ) : (
                      <Link
                        key={j}
                        to={a.to}
                        className="inline-flex items-center gap-1.5 bg-brand-navy text-white rounded-lg px-3 py-2 text-xs font-medium min-h-touch hover:bg-brand-navy/90 transition-colors"
                      >
                        <a.icon className="w-3.5 h-3.5" /> {a.label}
                      </Link>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}