import { base44 } from "@/api/base44Client";

// Exports the authorised organisation's finance records as CSV.
// Mirrors the organisation/mode-scoped dashboard data sources. The backend
// verifies the caller's finance role and applies organisation_id + data_mode to
// transactions, invoices, payments and their lookup records.
//
// Returns { ok, count } on success, { empty: true } when there are no records,
// and throws on error so the caller can surface a toast.
export async function downloadFinanceCsv(orgId, dataMode, orgName) {
  const res = await base44.functions.invoke("finance", {
    action: "export_csv",
    organisation_id: orgId,
    data_mode: dataMode,
  });

  const count = Number(res?.count) || 0;
  const csv = res?.csv || "";

  if (!csv || count === 0) {
    return { empty: true, count: 0 };
  }

  const safeName = (orgName || "export").replace(/[^\w\-]+/g, "-").replace(/^-+|-+$/g, "");
  const today = new Date().toISOString().slice(0, 10);
  const filename = `FADS-Finance-${safeName}-${today}.csv`;

  // Mobile-safe download: the anchor must live in the DOM for iOS Safari to
  // honour a programmatic click, and the blob URL must outlive the click.
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on a timeout so mobile browsers have time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 4000);

  return { ok: true, count };
}