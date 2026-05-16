import { useState, useMemo } from "react";
import { useAuditLogV2, AuditLogV2Row } from "@/hooks/useSupabaseData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { exportCSV, exportJSON, exportXLSX, exportPDF, printTable, ExportColumn } from "@/lib/exporters";
import { toast } from "@/hooks/use-toast";
import {
  Search, History, User, Calendar, Package, Plus, Edit3, Trash2, ArrowRight,
  Download, Eye, FileSpreadsheet, FileText, Printer, X, MapPin, Building2,
  Key, Globe, Loader2,
} from "lucide-react";

// Only the fields the audit_log table actually stores. No fake severity /
// device / browser / OS / tags — those were hardcoded placeholders before.
interface AuditEntry {
  id: string;
  timestamp: string;
  date: string;
  time: string;
  user: string;
  userId: string;
  userRole: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  tableLabel: string;
  recordId: string;
  recordName: string;
  recordCode: string;
  description: string;
  changes: { field: string; fieldLabel: string; oldValue: string; newValue: string }[];
  ipAddress: string;
  userAgent: string;
  notes: string;
}

function rowToEntry(r: AuditLogV2Row): AuditEntry {
  const ts = new Date(r.created_at);
  const date = ts.toLocaleDateString("en-CA"); // YYYY-MM-DD, locale-stable
  const time = ts.toLocaleTimeString("en-GB"); // HH:MM:SS
  const tableLabel = r.table_name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const oldVals = (r.old_values ?? {}) as Record<string, unknown>;
  const newVals = (r.new_values ?? {}) as Record<string, unknown>;
  const fieldKeys =
    r.changed_fields && r.changed_fields.length > 0
      ? r.changed_fields
      : Array.from(new Set([...Object.keys(oldVals), ...Object.keys(newVals)]));

  const changes = fieldKeys
    // Skip noise fields that change on every write
    .filter((f) => !["updated_at", "created_at"].includes(f))
    .map((field) => ({
      field,
      fieldLabel: field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      oldValue: oldVals[field] == null ? "" : String(oldVals[field]),
      newValue: newVals[field] == null ? "" : String(newVals[field]),
    }));

  const recName = (newVals.name ?? oldVals.name ?? newVals.full_name ?? oldVals.full_name ?? r.record_id) as string;
  const recCode = (newVals.sap_code ?? oldVals.sap_code ?? newVals.code ?? oldVals.code ?? "") as string;

  return {
    id: r.id,
    timestamp: r.created_at,
    date,
    time,
    user: r.user_name ?? "System",
    userId: r.user_id ?? "",
    userRole: r.user_role ?? "",
    action: r.action,
    table: r.table_name,
    tableLabel,
    recordId: r.record_id,
    recordName: String(recName ?? r.record_id),
    recordCode: String(recCode ?? ""),
    description: r.notes ?? `${r.action} on ${tableLabel}`,
    changes,
    ipAddress: r.ip_address ?? "",
    userAgent: r.user_agent ?? "",
    notes: r.notes ?? "",
  };
}

// Relative date-range presets → server-side `from` ISO date (or undefined = no bound)
const DATE_PRESETS: Record<string, number | null> = {
  "1": 1,
  "7": 7,
  "30": 30,
  "90": 90,
  all: null,
  custom: null,
};

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
}

const TABLE_ICON: Record<string, typeof Package> = {
  assets: Package,
  employees: User,
  locations: MapPin,
  licenses: Key,
  vendors: Building2,
  companies: Globe,
  custom_reminders: Calendar,
};

