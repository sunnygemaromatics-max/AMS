import { supabase } from "@/integrations/supabase/client";
import { normalizeRow, pick, type ParsedRow } from "./bulkImport";

export type RowError = { row: number; column: string; message: string; raw?: any };
export type RowWarning = { row: number; column: string; message: string };

export type FieldMapping = {
  field: string;          // DB field name
  sourceColumn: string;   // matched source column header
  rawValue: any;          // value as read from sheet
  resolvedValue: any;     // value after transformation (e.g. employee id)
  resolutionNote?: string;// e.g. "matched 'rahul sharma' → emp id abc-123"
};

export type DryRunRow = {
  rowNumber: number;
  identifier: string;
  status: "ok" | "duplicate" | "error" | "warning";
  matchedEmployee?: string | null;
  willLinkTo?: string | null;
  errors: string[];
  warnings: string[];
  raw: ParsedRow;
  mappings: FieldMapping[];      // per-row column → field breakdown
};

export type DuplicateStrategy = "skip" | "update";
export type SheetKind = "employee" | "asset" | "license" | "transfer" | "unknown";

export type DryRunResult = {
  kind: SheetKind;
  totalRows: number;
  okCount: number;
  duplicateCount: number;
  errorCount: number;
  warningCount: number;
  rows: DryRunRow[];
};

const isMobileSubtype = (s?: string | null) =>
  !!s && ["mobile_device", "tablet"].includes(String(s).toLowerCase());

// Helper: try a list of source keys against the normalized row,
// return both the value and which source column matched.
function pickWithSource(r: ParsedRow, raw: ParsedRow, keys: string[]): { value: any; source: string | null } {
  // raw is the original (pre-normalize) row so we can show the user's exact column header
  const rawKeyMap = new Map<string, string>(); // normalized -> original
  for (const k of Object.keys(raw)) {
    rawKeyMap.set(k.toLowerCase().trim().replace(/\s+/g, "_"), k);
  }
  for (const k of keys) {
    const norm = k.toLowerCase().replace(/\s+/g, "_");
    const v = r[norm];
    if (v !== undefined && v !== null && v !== "") {
      return { value: v, source: rawKeyMap.get(norm) || norm };
    }
  }
  return { value: null, source: null };
}

