import React, { useState } from "react";
import { useDataMode } from "@/lib/useDataMode";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { FlaskConical, Zap, AlertTriangle } from "lucide-react";

// Compact Demo / Live toggle for the header. Only visible to users who
// have Demo access (platform admins). Normal users are always in Live
// mode and never see this control.
export default function DataModeSwitcher() {
  const { dataMode, setDataMode, canAccessDemo } = useDataMode();
  const [confirmLive, setConfirmLive] = useState(false);

  if (!canAccessDemo) return null;

  const isDemo = dataMode === "demo";

  return (
    <>
      <div className="flex items-center gap-0.5 bg-white/10 rounded-md border border-white/20 p-0.5">
        <button
          onClick={() => !isDemo && setDataMode("demo")}
          disabled={isDemo}
          className={`flex items-center gap-1 px-2 h-8 rounded text-xs font-medium transition-colors ${
            isDemo
              ? "bg-status-warn/20 text-status-warn cursor-default"
              : "text-white/60 hover:text-white hover:bg-brand-teal/20"
          }`}
          title="Demo Mode — explore with fictional sample data"
        >
          <FlaskConical className="w-3.5 h-3.5" />
          <span>Demo</span>
        </button>
        <button
          onClick={() => isDemo && setConfirmLive(true)}
          disabled={!isDemo}
          className={`flex items-center gap-1 px-2 h-8 rounded text-xs font-medium transition-colors ${
            !isDemo
              ? "bg-status-ok/20 text-status-ok cursor-default"
              : "text-white/60 hover:text-white hover:bg-brand-teal/20"
          }`}
          title="Live Mode — real organisation data"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Live</span>
        </button>
      </div>

      <Dialog open={confirmLive} onOpenChange={setConfirmLive}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-status-warn" />
              Entering Live Mode
            </DialogTitle>
            <DialogDescription>
              You are entering Live Mode. Changes made here affect real organisation data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLive(false)}>
              Stay in Demo
            </Button>
            <Button
              onClick={() => {
                setDataMode("live");
                setConfirmLive(false);
              }}
            >
              Switch to Live
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}