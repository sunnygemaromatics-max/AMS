import ExcelJS from 'exceljs';
import JSZip from "jszip";

export type ParsedRow = Record<string, any>;
export interface ParsedFile {
  filename: string;
  sheets: { name: string; rows: ParsedRow[] }[];
}

export async function parseExcelFile(file: File | Blob, filename: string): Promise<ParsedFile> {
  const workbook = new ExcelJS.Workbook();
  const buf = await file.arrayBuffer();
  await workbook.xlsx.load(buf);
  
  const sheets = workbook.worksheets.map((worksheet) => {
    const rows: ParsedRow[] = [];
    const headers: string[] = [];
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        // Extract headers
        row.eachCell((cell, colNumber) => {
          headers[colNumber - 1] = cell.value?.toString().trim() || `Column${colNumber}`;
        });
      } else {
        // Extract data rows
        const rowData: ParsedRow = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (header) {
            rowData[header] = cell.value;
          }
        });
        rows.push(rowData);
      }
    });
    
    return {
      name: worksheet.name,
      rows,
    };
  });
  
  return { filename, sheets };
}

export async function parseCsvFile(file: File, filename: string): Promise<ParsedFile> {
  const workbook = new ExcelJS.Workbook();
  const text = await file.text();
  
  // Parse CSV manually since ExcelJS CSV parsing is limited
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    return { filename, sheets: [{ name: 'Sheet1', rows: [] }] };
  }
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows: ParsedRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row: ParsedRow = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || null;
    });
    
    rows.push(row);
  }
  
  return { filename, sheets: [{ name: 'Sheet1', rows }] };
}

export async function parseZipFile(file: File): Promise<ParsedFile[]> {
  const zip = await JSZip.loadAsync(file);
  const out: ParsedFile[] = [];
  for (const fname of Object.keys(zip.files)) {
    const entry = zip.files[fname];
    if (entry.dir) continue;
    const lower = fname.toLowerCase();
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      const blob = await entry.async("blob");
      out.push(await parseExcelFile(blob, fname));
    } else if (lower.endsWith(".csv")) {
      const text = await entry.async("string");
      const tempFile = new File([text], fname, { type: 'text/csv' });
      out.push(await parseCsvFile(tempFile, fname));
    }
  }
  return out;
}

// Heuristic: classify a sheet. Also accepts a sheet name hint.
export function classifySheet(rows: ParsedRow[], sheetName?: string): "asset" | "employee" | "license" | "transfer" | "unknown" {
  if (!rows.length) return "unknown";
  const keys = Object.keys(rows[0]).join(" ").toLowerCase();
  const sname = (sheetName || "").toLowerCase();
  // Transfer detection — explicit columns or sheet named 'transfers'
  if (
    sname.includes("transfer") ||
    (keys.includes("from_location") || keys.includes("to_location") || keys.includes("from location") || keys.includes("to location"))
  ) return "transfer";
  if (keys.includes("imei") || keys.includes("sap") || keys.includes("bin") || keys.includes("asset")) return "asset";
  if (keys.includes("employee") || keys.includes("designation") || keys.includes("department")) return "employee";
  if (keys.includes("license") || keys.includes("validity") || keys.includes("email id")) return "license";
  return "unknown";
}

// Normalize a row's keys to lowercase trimmed
export function normalizeRow(row: ParsedRow): ParsedRow {
  const out: ParsedRow = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.toLowerCase().trim().replace(/\s+/g, "_")] = typeof v === "string" ? v.trim() : v;
  }
  return out;
}

export function pick(row: ParsedRow, keys: string[]): any {
  for (const k of keys) {
    const v = row[k.toLowerCase().replace(/\s+/g, "_")];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}