export async function dryRunSheet(
  rows: ParsedRow[],
  kind: SheetKind,
): Promise<DryRunResult> {
  const out: DryRunResult = {
    kind, totalRows: rows.length, okCount: 0, duplicateCount: 0, errorCount: 0, warningCount: 0, rows: [],
  };
  if (kind === "unknown" || rows.length === 0) return out;

  // Preload existing keys + employee map (case-insensitive)
  const existingKeys = new Set<string>();
  const empMap = new Map<string, { id: string; name: string }>();
  const assetByCode = new Map<string, { id: string; current_location_id: string | null; bin_card_no: number }>();
  const locByCode = new Map<string, { id: string; name: string }>();

  if (kind === "employee") {
    const { data } = await supabase.from("employees").select("employee_code");
    data?.forEach((e: any) => existingKeys.add(String(e.employee_code).toLowerCase()));
  } else if (kind === "asset") {
    const { data } = await supabase.from("assets").select("sap_code");
    data?.forEach((a: any) => existingKeys.add(String(a.sap_code).toLowerCase()));
    const { data: emp } = await supabase.from("employees").select("id, name");
    emp?.forEach((e: any) => empMap.set(String(e.name).toLowerCase().trim(), { id: e.id, name: e.name }));
  } else if (kind === "license") {
    const { data: emp } = await supabase.from("employees").select("id, name");
    emp?.forEach((e: any) => empMap.set(String(e.name).toLowerCase().trim(), { id: e.id, name: e.name }));
  } else if (kind === "transfer") {
    const { data: a } = await supabase.from("assets").select("id, sap_code, current_location_id, bin_card_no");
    a?.forEach((x: any) =>
      assetByCode.set(String(x.sap_code).toLowerCase(), {
        id: x.id, current_location_id: x.current_location_id, bin_card_no: x.bin_card_no,
      }),
    );
    const { data: l } = await supabase.from("locations").select("id, code, name");
    l?.forEach((x: any) => locByCode.set(String(x.code).toLowerCase(), { id: x.id, name: x.name }));
  }

  rows.forEach((raw, i) => {
    const r = normalizeRow(raw);
    const rowNumber = i + 2;
    const errors: string[] = [];
    const warnings: string[] = [];
    const mappings: FieldMapping[] = [];
    let identifier = "";
    let matchedEmployee: string | null = null;
    let willLinkTo: string | null = null;
    let isDup = false;

    const addMapping = (field: string, keys: string[], note?: string, transform?: (v: any) => any) => {
      const { value, source } = pickWithSource(r, raw, keys);
      if (source) {
        mappings.push({
          field,
          sourceColumn: source,
          rawValue: value,
          resolvedValue: transform ? transform(value) : value,
          resolutionNote: note,
        });
      }
      return value;
    };

    if (kind === "employee") {
      const code = addMapping("employee_code", ["employee_code", "emp_code", "code", "id"])?.toString();
      const name = addMapping("name", ["name", "employee_name", "full_name"]);
      const dept = addMapping("department", ["department", "dept"]);
      addMapping("email", ["email", "email_id"]);
      addMapping("phone", ["phone", "mobile"]);
      addMapping("designation", ["designation", "role", "title"]);
      identifier = code || name || `Row ${rowNumber}`;
      if (!code) errors.push("employee_code is required");
      if (!name) errors.push("name is required");
      if (!dept) warnings.push("department empty (will default to 'General')");
      if (code && existingKeys.has(code.toLowerCase())) isDup = true;
    } else if (kind === "asset") {
      const sap = addMapping("sap_code", ["sap_code", "sap", "asset_code", "code"])?.toString();
      const name = addMapping("name", ["name", "asset_name", "description", "item"]);
      const subtype = addMapping("asset_subtype", ["asset_subtype", "subtype", "type"])?.toString();
      addMapping("brand", ["brand", "make"]);
      addMapping("model", ["model"]);
      addMapping("serial_number", ["serial_number", "serial", "sl_no"]);
      const imei = addMapping("imei", ["imei", "imei1", "imei_1"])?.toString();
      addMapping("imei2", ["imei2", "imei_2"]);
      addMapping("mobile_number", ["mobile_number", "mobile_no", "phone"]);
      addMapping("sim_provider", ["sim_provider", "provider", "carrier"]);
      const iccid = addMapping("iccid", ["iccid", "sim_iccid"])?.toString();
      addMapping("purchase_cost", ["purchase_cost", "cost", "price"]);
      addMapping("warranty_end", ["warranty_end", "warranty_expiry"]);

      const empName = pick(r, ["assigned_to", "employee", "user", "user_name"])?.toString();
      identifier = sap || name || `Row ${rowNumber}`;
      if (!sap) errors.push("sap_code is required");
      if (!name) errors.push("name is required");
      if (sap && existingKeys.has(sap.toLowerCase())) isDup = true;

      if (isMobileSubtype(subtype) && !imei) {
        warnings.push(`subtype='${subtype}' usually requires IMEI`);
      }
      if (imei && !/^\d{14,16}$/.test(imei.replace(/\s/g, ""))) {
        warnings.push("IMEI should be 14–16 digits");
      }
      if (iccid && !/^\d{18,22}$/.test(iccid.replace(/\s/g, ""))) {
        warnings.push("ICCID should be 18–22 digits");
      }

      if (empName) {
        const m = empMap.get(empName.toLowerCase().trim());
        if (m) {
          matchedEmployee = m.name;
          willLinkTo = m.name;
          mappings.push({
            field: "current_employee_id",
            sourceColumn: "assigned_to",
            rawValue: empName,
            resolvedValue: m.id,
            resolutionNote: `matched '${empName.toLowerCase().trim()}' → employee '${m.name}' (id: ${m.id.slice(0, 8)}…)`,
          });
        } else {
          warnings.push(`'${empName}' not found in employees — will be left unallocated`);
          mappings.push({
            field: "current_employee_id",
            sourceColumn: "assigned_to",
            rawValue: empName,
            resolvedValue: null,
            resolutionNote: `no employee matched '${empName.toLowerCase().trim()}' — left unallocated`,
          });
        }
      }
    } else if (kind === "license") {
      const product = addMapping("product_name", ["product_name", "product", "name"]);
      addMapping("license_type", ["license_type", "type"]);
      addMapping("license_key", ["license_key", "key"]);
      addMapping("email_id", ["email_id", "email"]);
      addMapping("domain", ["domain"]);
      addMapping("sap_user_id", ["sap_user_id", "user_id"]);
      const validity = addMapping("validity_end", ["validity_end", "expiry", "expiry_date"]);
      const empName = pick(r, ["assigned_to", "employee", "user"])?.toString();
      identifier = product || `Row ${rowNumber}`;
      if (!product) errors.push("product_name is required");
      if (validity && isNaN(Date.parse(String(validity)))) {
        warnings.push("validity_end is not a parseable date (use YYYY-MM-DD)");
      }
      if (empName) {
        const m = empMap.get(empName.toLowerCase().trim());
        if (m) {
          matchedEmployee = m.name;
          willLinkTo = m.name;
          mappings.push({
            field: "assigned_employee_id",
            sourceColumn: "assigned_to",
            rawValue: empName,
            resolvedValue: m.id,
            resolutionNote: `matched '${empName.toLowerCase().trim()}' → employee '${m.name}' (id: ${m.id.slice(0, 8)}…)`,
          });
        } else {
          warnings.push(`'${empName}' not found in employees`);
        }
      }
    } else if (kind === "transfer") {
      const sap = addMapping("sap_code", ["sap_code", "sap", "asset_code"])?.toString();
      const fromLoc = addMapping("from_location_code", ["from_location_code", "from_location", "from"])?.toString();
      const toLoc = addMapping("to_location_code", ["to_location_code", "to_location", "to"])?.toString();
      addMapping("transfer_date", ["transfer_date", "date"]);
      addMapping("notes", ["notes", "remark", "remarks"]);
      const reissueRaw = addMapping("reissue_bin_card", ["reissue_bin_card", "reissue", "new_bin_card"]);
      const reissue = reissueRaw == null ? true : !["false", "no", "0", "n"].includes(String(reissueRaw).toLowerCase());

      identifier = sap || `Row ${rowNumber}`;
      if (!sap) errors.push("sap_code is required");
      if (!toLoc) errors.push("to_location_code is required");

      const asset = sap ? assetByCode.get(sap.toLowerCase()) : null;
      if (sap && !asset) errors.push(`asset '${sap}' not found — create it before transferring`);

      const toMatch = toLoc ? locByCode.get(toLoc.toLowerCase()) : null;
      if (toLoc && !toMatch) errors.push(`to_location_code '${toLoc}' not found in locations`);

      if (fromLoc) {
        const fromMatch = locByCode.get(fromLoc.toLowerCase());
        if (!fromMatch) {
          errors.push(`from_location_code '${fromLoc}' not found in locations`);
        } else if (asset && asset.current_location_id && asset.current_location_id !== fromMatch.id) {
          errors.push(`asset is not currently at '${fromLoc}' — actual location differs`);
        }
      }

      if (asset && toMatch && asset.current_location_id === toMatch.id) {
        warnings.push(`asset is already at '${toLoc}' — transfer would be a no-op`);
      }

      if (toMatch && asset) {
        willLinkTo = `${toMatch.name}${reissue ? " (new bin card)" : ` (keep bin #${asset.bin_card_no})`}`;
        mappings.push({
          field: "current_location_id",
          sourceColumn: "to_location_code",
          rawValue: toLoc,
          resolvedValue: toMatch.id,
          resolutionNote: `matched '${toLoc}' → location '${toMatch.name}' (id: ${toMatch.id.slice(0, 8)}…)`,
        });
      }
    }

    const status: DryRunRow["status"] = errors.length
      ? "error"
      : isDup
      ? "duplicate"
      : warnings.length
      ? "warning"
      : "ok";

    if (status === "ok") out.okCount++;
    if (status === "duplicate") out.duplicateCount++;
    if (status === "error") out.errorCount++;
    if (status === "warning") out.warningCount++;

    out.rows.push({ rowNumber, identifier, status, matchedEmployee, willLinkTo, errors, warnings, raw, mappings });
  });

  return out;
}

export function downloadCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