export default function AuditTrailPage() {
  const [search, setSearch] = useState("");
  const [tableFilter, setTableFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState<"all" | "INSERT" | "UPDATE" | "DELETE">("all");
  const [userFilter, setUserFilter] = useState("all");
  const [dateRange, setDateRange] = useState("30"); // default: last 30 days
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  // Date + table + action are pushed SERVER-SIDE so we aren't silently
  // capped at the 500 most-recent rows of ALL history.
  const serverFilters = useMemo(() => {
    let from: string | undefined;
    let to: string | undefined;
    if (dateRange === "custom") {
      from = startDate || undefined;
      to = endDate || undefined;
    } else {
      const days = DATE_PRESETS[dateRange];
      if (days != null) from = isoDaysAgo(days);
    }
    return {
      table: tableFilter,
      action: actionFilter === "all" ? undefined : actionFilter,
      from,
      to,
      limit: 1000,
    };
  }, [tableFilter, actionFilter, dateRange, startDate, endDate]);

  const { data: rows = [], isLoading, error, isFetching } = useAuditLogV2(serverFilters);
  const auditData: AuditEntry[] = useMemo(() => rows.map(rowToEntry), [rows]);

  // Filter dropdowns are derived from the ACTUAL loaded data, not a hardcoded list
  const tableOptions = useMemo(
    () => Array.from(new Set(auditData.map((e) => e.table))).sort(),
    [auditData],
  );
  const uniqueUsers = useMemo(() => {
    const m = new Map<string, { id: string; name: string; role: string }>();
    auditData.forEach((e) => {
      const key = e.user || e.userId;
      if (key && !m.has(key)) m.set(key, { id: key, name: e.user, role: e.userRole });
    });
    return Array.from(m.values());
  }, [auditData]);

  // Search + user are refined CLIENT-SIDE for instant feedback (no refetch)
  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    return auditData.filter((entry) => {
      const matchesSearch =
        !q ||
        entry.recordName.toLowerCase().includes(q) ||
        entry.recordCode.toLowerCase().includes(q) ||
        entry.user.toLowerCase().includes(q) ||
        entry.tableLabel.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.ipAddress.includes(search.trim());
      const matchesUser = userFilter === "all" || entry.user === userFilter || entry.userId === userFilter;
      return matchesSearch && matchesUser;
    });
  }, [auditData, search, userFilter]);

  const activeFilters = useMemo(() => {
    const chips: { label: string; clear: () => void }[] = [];
    if (search.trim()) chips.push({ label: `“${search.trim()}”`, clear: () => setSearch("") });
    if (tableFilter !== "all") chips.push({ label: `Table: ${tableFilter}`, clear: () => setTableFilter("all") });
    if (actionFilter !== "all")
      chips.push({ label: `Action: ${actionFilter}`, clear: () => setActionFilter("all") });
    if (userFilter !== "all") chips.push({ label: `User: ${userFilter}`, clear: () => setUserFilter("all") });
    if (dateRange !== "30")
      chips.push({
        label:
          dateRange === "custom"
            ? `${startDate || "…"} → ${endDate || "…"}`
            : dateRange === "all"
            ? "All time"
            : `Last ${dateRange}d`,
        clear: () => { setDateRange("30"); setStartDate(""); setEndDate(""); },
      });
    return chips;
  }, [search, tableFilter, actionFilter, userFilter, dateRange, startDate, endDate]);

  const clearAll = () => {
    setSearch("");
    setTableFilter("all");
    setActionFilter("all");
    setUserFilter("all");
    setDateRange("30");
    setStartDate("");
    setEndDate("");
  };

  // ── Export ──────────────────────────────────────────────────────────────
  const exportCols: ExportColumn<AuditEntry>[] = [
    { key: "timestamp", label: "Timestamp", width: 22 },
    { key: "user", label: "User", width: 24 },
    { key: "userRole", label: "Role", width: 12 },
    { key: "action", label: "Action", width: 10 },
    { key: "tableLabel", label: "Table", width: 16 },
    { key: "recordName", label: "Record", width: 28 },
    { key: "recordCode", label: "Code", width: 16 },
    { key: "description", label: "Description", width: 36 },
    {
      key: "changes",
      label: "Changes",
      width: 50,
      get: (r) => r.changes.map((c) => `${c.fieldLabel}: ${c.oldValue || "(empty)"} → ${c.newValue || "(empty)"}`).join("; "),
    },
    { key: "ipAddress", label: "IP Address", width: 16 },
    { key: "notes", label: "Notes", width: 30 },
  ];

  const handleExport = async (format: "csv" | "json" | "xlsx" | "pdf" | "print") => {
    if (filteredData.length === 0) {
      toast({ title: "Nothing to export", description: "No rows match the current filters.", variant: "destructive" });
      return;
    }
    try {
      switch (format) {
        case "csv": exportCSV(filteredData, exportCols, "audit_trail"); break;
        case "json": exportJSON(filteredData, "audit_trail"); break;
        case "xlsx": await exportXLSX(filteredData, exportCols, "audit_trail", "Audit Trail"); break;
        case "pdf": await exportPDF(filteredData, exportCols, "audit_trail", "Audit Trail Report", `${filteredData.length} events — ${new Date().toLocaleDateString()}`); break;
        case "print": printTable(filteredData, exportCols, "Audit Trail Report", `${filteredData.length} events`); break;
      }
      toast({ title: "Export ready", description: `${filteredData.length} rows exported as ${format.toUpperCase()}.` });
    } catch (err) {
      toast({ title: "Export failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  const actionBadge = (action: string) => {
    if (action === "INSERT")
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-300"><Plus className="h-3 w-3 mr-1" />Created</Badge>;
    if (action === "UPDATE")
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-300"><Edit3 className="h-3 w-3 mr-1" />Updated</Badge>;
    if (action === "DELETE")
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-300"><Trash2 className="h-3 w-3 mr-1" />Deleted</Badge>;
    return <Badge variant="secondary">{action}</Badge>;
  };

  const TableIcon = (table: string) => {
    const Icon = TABLE_ICON[table] ?? History;
    return <Icon className="h-4 w-4 text-accent" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader><CardTitle className="text-destructive">Could not load audit log</CardTitle></CardHeader>
        <CardContent>
          <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">{(error as Error).message}</pre>
          <p className="text-sm text-muted-foreground mt-2">
            Make sure <code>SETUP_BIN_CARDS_SAFE.sql</code> has been run in the Supabase SQL Editor.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6 text-accent" /> Audit Trail
          </h1>
          <p className="text-muted-foreground text-sm">
            {auditData.length === 0
              ? "No audit events in this range — widen the date filter or take some actions in the app."
              : `${filteredData.length} of ${auditData.length} event${auditData.length === 1 ? "" : "s"} in range`}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline"><Download className="h-4 w-4 mr-2" />Export</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Download {filteredData.length} row{filteredData.length === 1 ? "" : "s"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => handleExport("xlsx")}><FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />Excel (.xlsx)</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleExport("pdf")}><FileText className="h-4 w-4 mr-2 text-red-600" />PDF (.pdf)</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleExport("csv")}><FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />CSV (.csv)</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleExport("json")}><FileText className="h-4 w-4 mr-2 text-blue-600" />JSON (.json)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => handleExport("print")}><Printer className="h-4 w-4 mr-2 text-purple-600" />Print</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Compact filter bar — every control here actually works */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px] space-y-1">
              <label className="text-xs text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Record, user, code, IP, description…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            <div className="space-y-1 w-[150px]">
              <label className="text-xs text-muted-foreground">Table</label>
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tables</SelectItem>
                  {tableOptions.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 w-[140px]">
              <label className="text-xs text-muted-foreground">Action</label>
              <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as typeof actionFilter)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  <SelectItem value="INSERT">Created</SelectItem>
                  <SelectItem value="UPDATE">Updated</SelectItem>
                  <SelectItem value="DELETE">Deleted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 w-[170px]">
              <label className="text-xs text-muted-foreground">User</label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {uniqueUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}{u.role ? ` (${u.role})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 w-[150px]">
              <label className="text-xs text-muted-foreground">Date range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 24 hours</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === "custom" && (
              <>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">From</label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">To</label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
                </div>
              </>
            )}

            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mb-2.5" />}
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">Active:</span>
              {activeFilters.map((f, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                  {f.label}
                  <button onClick={f.clear} className="ml-0.5 rounded-full hover:bg-background/60 p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearAll}>Clear all</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total" value={filteredData.length} icon={History} color="bg-accent/10 text-accent" />
        <StatCard title="Created" value={filteredData.filter((e) => e.action === "INSERT").length} icon={Plus} color="bg-green-100 text-green-700" />
        <StatCard title="Updated" value={filteredData.filter((e) => e.action === "UPDATE").length} icon={Edit3} color="bg-blue-100 text-blue-700" />
        <StatCard title="Deleted" value={filteredData.filter((e) => e.action === "DELETE").length} icon={Trash2} color="bg-red-100 text-red-700" />
      </div>

      {/* Log table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-accent" /> Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider w-[180px]">Timestamp</th>
                  <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider w-[110px]">Action</th>
                  <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider">Table</th>
                  <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider">Record</th>
                  <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider w-[90px]">Changes</th>
                  <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider w-[70px]">View</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredData.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-mono text-xs whitespace-nowrap">{entry.date} {entry.time}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                          <User className="h-3 w-3 text-accent" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{entry.user}</p>
                          {entry.userRole && <p className="text-xs text-muted-foreground capitalize">{entry.userRole}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">{actionBadge(entry.action)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {TableIcon(entry.table)}
                        <span className="capitalize text-sm">{entry.table.replace(/_/g, " ")}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-sm">{entry.recordName}</p>
                      {entry.recordCode && <p className="text-xs text-muted-foreground font-mono">{entry.recordCode}</p>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {entry.changes.length > 0 ? (
                        <Badge variant="secondary">{entry.changes.length} field{entry.changes.length > 1 ? "s" : ""}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedEntry(entry)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                      <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>No audit entries match these filters</p>
                      {activeFilters.length > 0 && (
                        <Button variant="link" size="sm" onClick={clearAll}>Clear filters</Button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail dialog — real fields only */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEntry && actionBadge(selectedEntry.action)}
              Audit Entry
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-5 py-2 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Field label="Date">{selectedEntry.date}</Field>
                <Field label="Time">{selectedEntry.time}</Field>
                <Field label="Table">
                  <span className="flex items-center gap-1.5">
                    {TableIcon(selectedEntry.table)}
                    <span className="capitalize">{selectedEntry.table.replace(/_/g, " ")}</span>
                  </span>
                </Field>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2"><Package className="h-4 w-4 text-accent" />Record</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name">{selectedEntry.recordName}</Field>
                  <Field label="Code">{selectedEntry.recordCode || "—"}</Field>
                  <Field label="Record ID" mono>{selectedEntry.recordId}</Field>
                  <Field label="Description">{selectedEntry.description}</Field>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2"><User className="h-4 w-4 text-accent" />Who & where</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="User">{selectedEntry.user}</Field>
                  <Field label="Role">{selectedEntry.userRole || "—"}</Field>
                  <Field label="User ID" mono>{selectedEntry.userId || "—"}</Field>
                  <Field label="IP Address" mono>{selectedEntry.ipAddress || "—"}</Field>
                  {selectedEntry.userAgent && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">User Agent</p>
                      <p className="text-xs text-muted-foreground break-all">{selectedEntry.userAgent}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedEntry.changes.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Field changes ({selectedEntry.changes.length})</h4>
                  <div className="space-y-3">
                    {selectedEntry.changes.map((change, idx) => (
                      <div key={idx} className="bg-muted/30 rounded-lg p-3">
                        <p className="font-medium text-sm mb-2">{change.fieldLabel}</p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-red-50 rounded p-2 min-w-0">
                            <p className="text-xs text-red-600 mb-1">Old</p>
                            <p className="text-red-700 line-through break-words">{change.oldValue || "—"}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 bg-green-50 rounded p-2 min-w-0">
                            <p className="text-xs text-green-600 mb-1">New</p>
                            <p className="text-green-700 font-medium break-words">{change.newValue || "—"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedEntry.notes && (
                <div className="border rounded-lg p-4 bg-yellow-50/50">
                  <h4 className="font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4 text-accent" />Notes</h4>
                  <p>{selectedEntry.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="bg-muted/30 rounded-lg p-3">
      <p className="text-muted-foreground text-xs uppercase mb-1">{label}</p>
      <p className={mono ? "font-mono text-xs break-all" : "font-medium break-words"}>{children}</p>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) {
  return (
    <Card className="border-0">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
