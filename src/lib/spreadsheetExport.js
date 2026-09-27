// Shared spreadsheet export utility — one place for CRM and HR.
// Builds a CSV string from rows + column definitions and triggers a
// mobile-safe browser download. Reused everywhere to avoid duplicate
// export systems.

/**
 * Build a CSV string from rows and column definitions.
 * @param {Array<Object>} rows — data records
 * @param {Array<{key: string, label: string}>} columns — column defs (key supports dot paths)
 * @returns {string} CSV content
 */
export function buildCsv(rows, columns) {
  const escape = (val) => {
    const s = String(val ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const getVal = (obj, path) =>
    path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

  const header = columns.map((c) => escape(c.label)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escape(getVal(row, c.key))).join(","))
    .join("\n");
  return [header, body].join("\n");
}

/**
 * Trigger a mobile-safe browser download of rows as a CSV spreadsheet.
 * The anchor must live in the DOM for iOS Safari to honour a programmatic
 * click, and the blob URL must outlive the click.
 * @param {Array<Object>} rows — data records
 * @param {Array<{key: string, label: string}>} columns — column defs
 * @param {string} filename — download filename
 * @returns {{ ok: boolean, count: number }}
 */
export function downloadSpreadsheet(rows, columns, filename) {
  const csv = buildCsv(rows, columns);
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
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return { ok: true, count: rows.length };
}

/**
 * Build a default filename with org name + date.
 */
export function exportFilename(prefix, orgName) {
  const safeName = (orgName || "export")
    .replace(/[^\w\-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const today = new Date().toISOString().slice(0, 10);
  return `FADS-${prefix}-${safeName}-${today}.csv`;
}