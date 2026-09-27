import React from "react";
import { useWorkspace } from "@/lib/useWorkspace";
import WorkspaceHome from "@/pages/WorkspaceHome";
import DriverHome from "@/pages/DriverHome";
import SelfEmployedHome from "@/pages/SelfEmployedHome";

// Routes "/" to the specialist Home for the workspace type, all reusing the
// same underlying FADS architecture — this only chooses the presentation:
// taxi_driver → Driver Home, self_employed → Self-Employed Home, everything
// else → standard Workspace Home.
export default function HomeRouter() {
  const { activeOrg } = useWorkspace();
  const t = activeOrg?.type;
  if (t === "taxi_driver") return <DriverHome />;
  if (t === "self_employed") return <SelfEmployedHome />;
  return <WorkspaceHome />;
}