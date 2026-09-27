import { unzipSync, strFromU8 } from "fflate";

function parseXml(bytes) {
  const text = strFromU8(bytes);
  return new DOMParser().parseFromString(text, "application/xml");
}

function columnIndex(cellRef = "") {
  const letters = String(cellRef).match(/^[A-Za-z]+/)?.[0]?.toUpperCase() || "";
  let index = 0;
  for (const ch of letters) index = index * 26 + (ch.charCodeAt(0) - 64);
  return Math.max(0, index - 1);
}

function sharedStrings(files) {
  const bytes = files["xl/sharedStrings.xml"];
  if (!bytes) return [];
  const doc = parseXml(bytes);
  return Array.from(doc.getElementsByTagName("si")).map((si) =>
    Array.from(si.getElementsByTagName("t"))
      .map((node) => node.textContent || "")
      .join("")
  );
}

function firstWorksheetPath(files) {
  const workbookBytes = files["xl/workbook.xml"];
  const relBytes = files["xl/_rels/workbook.xml.rels"];

  if (workbookBytes && relBytes) {
    const workbook = parseXml(workbookBytes);
    const firstSheet = workbook.getElementsByTagName("sheet")[0];
    const relationshipId =
      firstSheet?.getAttribute("r:id") ||
      firstSheet?.getAttributeNS(
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        "id"
      );

    if (relationshipId) {
      const rels = parseXml(relBytes);
      const relationship = Array.from(rels.getElementsByTagName("Relationship")).find(
        (node) => node.getAttribute("Id") === relationshipId
      );
      const target = relationship?.getAttribute("Target");
      if (target) {
        const normalized = target.startsWith("/")
          ? target.slice(1)
          : target.startsWith("xl/")
            ? target
            : `xl/${target.replace(/^\.\//, "")}`;
        if (files[normalized]) return normalized;
      }
    }
  }

  return Object.keys(files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))[0];
}

function cellValue(cell, strings) {
  const type = cell.getAttribute("t") || "";
  if (type === "inlineStr") {
    return Array.from(cell.getElementsByTagName("t"))
      .map((node) => node.textContent || "")
      .join("");
  }

  const raw = cell.getElementsByTagName("v")[0]?.textContent ?? "";
  if (type === "s") return strings[Number(raw)] ?? "";
  if (type === "b") return raw === "1";
  if (type === "str") return raw;

  if (raw !== "" && Number.isFinite(Number(raw))) return Number(raw);
  return raw;
}

export async function parseXlsxRows(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const files = unzipSync(bytes);
  const worksheetPath = firstWorksheetPath(files);
  if (!worksheetPath || !files[worksheetPath]) {
    throw new Error("FADS couldn't find a worksheet in this Excel file.");
  }

  const strings = sharedStrings(files);
  const sheet = parseXml(files[worksheetPath]);
  const rows = Array.from(sheet.getElementsByTagName("row")).map((rowNode) => {
    const row = [];
    for (const cell of Array.from(rowNode.getElementsByTagName("c"))) {
      const index = columnIndex(cell.getAttribute("r") || "");
      row[index] = cellValue(cell, strings);
    }
    return row.map((value) => value ?? "");
  });

  return rows
    .filter((row) => row.some((value) => String(value ?? "").trim() !== ""))
    .slice(0, 1001);
}
