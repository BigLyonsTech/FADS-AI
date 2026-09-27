import React from "react";
import BackToSettings from "@/components/BackToSettings";
import { Mic, Camera, Bell, FileUp, ShieldCheck } from "lucide-react";

const PERMISSIONS = [
  {
    icon: Mic,
    name: "Microphone",
    why: "Used only when you record audio for transcription. We do not listen to your microphone at any other time.",
    disable: "iOS: Settings → FADS AI → Microphone. Android: Settings → Apps → FADS AI → Permissions → Microphone.",
  },
  {
    icon: Camera,
    name: "Camera",
    why: "Used only when you capture a photo or scan a document for upload. We do not access your camera at any other time.",
    disable: "iOS: Settings → FADS AI → Camera. Android: Settings → Apps → FADS AI → Permissions → Camera.",
  },
  {
    icon: Bell,
    name: "Notifications",
    why: "Used to tell you about important workspace activity. Push notifications are not enabled yet; when added they will be optional.",
    disable: "iOS: Settings → FADS AI → Notifications. Android: Settings → Apps → FADS AI → Notifications.",
  },
  {
    icon: FileUp,
    name: "Files &amp; media",
    why: "Used when you attach a file or image to a record. We only access files you choose.",
    disable: "iOS: Settings → FADS AI → Photos / Files. Android: Settings → Apps → FADS AI → Permissions → Files and media.",
  },
];

export default function Permissions() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <BackToSettings />
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">App permissions</h1>
        <p className="text-muted-foreground text-sm">
          FADS AI only requests a permission when you use a feature that needs it.
          You can always deny or revoke a permission — the rest of the app keeps
          working.
        </p>
      </div>

      <div className="flex items-start gap-3 bg-brand-mint/60 border border-brand-mint rounded-xl p-4">
        <ShieldCheck className="w-5 h-5 text-brand-teal shrink-0 mt-0.5" />
        <p className="text-sm text-brand-navy">
          We never sell or share your data. See the{" "}
          <a href="/privacy" className="underline font-medium">Privacy Policy</a>.
        </p>
      </div>

      <div className="space-y-3">
        {PERMISSIONS.map((p) => (
          <div key={p.name} className="bg-card rounded-2xl border border-border p-4 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-mint flex items-center justify-center shrink-0">
                <p.icon className="w-5 h-5 text-brand-teal" />
              </div>
              <h2
                className="font-semibold text-brand-navy"
                dangerouslySetInnerHTML={{ __html: p.name }}
              />
            </div>
            <p
              className="text-sm text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: p.why }}
            />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-brand-navy">To turn off: </span>
              <span dangerouslySetInnerHTML={{ __html: p.disable }} />
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}