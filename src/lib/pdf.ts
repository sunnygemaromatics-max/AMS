import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface PdfBranding {
  org_name?: string;
  org_address?: string | null;
  org_phone?: string | null;
  org_email?: string | null;
  org_website?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  pdf_footer_text?: string | null;
}

let CURRENT_BRANDING: PdfBranding = { org_name: "Asset Management System" };
let LOGO_DATA_URL: string | null = null;

/** Called from app boot (and whenever org settings change). */
export async function setPdfBranding(b: PdfBranding | null | undefined) {
  CURRENT_BRANDING = b || { org_name: "Asset Management System" };
  LOGO_DATA_URL = null;
  if (b?.logo_url) {
    try {
      const res = await fetch(b.logo_url, { cache: "force-cache" });
      const blob = await res.blob();
      LOGO_DATA_URL = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    } catch {
      LOGO_DATA_URL = null;
    }
  }
}

function hexToRgb(hex?: string | null): [number, number, number] {
  if (!hex) return [30, 41, 59];
  const m = hex.replace("#", "").match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return [30, 41, 59];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

const HEADER_BG: [number, number, number] = [30, 41, 59]; // fallback (used by tables)
const ACCENT: [number, number, number] = [16, 185, 129];

function header(doc: jsPDF, title: string, subtitle?: string) {
  const w = doc.internal.pageSize.getWidth();
  const bg = hexToRgb(CURRENT_BRANDING.primary_color);
  const orgName = CURRENT_BRANDING.org_name || "Asset Management System";

  doc.setFillColor(...bg);
  doc.rect(0, 0, w, 28, "F");
  doc.setFillColor(...ACCENT);
  doc.rect(0, 28, w, 2, "F");

  let textX = 14;
  if (LOGO_DATA_URL) {
    try {
      doc.addImage(LOGO_DATA_URL, "PNG", 12, 4, 20, 20);
      textX = 36;
    } catch { /* ignore */ }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(title, textX, 14);
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(subtitle, textX, 22);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(orgName, w - 14, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(220, 230, 240);
  doc.text(new Date().toLocaleString(), w - 14, 21, { align: "right" });
  doc.setTextColor(0);
}

function footer(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const footerText = CURRENT_BRANDING.pdf_footer_text || "CONFIDENTIAL — Internal use only";
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pages}`, w / 2, h - 8, { align: "center" });
    doc.text(footerText, 14, h - 8);
    if (CURRENT_BRANDING.org_website) {
      doc.text(CURRENT_BRANDING.org_website, w - 14, h - 8, { align: "right" });
    }
  }
}

function buildBinCardDoc(asset: any, transactions: any[]) {
  const doc = new jsPDF({ format: "a4" });
  header(doc, "BIN CARD", `Asset: ${asset.sap_code} — ${asset.name}`);

  let y = 38;
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text("Asset Details", 14, y); y += 5;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  const details = [
    ["SAP Code", asset.sap_code, "Bin Card #", String(asset.bin_card_no)],
    ["Name", asset.name, "Type", asset.asset_subtype || "-"],
    ["Brand / Model", `${asset.brand || "-"} / ${asset.model || "-"}`, "Serial #", asset.serial_number || "-"],
    ["Status", asset.status, "Cost", asset.purchase_cost ? `₹${Number(asset.purchase_cost).toLocaleString()}` : "-"],
    ["Location", asset.locations?.name || "-", "Department", asset.departments?.name || "-"],
    ["Assigned to", asset.employees?.name || "Unassigned", "Vendor", asset.vendors?.name || "-"],
  ];
  autoTable(doc, {
    startY: y, body: details, theme: "plain",
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 32 }, 2: { fontStyle: "bold", cellWidth: 32 } },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("Transaction Ledger", 14, finalY);

  autoTable(doc, {
    startY: finalY + 3,
    head: [["Date", "Type", "From", "To", "Notes"]],
    body: (transactions || []).map((t) => [
      new Date(t.created_at).toLocaleDateString(),
      t.transaction_type,
      t.from_employee_id ? "Emp" : t.from_location_id ? "Loc" : "-",
      t.employees?.name || t.locations?.name || "-",
      t.notes || "-",
    ]),
    headStyles: { fillColor: HEADER_BG, textColor: 255 },
    styles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  footer(doc);
  return doc;
}

export function exportBinCard(asset: any, transactions: any[]) {
  const doc = buildBinCardDoc(asset, transactions);
  doc.save(`bin-card-${asset.sap_code}.pdf`);
}

export function buildBinCardBlob(asset: any, transactions: any[]): Blob {
  const doc = buildBinCardDoc(asset, transactions);
  return doc.output("blob");
}

export function exportAssetReport(assets: any[]) {
  const doc = new jsPDF({ orientation: "landscape", format: "a4" });
  header(doc, "ASSET REGISTER", `${assets.length} assets`);
  autoTable(doc, {
    startY: 36,
    head: [["Bin#", "SAP Code", "Name", "Type", "Status", "Location", "Assigned", "Cost"]],
    body: assets.map((a) => [
      a.bin_card_no, a.sap_code, a.name,
      a.asset_subtype || "-", a.status,
      a.locations?.name || "-",
      a.employees?.name || "-",
      a.purchase_cost ? `₹${Number(a.purchase_cost).toLocaleString()}` : "-",
    ]),
    headStyles: { fillColor: HEADER_BG, textColor: 255 },
    styles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  footer(doc);
  doc.save(`asset-register-${new Date().toISOString().split("T")[0]}.pdf`);
}

export interface HandoverSlipData {
  asset: any;
  mode: "allocation" | "return" | "transfer";
  fromEmployee?: any;
  toEmployee?: any;
  location?: any;
  condition: string;
  notes?: string;
  performedBy: string;
  date: Date;
}

export function exportHandoverSlip(data: HandoverSlipData) {
  const { asset, mode, fromEmployee, toEmployee, location, condition, notes, performedBy, date } = data;
  const doc = new jsPDF({ format: "a4" });
  const w = doc.internal.pageSize.getWidth();

  const titleMap = { allocation: "ASSET HANDOVER SLIP", return: "ASSET RETURN SLIP", transfer: "ASSET TRANSFER SLIP" };
  header(doc, titleMap[mode], `Reference: HND-${asset.sap_code}-${date.getTime().toString().slice(-6)}`);

  let y = 40;
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(80);
  doc.text(`Issued on ${date.toLocaleString("en-IN", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`, 14, y);
  y += 8;

  // Asset block
  doc.setTextColor(0); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("Asset Details", 14, y); y += 2;
  autoTable(doc, {
    startY: y + 2,
    body: [
      ["SAP Code", asset.sap_code, "Bin Card #", String(asset.bin_card_no)],
      ["Asset Name", asset.name, "Type", (asset.asset_subtype || "-").replace(/_/g, " ")],
      ["Brand / Model", `${asset.brand || "-"} / ${asset.model || "-"}`, "Serial #", asset.serial_number || "-"],
      ["Condition", condition, "Status After", mode === "return" ? "Available" : mode === "allocation" ? "Allocated" : "In Transit"],
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 32, fillColor: [248, 250, 252] }, 2: { fontStyle: "bold", cellWidth: 32, fillColor: [248, 250, 252] } },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Parties block
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("Parties", 14, y); y += 2;
  autoTable(doc, {
    startY: y + 2,
    body: [
      ["Handed Over By", fromEmployee ? `${fromEmployee.name} (${fromEmployee.employee_code})` : "Stores / IT"],
      ["Received By", toEmployee ? `${toEmployee.name} (${toEmployee.employee_code})` : "Stores / IT (Returned)"],
      ["Department", toEmployee?.department || fromEmployee?.department || "-"],
      ["Location", location ? `${location.name} (${location.code})` : "-"],
      ["Processed By", performedBy],
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 45, fillColor: [248, 250, 252] } },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  if (notes) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text("Notes", 14, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60);
    const lines = doc.splitTextToSize(notes, w - 28);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 6;
  }

  // Terms
  doc.setTextColor(80); doc.setFontSize(8);
  const terms = [
    "1. The receiver acknowledges that the asset has been inspected and accepted in the condition stated above.",
    "2. The receiver is responsible for the safe custody and proper use of the asset until formally returned.",
    "3. Any loss, theft, or damage must be reported to the IT department immediately.",
    "4. This slip serves as the official record of the transaction and supersedes all prior verbal agreements.",
  ];
  if (y > 220) { doc.addPage(); y = 20; }
  doc.text(terms, 14, y);
  y += terms.length * 4 + 12;

  // Signatures
  if (y > 240) { doc.addPage(); y = 30; }
  const colW = (w - 28 - 10) / 2;
  doc.setDrawColor(120); doc.setLineWidth(0.3);
  doc.line(14, y + 14, 14 + colW, y + 14);
  doc.line(14 + colW + 10, y + 14, w - 14, y + 14);
  doc.setTextColor(0); doc.setFontSize(9); doc.setFont("helvetica", "bold");
  doc.text(mode === "return" ? "Returned By" : "Issued By", 14, y + 19);
  doc.text(mode === "return" ? "Received By (Stores)" : "Received By", 14 + colW + 10, y + 19);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100);
  doc.text(fromEmployee ? `${fromEmployee.name}` : performedBy, 14, y + 24);
  doc.text(toEmployee ? `${toEmployee.name}` : "Stores / IT", 14 + colW + 10, y + 24);

  footer(doc);
  doc.save(`handover-${asset.sap_code}-${mode}-${date.toISOString().split("T")[0]}.pdf`);
}

export function exportEmployeeReport(employee: any, assets: any[]) {
  const doc = new jsPDF({ format: "a4" });
  header(doc, "EMPLOYEE ASSET REPORT", `${employee.name} (${employee.employee_code})`);
  let y = 38;
  doc.setFontSize(9);
  doc.text(`Department: ${employee.department || "-"}`, 14, y); y += 5;
  doc.text(`Designation: ${employee.designation || "-"}`, 14, y); y += 5;
  doc.text(`Email: ${employee.email || "-"}`, 14, y); y += 5;
  autoTable(doc, {
    startY: y + 4,
    head: [["Bin#", "SAP", "Asset", "Type", "Status"]],
    body: assets.map((a) => [a.bin_card_no, a.sap_code, a.name, a.asset_subtype || "-", a.status]),
    headStyles: { fillColor: HEADER_BG, textColor: 255 },
    styles: { fontSize: 9 },
  });
  footer(doc);
  doc.save(`employee-assets-${employee.employee_code}.pdf`);
}
