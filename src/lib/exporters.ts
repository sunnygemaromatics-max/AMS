// Shared export helpers for tables: CSV, JSON, Excel, PDF, Print.
// Lazy-loads the heavy libraries (exceljs, jspdf) so the bundle stays small
// for users who never click Export.

export type ExportColumn<T> = {
  key: keyof T | string;
  label: string;
  /** Optional value mapper (defaults to row[key]). */
  get?: (row: T) => unknown;
  /** Optional column width in characters for Excel. */
  width?: number;
};

function timestamp(): string {
  return new Date().toISOString().split("T")[0];
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revocation so large downloads don't get cancelled in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function rowValue<T>(row: T, col: ExportColumn<T>): unknown {
  if (col.get) return col.get(row);
  return (row as Record<string, unknown>)[col.key as string];
}

function safeCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  return String(v);
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV
// ─────────────────────────────────────────────────────────────────────────────
export function exportCSV<T>(
  rows: T[],
  cols: ExportColumn<T>[],
  filenameStem: string,
): void {
  const head = cols.map(c => `"${c.label.replace(/"/g, '""')}"`).join(",");
  const body = rows.map(r =>
    cols.map(c => `"${safeCell(rowValue(r, c)).replace(/"/g, '""')}"`).join(",")
  ).join("\n");
  // BOM so Excel auto-detects UTF-8
  const blob = new Blob(["﻿" + head + "\n" + body], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filenameStem}_${timestamp()}.csv`);
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON
// ─────────────────────────────────────────────────────────────────────────────
export function exportJSON<T>(rows: T[], filenameStem: string): void {
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${filenameStem}_${timestamp()}.json`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Excel  (.xlsx via exceljs — better than CSV: keeps types, widths, header row bold)
// ─────────────────────────────────────────────────────────────────────────────
export async function exportXLSX<T>(
  rows: T[],
  cols: ExportColumn<T>[],
  filenameStem: string,
  sheetName = "Sheet1",
): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const ws = wb.addWorksheet(sheetName);

  ws.columns = cols.map(c => ({
    header: c.label,
    key: String(c.key),
    width: c.width ?? Math.max(12, c.label.length + 2),
  }));

  // Header style
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E293B" },
  };
  ws.getRow(1).alignment = { vertical: "middle" };

  for (const r of rows) {
    const obj: Record<string, unknown> = {};
    for (const c of cols) obj[String(c.key)] = safeCell(rowValue(r, c));
    ws.addRow(obj);
  }

  ws.views = [{ state: "frozen", ySplit: 1 }];

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, `${filenameStem}_${timestamp()}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF (jspdf + autotable — landscape A4, repeated header, alternating rows)
// ─────────────────────────────────────────────────────────────────────────────
export async function exportPDF<T>(
  rows: T[],
  cols: ExportColumn<T>[],
  filenameStem: string,
  title: string,
  subtitle?: string,
): Promise<void> {
  const [{ default: jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = (autoTableMod as { default: (doc: unknown, opts: unknown) => void }).default;

  const doc = new jsPDF({ orientation: "landscape", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, 12, 12);
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(subtitle, 12, 18);
  }
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString(), pageW - 12, 12, { align: "right" });
  doc.text(`${rows.length} row${rows.length === 1 ? "" : "s"}`, pageW - 12, 18, { align: "right" });
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 28,
    head: [cols.map(c => c.label)],
    body: rows.map(r => cols.map(c => safeCell(rowValue(r, c)))),
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 8, right: 8 },
    didDrawPage: () => {
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        `Page ${doc.getNumberOfPages()}`,
        pageW / 2,
        h - 6,
        { align: "center" }
      );
    },
  });

  doc.save(`${filenameStem}_${timestamp()}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Print (opens a new window with a clean printable HTML table)
// ─────────────────────────────────────────────────────────────────────────────
export function printTable<T>(
  rows: T[],
  cols: ExportColumn<T>[],
  title: string,
  subtitle?: string,
): void {
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return;

  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const headHtml = cols.map(c => `<th>${escape(c.label)}</th>`).join("");
  const bodyHtml = rows.map(r =>
    `<tr>${cols.map(c => `<td>${escape(safeCell(rowValue(r, c)))}</td>`).join("")}</tr>`
  ).join("");

  w.document.write(`<!doctype html>
<html><head><title>${escape(title)}</title><style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; padding: 24px; color: #111; }
  h1 { margin: 0 0 4px 0; font-size: 18px; }
  .sub { color: #666; font-size: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #1e293b; color: #fff; }
  tr:nth-child(even) td { background: #f8fafc; }
  @media print { @page { size: A4 landscape; margin: 12mm; } body { padding: 0; } }
</style></head><body>
  <h1>${escape(title)}</h1>
  ${subtitle ? `<div class="sub">${escape(subtitle)} — ${rows.length} row${rows.length === 1 ? "" : "s"} — printed ${new Date().toLocaleString()}</div>` : ""}
  <table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>
  <script>window.addEventListener("load", () => { window.print(); });</script>
</body></html>`);
  w.document.close();
}
