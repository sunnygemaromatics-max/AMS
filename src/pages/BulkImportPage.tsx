import { useMemo, useState, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Loader2, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Database, Download,
  Link2, Users, Package, KeyRound, Eye, History, PackageOpen, AlertTriangle,
  ChevronRight, ChevronDown, ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  parseExcelFile, parseCsvFile, parseZipFile,
  normalizeRow, pick, classifySheet, type ParsedFile,
} from "@/lib/bulkImport";
import {
  dryRunSheet, downloadCsv,
  type DryRunResult, type DryRunRow, type RowError, type DuplicateStrategy, type SheetKind,
} from "@/lib/importHelpers";

type Stats = { inserted: number; updated: number; skipped: number; errors: RowError[] };
type Snapshot = {
  // Old state of records that were updated (for rollback)
  updates: { table: string; before: any }[];
  // IDs of records that were newly inserted (for rollback delete)
  inserts: { table: string; id: string }[];
};

export default function BulkImportPage() {
  const { user, profile } = useAuth();
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previews, setPreviews] = useState<Record<string, DryRunResult>>({});
  const [stats, setStats] = useState<Record<string, Stats>>({});
  // Duplicate strategy per sheet key (filename::sheetName). Default: skip.
  const [dupStrategies, setDupStrategies] = useState<Record<string, DuplicateStrategy>>({});

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;
    setParsing(true);
    setStats({});
    setPreviews({});
    setDupStrategies({});
    try {
      const all: ParsedFile[] = [];
      for (const f of Array.from(fileList)) {
        const lower = f.name.toLowerCase();
        if (lower.endsWith(".zip")) all.push(...(await parseZipFile(f)));
        else if (lower.endsWith(".csv")) all.push(await parseCsvFile(f, f.name));
        else if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) all.push(await parseExcelFile(f, f.name));
      }
      setFiles(all);
      toast.success(`Parsed ${all.length} file(s)`);
    } catch (err: any) {
      toast.error(err.message || "Parse failed");
    } finally {
      setParsing(false);
    }
  };

  const runPreview = async () => {
    setPreviewing(true);
    const out: Record<string, DryRunResult> = {};
    const initStrats: Record<string, DuplicateStrategy> = { ...dupStrategies };
    for (const f of files) {
      for (const sh of f.sheets) {
        const kind = classifySheet(sh.rows, sh.name);
        const key = `${f.filename}::${sh.name}`;
        out[key] = await dryRunSheet(sh.rows, kind);
        if (!initStrats[key]) initStrats[key] = "skip";
      }
    }
    setPreviews(out);
    setDupStrategies(initStrats);
    setPreviewing(false);
    toast.success("Preview ready — review linking, duplicates & errors below");
  };

  // ---------- IMPORTERS ----------
  const importEmployees = async (rows: any[], strategy: DuplicateStrategy, snap: Snapshot): Promise<Stats> => {
    const out: Stats = { inserted: 0, updated: 0, skipped: 0, errors: [] };
    const { data: existingRows } = await supabase.from("employees").select("*");
    const existingMap = new Map((existingRows || []).map((e: any) => [String(e.employee_code).toLowerCase(), e]));
    for (let i = 0; i < rows.length; i++) {
      const r = normalizeRow(rows[i]);
      const rowNum = i + 2;
      const code = pick(r, ["employee_code", "emp_code", "code", "id"])?.toString();
      const name = pick(r, ["name", "employee_name", "full_name"]);
      if (!code) { out.errors.push({ row: rowNum, column: "employee_code", message: "missing required value" }); continue; }
      if (!name) { out.errors.push({ row: rowNum, column: "name", message: "missing required value" }); continue; }
      const payload = {
        employee_code: code, name,
        email: pick(r, ["email", "email_id"]) || null,
        phone: pick(r, ["phone", "mobile"])?.toString() || null,
        department: pick(r, ["department", "dept"]) || "General",
        designation: pick(r, ["designation", "role", "title"]) || null,
      };
      const existing = existingMap.get(code.toLowerCase());
      if (existing) {
        if (strategy === "skip") { out.skipped++; continue; }
        snap.updates.push({ table: "employees", before: existing });
        const { error } = await supabase.from("employees").update(payload).eq("id", (existing as any).id);
        if (error) out.errors.push({ row: rowNum, column: "—", message: error.message });
        else out.updated++;
      } else {
        const { data, error } = await supabase.from("employees").insert(payload).select("id").single();
        if (error) out.errors.push({ row: rowNum, column: "—", message: error.message });
        else { out.inserted++; if (data?.id) snap.inserts.push({ table: "employees", id: data.id }); }
      }
    }
    return out;
  };

  const importAssets = async (rows: any[], strategy: DuplicateStrategy, snap: Snapshot): Promise<Stats> => {
    const out: Stats = { inserted: 0, updated: 0, skipped: 0, errors: [] };
    const { data: existingRows } = await supabase.from("assets").select("*");
    const existingMap = new Map((existingRows || []).map((a: any) => [String(a.sap_code).toLowerCase(), a]));
    const { data: empData } = await supabase.from("employees").select("id, name");
    const empByName = new Map(empData?.map((e: any) => [String(e.name).toLowerCase().trim(), e.id]) || []);
    for (let i = 0; i < rows.length; i++) {
      const r = normalizeRow(rows[i]);
      const rowNum = i + 2;
      const sap = pick(r, ["sap_code", "sap", "asset_code", "code"])?.toString();
      const name = pick(r, ["name", "asset_name", "description", "item"]);
      if (!sap) { out.errors.push({ row: rowNum, column: "sap_code", message: "missing required value" }); continue; }
      if (!name) { out.errors.push({ row: rowNum, column: "name", message: "missing required value" }); continue; }
      const empName = pick(r, ["assigned_to", "employee", "user", "user_name"])?.toString().toLowerCase().trim();
      const empId = empName ? empByName.get(empName) || null : null;
      const corePayload: any = {
        name,
        brand: pick(r, ["brand", "make"]) || null,
        model: pick(r, ["model"]) || null,
        serial_number: pick(r, ["serial_number", "serial", "sl_no"])?.toString() || null,
        imei: pick(r, ["imei", "imei1", "imei_1"])?.toString() || null,
        imei2: pick(r, ["imei2", "imei_2"])?.toString() || null,
        mobile_number: pick(r, ["mobile_number", "mobile_no", "phone"])?.toString() || null,
        sim_provider: pick(r, ["sim_provider", "provider", "carrier"]) || null,
        purchase_cost: Number(pick(r, ["purchase_cost", "cost", "price"])) || null,
        current_employee_id: empId,
        status: empId ? "allocated" : "available",
      };
      const existing = existingMap.get(sap.toLowerCase());
      if (existing) {
        if (strategy === "skip") { out.skipped++; continue; }
        snap.updates.push({ table: "assets", before: existing });
        const { error } = await supabase.from("assets").update(corePayload).eq("id", (existing as any).id);
        if (error) out.errors.push({ row: rowNum, column: "—", message: error.message });
        else out.updated++;
      } else {
        const { data: binData } = await supabase.rpc("next_bin_card_no");
        const { data, error } = await supabase.from("assets").insert({
          ...corePayload, sap_code: sap, bin_card_no: binData as number,
        }).select("id").single();
        if (error) out.errors.push({ row: rowNum, column: "—", message: error.message });
        else { out.inserted++; if (data?.id) snap.inserts.push({ table: "assets", id: data.id }); }
      }
    }
    return out;
  };

  const importLicenses = async (rows: any[], strategy: DuplicateStrategy, snap: Snapshot): Promise<Stats> => {
    const out: Stats = { inserted: 0, updated: 0, skipped: 0, errors: [] };
    const { data: empData } = await supabase.from("employees").select("id, name");
    const empByName = new Map(empData?.map((e: any) => [String(e.name).toLowerCase().trim(), e.id]) || []);
    // Licenses don't have a natural key — match by product_name + email_id as a soft key
    const { data: existingRows } = await supabase.from("licenses").select("*");
    const keyOf = (p: any, e: any) => `${String(p ?? "").toLowerCase()}::${String(e ?? "").toLowerCase()}`;
    const existingMap = new Map((existingRows || []).map((l: any) => [keyOf(l.product_name, l.email_id), l]));
    for (let i = 0; i < rows.length; i++) {
      const r = normalizeRow(rows[i]);
      const rowNum = i + 2;
      const product = pick(r, ["product_name", "product", "name"]);
      if (!product) { out.errors.push({ row: rowNum, column: "product_name", message: "missing required value" }); continue; }
      const email = pick(r, ["email_id", "email"])?.toString() || null;
      const empName = pick(r, ["assigned_to", "employee", "user"])?.toString().toLowerCase().trim();
      const payload: any = {
        license_type: pick(r, ["license_type", "type"]) || "software_license",
        product_name: product,
        license_key: pick(r, ["license_key", "key"])?.toString() || null,
        email_id: email,
        domain: pick(r, ["domain"])?.toString() || null,
        sap_user_id: pick(r, ["sap_user_id", "user_id"])?.toString() || null,
        validity_end: pick(r, ["validity_end", "expiry", "expiry_date"]) || null,
        assigned_employee_id: empName ? empByName.get(empName) || null : null,
      };
      const existing = existingMap.get(keyOf(product, email));
      if (existing) {
        if (strategy === "skip") { out.skipped++; continue; }
        snap.updates.push({ table: "licenses", before: existing });
        const { error } = await supabase.from("licenses").update(payload).eq("id", (existing as any).id);
        if (error) out.errors.push({ row: rowNum, column: "—", message: error.message });
        else out.updated++;
      } else {
        const { data, error } = await supabase.from("licenses").insert(payload).select("id").single();
        if (error) out.errors.push({ row: rowNum, column: "—", message: error.message });
        else { out.inserted++; if (data?.id) snap.inserts.push({ table: "licenses", id: data.id }); }
      }
    }
    return out;
  };

  const importTransfers = async (rows: any[], snap: Snapshot): Promise<Stats> => {
    const out: Stats = { inserted: 0, updated: 0, skipped: 0, errors: [] };
    const { data: assetsData } = await supabase.from("assets").select("id, sap_code, current_location_id, bin_card_no");
    const assetMap = new Map((assetsData || []).map((a: any) => [String(a.sap_code).toLowerCase(), a]));
    const { data: locsData } = await supabase.from("locations").select("id, code, name");
    const locMap = new Map((locsData || []).map((l: any) => [String(l.code).toLowerCase(), l]));

    for (let i = 0; i < rows.length; i++) {
      const r = normalizeRow(rows[i]);
      const rowNum = i + 2;
      const sap = pick(r, ["sap_code", "sap", "asset_code"])?.toString();
      const fromCode = pick(r, ["from_location_code", "from_location", "from"])?.toString();
      const toCode = pick(r, ["to_location_code", "to_location", "to"])?.toString();
      const reissueRaw = pick(r, ["reissue_bin_card", "reissue", "new_bin_card"]);
      const reissue = reissueRaw == null ? true : !["false", "no", "0", "n"].includes(String(reissueRaw).toLowerCase());
      const notes = pick(r, ["notes", "remark", "remarks"]);

      if (!sap) { out.errors.push({ row: rowNum, column: "sap_code", message: "missing required value" }); continue; }
      if (!toCode) { out.errors.push({ row: rowNum, column: "to_location_code", message: "missing required value" }); continue; }
      const asset: any = assetMap.get(sap.toLowerCase());
      if (!asset) { out.errors.push({ row: rowNum, column: "sap_code", message: `asset '${sap}' not found` }); continue; }
      const toLoc: any = locMap.get(toCode.toLowerCase());
      if (!toLoc) { out.errors.push({ row: rowNum, column: "to_location_code", message: `location '${toCode}' not found` }); continue; }
      const fromLoc: any = fromCode ? locMap.get(fromCode.toLowerCase()) : null;
      if (fromCode && !fromLoc) { out.errors.push({ row: rowNum, column: "from_location_code", message: `location '${fromCode}' not found` }); continue; }
      if (fromLoc && asset.current_location_id && asset.current_location_id !== fromLoc.id) {
        out.errors.push({ row: rowNum, column: "from_location_code", message: "asset is not currently at the stated from location" });
        continue;
      }
      if (asset.current_location_id === toLoc.id) { out.skipped++; continue; }

      // Snapshot before-state
      snap.updates.push({ table: "assets", before: asset });

      // Build asset update
      const assetUpdate: any = { current_location_id: toLoc.id };
      if (reissue) {
        const { data: binData } = await supabase.rpc("next_bin_card_no");
        if (typeof binData === "number") assetUpdate.bin_card_no = binData;
      }
      const { error: aErr } = await supabase.from("assets").update(assetUpdate).eq("id", asset.id);
      if (aErr) { out.errors.push({ row: rowNum, column: "—", message: aErr.message }); continue; }

      // Insert transaction record
      const { data: txData, error: tErr } = await supabase.from("asset_transactions").insert({
        asset_id: asset.id,
        transaction_type: "transfer",
        from_location_id: asset.current_location_id,
        to_location_id: toLoc.id,
        notes: notes || (reissue ? "Bulk import — bin card reissued" : "Bulk import — bin card retained"),
      }).select("id").single();
      if (tErr) {
        out.errors.push({ row: rowNum, column: "—", message: tErr.message });
      } else {
        out.updated++;
        if (txData?.id) snap.inserts.push({ table: "asset_transactions", id: txData.id });
      }
    }
    return out;
  };

  const runImport = async () => {
    setImporting(true);
    const results: Record<string, Stats> = {};
    const detailEntries: any[] = [];
    const snapshot: Snapshot = { updates: [], inserts: [] };
    let totals = { total: 0, ins: 0, upd: 0, skip: 0, fail: 0 };

    for (const f of files) {
      for (const sheet of f.sheets) {
        const kind = classifySheet(sheet.rows, sheet.name) as SheetKind;
        const key = `${f.filename} → ${sheet.name} (${kind})`;
        const stratKey = `${f.filename}::${sheet.name}`;
        const strategy = dupStrategies[stratKey] || "skip";
        let s: Stats;
        try {
          if (kind === "employee") s = await importEmployees(sheet.rows, strategy, snapshot);
          else if (kind === "asset") s = await importAssets(sheet.rows, strategy, snapshot);
          else if (kind === "license") s = await importLicenses(sheet.rows, strategy, snapshot);
          else if (kind === "transfer") s = await importTransfers(sheet.rows, snapshot);
          else s = { inserted: 0, updated: 0, skipped: sheet.rows.length, errors: [{ row: 0, column: "—", message: "Unknown sheet type" }] };
        } catch (err: any) {
          s = { inserted: 0, updated: 0, skipped: 0, errors: [{ row: 0, column: "—", message: err.message }] };
        }
        results[key] = s;
        totals.total += sheet.rows.length;
        totals.ins += s.inserted;
        totals.upd += s.updated;
        totals.skip += s.skipped;
        totals.fail += s.errors.length;
        detailEntries.push({
          file: f.filename, sheet: sheet.name, kind, strategy,
          inserted: s.inserted, updated: s.updated, skipped: s.skipped, errors: s.errors,
        });
      }
    }
    setStats(results);

    // Persist to import_runs with snapshot for rollback
    await supabase.from("import_runs").insert({
      performed_by: user?.id || null,
      performed_by_name: profile?.full_name || user?.email || "Unknown",
      file_names: files.map((f) => f.filename),
      total_rows: totals.total,
      inserted: totals.ins + totals.upd, // count both as "applied"
      skipped: totals.skip,
      failed: totals.fail,
      details: detailEntries as any,
      snapshot: snapshot as any,
      inserted_ids: snapshot.inserts as any,
    });

    setImporting(false);
    toast.success(`Import done: ${totals.ins} new · ${totals.upd} updated · ${totals.skip} skipped · ${totals.fail} failed`);
  };

  const totalRows = files.reduce((s, f) => s + f.sheets.reduce((ss, sh) => ss + sh.rows.length, 0), 0);
  const hasPreview = Object.keys(previews).length > 0;

  const allFailedRows = useMemo(() => {
    const out: Array<{ source: string; err: RowError }> = [];
    for (const [key, s] of Object.entries(stats)) {
      s.errors.forEach((e) => out.push({ source: key, err: e }));
    }
    return out;
  }, [stats]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Database className="h-7 w-7" /> Bulk Import</h1>
          <p className="text-muted-foreground">Upload ZIP / Excel / CSV files. Auto-detects employees, assets, licenses, transfers.</p>
        </div>
        <Button asChild variant="outline"><Link to="/import/history"><History className="h-4 w-4 mr-2" />Import History</Link></Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Sample templates &amp; demo dataset</CardTitle>
          <CardDescription>Download blank templates per entity, or grab a fully-linked demo ZIP to try the whole flow in seconds.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <PackageOpen className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Demo dataset (15 employees · 30 assets · 10 licenses · 2 transfers)</div>
              <div className="text-xs text-muted-foreground">Pre-linked by name. Includes mobiles with IMEI/SIM data, SAP licenses, and asset transfers between locations.</div>
            </div>
            <Button asChild>
              <a href="/templates/demo_dataset.zip" download><Download className="h-4 w-4 mr-2" />Demo ZIP</a>
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                key: "employees", icon: Users, title: "Employees",
                file: "/templates/template_employees.xlsx",
                required: ["employee_code", "name", "department"],
                optional: ["email", "phone", "designation"],
                links: "Master list. Assets & Licenses link by NAME (case-insensitive).",
              },
              {
                key: "assets", icon: Package, title: "Assets",
                file: "/templates/template_assets.xlsx",
                required: ["sap_code", "name"],
                optional: ["asset_subtype", "brand", "model", "serial_number", "imei", "imei2", "mobile_number", "sim_provider", "iccid", "purchase_cost", "warranty_end", "assigned_to"],
                links: "'assigned_to' matches Employees by name. mobile_device/tablet should include IMEI.",
              },
              {
                key: "licenses", icon: KeyRound, title: "Licenses",
                file: "/templates/template_licenses.xlsx",
                required: ["product_name"],
                optional: ["license_type", "license_key", "email_id", "domain", "sap_user_id", "validity_start", "validity_end", "max_users", "assigned_to"],
                links: "'validity_end' (YYYY-MM-DD) drives expiry alerts.",
              },
              {
                key: "transfers", icon: ArrowRightLeft, title: "Transfers",
                file: "/templates/template_assets.xlsx",
                required: ["sap_code", "to_location_code"],
                optional: ["from_location_code", "transfer_date", "reissue_bin_card", "notes"],
                links: "Move existing assets between locations. reissue_bin_card=TRUE assigns a fresh bin card at destination. (Sheet 'Transfers' in the Assets template.)",
              },
            ].map((t) => (
              <div key={t.key} className="rounded-lg border bg-card p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
                      <t.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="font-semibold">{t.title}</div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <a href={t.file} download><Download className="h-3.5 w-3.5 mr-1" />.xlsx</a>
                  </Button>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <div className="font-medium text-foreground mb-1">Required</div>
                    <div className="flex flex-wrap gap-1">
                      {t.required.map((c) => <Badge key={c} variant="default" className="font-mono text-[10px]">{c}</Badge>)}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-foreground mb-1">Optional</div>
                    <div className="flex flex-wrap gap-1">
                      {t.optional.map((c) => <Badge key={c} variant="secondary" className="font-mono text-[10px]">{c}</Badge>)}
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 pt-1 border-t text-muted-foreground">
                    <Link2 className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{t.links}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Alert>
            <Link2 className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <b>Recommended order:</b> Employees → Assets → Licenses → Transfers. Column names are case-insensitive (spaces → underscores).
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>1. Upload files</CardTitle>
          <CardDescription>Supports .zip, .xlsx, .xls, .csv (multiple)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label htmlFor="upload" className="block">
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 cursor-pointer transition">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Click to upload or drag files</p>
              <p className="text-xs text-muted-foreground mt-1">ZIP archives are auto-extracted</p>
            </div>
          </Label>
          <Input id="upload" type="file" multiple accept=".zip,.xlsx,.xls,.csv" className="hidden" onChange={onUpload} disabled={parsing} />
          {parsing && <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Parsing…</div>}
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>2. Preview &amp; link ({files.length} files, {totalRows} rows)</CardTitle>
                <CardDescription>
                  Preview row-by-row. Click any row to expand the column → field mapping. Choose how to handle duplicates per sheet, then import.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={runPreview} disabled={previewing} variant="outline">
                  {previewing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  Preview linking
                </Button>
                <Button onClick={runImport} disabled={importing}>
                  {importing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <CheckCircle2 className="h-4 w-4 mr-2" />Import all
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={files[0]?.filename}>
              <TabsList className="flex-wrap h-auto">
                {files.map((f) => (
                  <TabsTrigger key={f.filename} value={f.filename} className="text-xs">
                    <FileSpreadsheet className="h-3 w-3 mr-1" />{f.filename.split("/").pop()}
                  </TabsTrigger>
                ))}
              </TabsList>
              {files.map((f) => (
                <TabsContent key={f.filename} value={f.filename} className="space-y-4">
                  {f.sheets.map((sh) => {
                    const kind = classifySheet(sh.rows, sh.name);
                    const previewKey = `${f.filename}::${sh.name}`;
                    const dr = previews[previewKey];
                    const preview = sh.rows.slice(0, 5);
                    const cols = preview[0] ? Object.keys(preview[0]).slice(0, 6) : [];
                    const strategy = dupStrategies[previewKey] || "skip";
                    const supportsDup = kind === "employee" || kind === "asset" || kind === "license";
                    return (
                      <div key={sh.name} className="border rounded-md">
                        <div className="px-3 py-2 bg-muted/50 flex items-center justify-between text-sm flex-wrap gap-2">
                          <div><b>{sh.name}</b> · {sh.rows.length} rows</div>
                          <div className="flex items-center gap-2">
                            {dr && (
                              <>
                                <Badge variant="default" className="font-mono text-[10px]">✓ {dr.okCount} ok</Badge>
                                {dr.duplicateCount > 0 && <Badge variant="secondary" className="font-mono text-[10px]">⊘ {dr.duplicateCount} dup</Badge>}
                                {dr.warningCount > 0 && <Badge variant="outline" className="font-mono text-[10px] border-warning text-warning">⚠ {dr.warningCount} warn</Badge>}
                                {dr.errorCount > 0 && <Badge variant="destructive" className="font-mono text-[10px]">✗ {dr.errorCount} err</Badge>}
                              </>
                            )}
                            <Badge variant={kind === "unknown" ? "secondary" : "default"}>{kind}</Badge>
                          </div>
                        </div>

                        {dr && supportsDup && dr.duplicateCount > 0 && (
                          <div className="px-3 py-2 border-b bg-muted/20">
                            <div className="text-xs font-medium mb-1.5">
                              {dr.duplicateCount} duplicate{dr.duplicateCount === 1 ? "" : "s"} detected — choose how to handle them:
                            </div>
                            <RadioGroup
                              value={strategy}
                              onValueChange={(v) => setDupStrategies((prev) => ({ ...prev, [previewKey]: v as DuplicateStrategy }))}
                              className="flex gap-4 flex-wrap"
                            >
                              <label className="flex items-center gap-2 text-xs cursor-pointer">
                                <RadioGroupItem value="skip" id={`${previewKey}-skip`} />
                                <span><b>Skip</b> — leave existing record untouched</span>
                              </label>
                              <label className="flex items-center gap-2 text-xs cursor-pointer">
                                <RadioGroupItem value="update" id={`${previewKey}-update`} />
                                <span><b>Update</b> — overwrite existing fields with new values</span>
                              </label>
                            </RadioGroup>
                          </div>
                        )}

                        {dr ? (
                          <DryRunTable result={dr} />
                        ) : preview.length > 0 ? (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader><TableRow>{cols.map((c) => <TableHead key={c} className="text-xs">{c}</TableHead>)}</TableRow></TableHeader>
                              <TableBody>
                                {preview.map((row, i) => (
                                  <TableRow key={i}>{cols.map((c) => <TableCell key={c} className="text-xs">{String(row[c] ?? "")}</TableCell>)}</TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : <div className="p-4 text-sm text-muted-foreground">Empty sheet</div>}
                      </div>
                    );
                  })}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {hasPreview && Object.values(previews).some((p) => p.errorCount > 0 || p.warningCount > 0) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Rows flagged <b>error</b> will be skipped. Rows flagged <b>warning</b> (e.g. mobile without IMEI, unknown employee name) will still import — they'll be created as unlinked/incomplete.
          </AlertDescription>
        </Alert>
      )}

      {Object.keys(stats).length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>3. Import results</CardTitle>
              {allFailedRows.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => downloadCsv(
                  `import_errors_${Date.now()}.csv`,
                  allFailedRows.map(({ source, err }) => ({ source, row_number: err.row, column: err.column, message: err.message })),
                )}>
                  <Download className="h-3.5 w-3.5 mr-1" />Download error report
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats).map(([key, s]) => (
              <Alert key={key} variant={s.errors.length > 0 ? "destructive" : "default"}>
                {s.errors.length > 0 ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                <AlertDescription>
                  <div className="font-medium">{key}</div>
                  <div className="text-sm">
                    ✓ {s.inserted} new · ↻ {s.updated} updated · {s.skipped} skipped · {s.errors.length} failed
                  </div>
                  {s.errors.slice(0, 5).map((e, i) => (
                    <div key={i} className="text-xs mt-1 opacity-90 font-mono">• Row {e.row} [{e.column}]: {e.message}</div>
                  ))}
                  {s.errors.length > 5 && <div className="text-xs mt-1 opacity-70">…and {s.errors.length - 5} more — download the report above</div>}
                </AlertDescription>
              </Alert>
            ))}
            <div className="text-xs text-muted-foreground pt-2">
              This run was saved to <Link to="/import/history" className="underline">Import History</Link> — you can roll it back from there.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// =================== Preview row component with expandable mapping ===================
function DryRunTable({ result }: { result: DryRunResult }) {
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const rows = showAll ? result.rows : result.rows.slice(0, 10);
  const statusVariant = (s: string) => {
    if (s === "ok") return "default" as const;
    if (s === "duplicate") return "secondary" as const;
    if (s === "warning") return "outline" as const;
    return "destructive" as const;
  };
  const toggle = (n: number) => {
    const next = new Set(expanded);
    if (next.has(n)) next.delete(n); else next.add(n);
    setExpanded(next);
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 text-xs"></TableHead>
              <TableHead className="w-12 text-xs">Row</TableHead>
              <TableHead className="text-xs">Identifier</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Will link to</TableHead>
              <TableHead className="text-xs">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const isOpen = expanded.has(r.rowNumber);
              return (
                <Fragment key={r.rowNumber}>
                  <TableRow
                    onClick={() => toggle(r.rowNumber)}
                    className="cursor-pointer"
                  >
                    <TableCell className="px-2">
                      {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{r.rowNumber}</TableCell>
                    <TableCell className="text-xs font-mono max-w-[200px] truncate">{r.identifier}</TableCell>
                    <TableCell><Badge variant={statusVariant(r.status)} className="text-[10px]">{r.status}</Badge></TableCell>
                    <TableCell className="text-xs">
                      {r.willLinkTo ? (
                        <span className="inline-flex items-center gap-1"><Link2 className="h-3 w-3 text-primary" />{r.willLinkTo}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.errors.map((e, i) => <div key={`e${i}`} className="text-destructive">✗ {e}</div>)}
                      {r.warnings.map((w, i) => <div key={`w${i}`} className="text-warning">⚠ {w}</div>)}
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={6} className="py-3">
                        <MappingDetail row={r} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {result.rows.length > 10 && (
        <div className="px-3 py-2 border-t text-center">
          <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>
            {showAll ? "Show first 10 only" : `Show all ${result.rows.length} rows`}
          </Button>
        </div>
      )}
    </div>
  );
}

function MappingDetail({ row }: { row: DryRunRow }) {
  return (
    <div className="space-y-3 px-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Column → Field mapping (row {row.rowNumber})
      </div>
      {row.mappings.length === 0 ? (
        <div className="text-xs text-muted-foreground italic">No fields could be matched from this row.</div>
      ) : (
        <div className="border rounded-md bg-background overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] uppercase">Source column</TableHead>
                <TableHead className="text-[10px] uppercase">Mapped to field</TableHead>
                <TableHead className="text-[10px] uppercase">Raw value</TableHead>
                <TableHead className="text-[10px] uppercase">Resolved value</TableHead>
                <TableHead className="text-[10px] uppercase">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {row.mappings.map((m, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs font-mono">{m.sourceColumn}</TableCell>
                  <TableCell className="text-xs font-mono text-primary">{m.field}</TableCell>
                  <TableCell className="text-xs max-w-[160px] truncate" title={String(m.rawValue ?? "")}>
                    {String(m.rawValue ?? "—")}
                  </TableCell>
                  <TableCell className="text-xs max-w-[160px] truncate" title={String(m.resolvedValue ?? "")}>
                    {String(m.resolvedValue ?? "—")}
                  </TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">{m.resolutionNote || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
