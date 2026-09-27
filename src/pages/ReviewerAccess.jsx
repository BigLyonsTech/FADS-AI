import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, ShieldAlert, Copy, Check, Info } from "lucide-react";

const STORAGE_KEY = "fads_reviewer_credentials";

export default function ReviewerAccess() {
  const { user } = useAuth();
  const isPlatformOwner = user?.role === "admin" || user?.platform_owner === true;

  const [creds, setCreds] = useState({ email: "", password: "", notes: "" });
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCreds(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const copy = (field) => {
    navigator.clipboard?.writeText(creds[field] || "").then(() => {
      setCopied(field);
      setTimeout(() => setCopied(""), 1500);
    });
  };

  if (!isPlatformOwner) {
    return (
      <div className="max-w-xl mx-auto bg-status-bad/10 border border-status-bad/30 rounded-2xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-status-bad/15 mb-4">
          <ShieldAlert className="w-7 h-7 text-status-bad" />
        </div>
        <h2 className="text-xl font-bold text-brand-navy mb-1">Access denied</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Only Platform Owners can manage reviewer credentials.
        </p>
        <a href="/" className="inline-block">
          <Button>Go to home</Button>
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-navy flex items-center justify-center">
          <KeyRound className="w-6 h-6 text-brand-teal" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Reviewer access</h1>
          <p className="text-muted-foreground text-sm">
            Test credentials for App Store and Google Play reviewers.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-brand-mint/60 border border-brand-mint rounded-xl p-4">
        <Info className="w-5 h-5 text-brand-teal shrink-0 mt-0.5" />
        <p className="text-sm text-brand-navy">
          The reviewer account must be a registered user invited to a demo
          organisation via <strong>Team &amp; Access</strong>. Record the
          credentials here, then copy them into the App Store Connect / Play
          Console submission form. These values are stored only in this browser.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="r-email">Reviewer email</Label>
          <div className="flex gap-2">
            <Input
              id="r-email"
              type="email"
              value={creds.email}
              onChange={(e) => setCreds((c) => ({ ...c, email: e.target.value }))}
              placeholder="reviewer@example.com"
              className="h-11"
            />
            <Button
              variant="outline"
              className="h-11 px-3 shrink-0"
              onClick={() => copy("email")}
              aria-label="Copy email"
            >
              {copied === "email" ? <Check className="w-4 h-4 text-status-ok" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="r-pass">Reviewer password</Label>
          <div className="flex gap-2">
            <Input
              id="r-pass"
              type="text"
              value={creds.password}
              onChange={(e) => setCreds((c) => ({ ...c, password: e.target.value }))}
              placeholder="••••••••"
              className="h-11"
            />
            <Button
              variant="outline"
              className="h-11 px-3 shrink-0"
              onClick={() => copy("password")}
              aria-label="Copy password"
            >
              {copied === "password" ? <Check className="w-4 h-4 text-status-ok" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="r-notes">Notes for reviewers</Label>
          <textarea
            id="r-notes"
            value={creds.notes}
            onChange={(e) => setCreds((c) => ({ ...c, notes: e.target.value }))}
            placeholder="e.g. Use the demo organisation 'Test Org'. No subscriptions available."
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[88px]"
          />
        </div>

        <Button onClick={save} className="w-full h-11 min-h-touch">
          {saved ? <Check className="w-4 h-4 mr-2 text-status-ok" /> : null}
          {saved ? "Saved" : "Save credentials"}
        </Button>
      </div>
    </div>
  );
}