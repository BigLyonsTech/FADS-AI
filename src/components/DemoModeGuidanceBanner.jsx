import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { FlaskConical, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useDataMode } from "@/lib/useDataMode";
import { useWorkspace } from "@/lib/useWorkspace";

// This stores only whether the user has seen the explanation. It is not a data
// mode and never influences which records are read or written.
const GUIDANCE_SEEN_KEY = "fads_demo_guidance_seen_v1";
const LIVE_CONFIRMATION_SEEN_KEY = "fads_live_confirmation_seen_v1";
const GUIDANCE_ROUTES = ["/finance", "/crm", "/inventory"];

function readSeen(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

function markSeen(key, organisationId) {
  if (!organisationId) return;
  try {
    const seen = readSeen(key);
    seen[organisationId] = true;
    localStorage.setItem(key, JSON.stringify(seen));
  } catch {
    // Storage may be unavailable in private browsing; the mode still works.
  }
}

function isGuidanceRoute(pathname) {
  return (
    pathname === "/" ||
    GUIDANCE_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    )
  );
}

function recordWording(type) {
  if (type === "school" || type === "university") {
    return "students, fees, attendance and school records";
  }
  if (type === "church") {
    return "members, giving, attendance and church records";
  }
  return "customers, sales, expenses and stock";
}

export default function DemoModeGuidanceBanner() {
  const location = useLocation();
  const { activeOrg, activeRole, promoteToLive } = useWorkspace();
  const { dataMode, setDataMode, canAccessDemo } = useDataMode();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [guidanceSeen, setGuidanceSeen] = useState(() =>
    readSeen(GUIDANCE_SEEN_KEY)
  );

  if (dataMode !== "demo" || !isGuidanceRoute(location.pathname)) return null;

  const organisationId = activeOrg?.id;
  const firstExplanation = organisationId && !guidanceSeen[organisationId];
  const nouns = recordWording(activeOrg?.type);
  const organisationIsDemo = activeOrg?.data_mode === "demo";
  const canPromoteOrganisation =
    organisationIsDemo && activeRole === "organisation_owner";
  const canSwitchSession = canAccessDemo;
  const canSwitch = canPromoteOrganisation || canSwitchSession;

  const acknowledgeDemo = () => {
    if (!organisationId) return;
    markSeen(GUIDANCE_SEEN_KEY, organisationId);
    setGuidanceSeen((current) => ({ ...current, [organisationId]: true }));
  };

  const handleSwitch = async () => {
    if (!organisationId || !canSwitch) return;
    setSwitching(true);
    try {
      if (canPromoteOrganisation) {
        await promoteToLive(organisationId);
      }
      // Platform owners retain the existing per-organisation session switch.
      // Ordinary owners follow the refreshed organisation lifecycle mode.
      setDataMode("live");
      acknowledgeDemo();
      setConfirmOpen(false);

      const liveConfirmationSeen = readSeen(LIVE_CONFIRMATION_SEEN_KEY);
      if (!liveConfirmationSeen[organisationId]) {
        markSeen(LIVE_CONFIRMATION_SEEN_KEY, organisationId);
        toast({
          title: "⚡ You’re now in Live Mode",
          description:
            "Anything you add here belongs to your real organisation.",
        });
      }
    } catch (error) {
      toast({
        title: "Could not switch to Live",
        description:
          error?.response?.data?.error ||
          error?.message ||
          "Please try again or ask your organisation owner.",
        variant: "destructive",
      });
    } finally {
      setSwitching(false);
    }
  };

  return (
    <>
      <section
        aria-label="Demo Mode guidance"
        className={`mb-4 rounded-lg border border-status-warn/35 bg-status-warn/10 text-foreground shadow-sm print:hidden ${
          firstExplanation ? "px-4 py-4 sm:px-5" : "px-3 py-2.5 sm:px-4"
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2.5">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-status-warn/15"
            >
              <FlaskConical className="h-4 w-4 text-status-warn" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {firstExplanation
                  ? "🧪 You’re exploring FADS in Demo Mode"
                  : "🧪 Demo Mode — You’re working with practice data."}
              </p>
              {firstExplanation ? (
                <>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                    Demo lets you explore FADS using practice data.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                    Ready to add your own {nouns}? Switch to Live.
                  </p>
                </>
              ) : (
                <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                  Switch to Live when you’re ready to use your real {nouns}.
                </p>
              )}
              {!canSwitch && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Ask your organisation owner to switch this workspace to Live.
                </p>
              )}
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {firstExplanation && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-10 w-full shrink-0 sm:w-auto"
                onClick={acknowledgeDemo}
              >
                Keep Exploring Demo
              </Button>
            )}
            {canSwitch && (
              <Button
                type="button"
                size="sm"
                className="min-h-10 w-full shrink-0 gap-2 sm:w-auto"
                onClick={() => setConfirmOpen(true)}
              >
                <Zap className="h-4 w-4" />
                Switch to Live
              </Button>
            )}
          </div>
        </div>
      </section>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => !switching && setConfirmOpen(open)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Switch to Live Mode?</DialogTitle>
            <DialogDescription>
              Live Mode is for your organisation&apos;s real records. Demo
              records will stay separate and will not be copied or changed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={switching}
              onClick={() => setConfirmOpen(false)}
            >
              Keep Exploring Demo
            </Button>
            <Button type="button" disabled={switching} onClick={handleSwitch}>
              {switching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Switching…
                </>
              ) : (
                "Switch to Live"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
