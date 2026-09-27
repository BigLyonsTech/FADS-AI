import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/lib/useWorkspace";

// Redirects to the workspace Home page ("/") when the active workspace is not
// a School workspace. Used by the School Report Card pages so report cards are
// only ever accessible inside a School workspace — including direct URLs,
// stale state and mid-view workspace switches.
export function useSchoolWorkspaceGuard() {
  const { activeOrg, loading } = useWorkspace();
  const navigate = useNavigate();
  const blocked = !loading && activeOrg?.type !== "school";

  useEffect(() => {
    if (blocked) navigate("/", { replace: true });
  }, [blocked, navigate]);

  return blocked;
}