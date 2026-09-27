import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/lib/useWorkspace";
import { useAuth } from "@/lib/AuthContext";

// Session-scoped Demo / Live data mode, keyed per organisation.
// Demo mode shows only fictional sample records (data_mode = "demo").
// Live mode shows only real organisation records (data_mode = "live").
//
// The selection persists for the browser session (sessionStorage) and
// defaults to the organisation's own data_mode — so the existing FADS Demo
// workspaces open naturally in Demo mode, while live customer orgs open
// in Live mode.
//
// Permission: only platform admins / demo users can access Demo mode.
// Normal customer users are always in Live mode and the switcher is hidden.

const STORAGE_KEY = "fads_data_mode";

function readStore() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeStore(data) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota / privacy mode errors
  }
}

// Lightweight pub-sub so every component stays in sync without a context provider.
const listeners = new Set();
function notify() {
  listeners.forEach((fn) => fn());
}

export function useDataMode() {
  const { activeOrg } = useWorkspace();
  const { user } = useAuth();
  const orgId = activeOrg?.id;
  const orgDataMode = activeOrg?.data_mode || "live";
  const isPlatformOwner = user?.role === "admin" || user?.platform_owner === true;
  // Platform owners may switch modes. Ordinary users are locked to the
  // organisation's lifecycle mode: newly onboarded trial workspaces remain in
  // Demo until the existing promote_to_live flow changes the organisation.
  const canAccessDemo = isPlatformOwner;

  const resolveModeForOrg = useCallback(() => {
    if (!orgId) return "live";
    if (!isPlatformOwner) return orgDataMode;
    const stored = readStore()[orgId];
    if (stored === "demo" || stored === "live") return stored;
    return orgDataMode;
  }, [orgId, orgDataMode, isPlatformOwner]);

  const [selection, setSelection] = useState(() => ({
    orgId,
    mode: resolveModeForOrg(),
  }));

  // Resolve the new organisation's mode synchronously during render. This
  // prevents queries from briefly loading the newly-selected org with the
  // previous workspace's Demo/Live mode before the effect catches up.
  const dataMode =
    selection.orgId === orgId ? selection.mode : resolveModeForOrg();

  useEffect(() => {
    if (!orgId) return;
    const nextMode = resolveModeForOrg();
    setSelection((current) =>
      current.orgId === orgId && current.mode === nextMode
        ? current
        : { orgId, mode: nextMode }
    );
    const s = readStore();
    if (s[orgId] !== nextMode) {
      s[orgId] = nextMode;
      writeStore(s);
    }
  }, [orgId, resolveModeForOrg]);

  // Subscribe to external changes (from other component instances).
  useEffect(() => {
    const listener = () => {
      if (!orgId) return;
      const stored = readStore()[orgId];
      const nextMode = isPlatformOwner ? stored : orgDataMode;
      if (
        (nextMode === "demo" || nextMode === "live") &&
        nextMode !== dataMode
      ) {
        setSelection({ orgId, mode: nextMode });
      }
    };
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, [orgId, dataMode, isPlatformOwner, orgDataMode]);

  const setDataMode = useCallback(
    (mode) => {
      if (!orgId) return;
      if (!isPlatformOwner) return; // ordinary users follow the organisation lifecycle mode
      const s = readStore();
      s[orgId] = mode;
      writeStore(s);
      setSelection({ orgId, mode });
      notify();
    },
    [orgId, isPlatformOwner]
  );

  return {
    dataMode,
    setDataMode,
    canAccessDemo,
    isDemoMode: dataMode === "demo",
    isLiveMode: dataMode === "live",
  };
}