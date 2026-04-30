import { useState, useMemo } from "react";
import { useAuditLog, AuditFilters } from "@/hooks/useSupabaseData";
import { useCompanies, useDepartments, useLocations } from "@/hooks/useSupabaseData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Download, Filter, X, Search } from "lucide-react";
import {
  ArrowRightLeft, PackagePlus, UserCheck, UserMinus, Wrench,
  AlertTriangle, CheckCircle2, ShoppingCart, Pencil, Trash2, User,
} from "lucide-react";

const ENTITY_TYPES = [
  { value: "all",               label: "All Entities" },
  { value: "asset",             label: "Assets (tangible)" },
  { value: "asset_transaction", label: "Asset Transactions" },
  { value: "employee",          label: "Employees" },
  { value: "license",           label: "Licenses (intangible)" },
];

const ACTIONS = [
  { value: "all",              label: "All Actions" },
  { value: "created",          label: "Created" },
  { value: "updated",          label: "Updated" },
  { value: "deleted",          label: "Deleted" },
  { value: "deactivated",      label: "Deactivated" },
  { value: "allocation",       label: "Allocated" },
  { value: "return",           label: "Returned" },
  { value: "transfer",         label: "Transferred" },
  { value: "maintenance_start",label: "Maintenance Started" },
  { value: "maintenance_end",  label: "Maintenance Ended" },
];

const ICON_MAP: Record<string, React.ElementType> = {
  created:          PackagePlus,
  updated:          Pencil,
  deleted:          Trash2,
  deactivated:      Trash2,
  allocation:       UserCheck,
  return:           UserMinus,
  transfer:         ArrowRightLeft,
  maintenance_start:Wrench,
  maintenance_end:  CheckCircle2,
  lost:             AlertTriangle,
  damaged:          AlertTriangle,
  scrapped:         AlertTriangle,
  purchase:         ShoppingCart,
  employee:         User,
};

const COLOR_MAP: Record<string, string> = {
  created:          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  updated:          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  deleted:          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  deactivated:      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  allocation:       "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  return:           "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  transfer:         "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  maintenance_start:"bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  maintenance_end:  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  lost:             "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  damaged:          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  scrapped:         "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function actionLabel(a: string) {
  return ACTIONS.find(x => x.value === a)?.label ?? a.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function entityLabel(e: string) {
  return ENTITY_TYPES.find(x => x.value === e)?.label ?? e;
}

function downloadCSV(rows: any[]) {
  const cols = ["created_at","entity_type","entity_code","entity_name","action","actor_username","company_name","department_name","location_name","employee_name","notes"];
  const header = cols.join(",");
  const lines = rows.map(r =>
    cols.map(c => JSON.stringify(r[c] ?? "")).join(",")
  );
  const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-trail-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ActivityPage() {
  const { data: companies }   = useCompanies();
  const { data: departments } = useDepartments();
  const { data: locations }   = useLocations();

  const [search,      setSearch]      = useState("");
  const [entityType,  setEntityType]  = useState("all");
  const [action,      setAction]      = useState("all");
  const [company,     setCompany]     = useState("all");
  const [department,  setDepartment]  = useState("all");
  const [location,    setLocation]    = useState("all");
  const [from,        setFrom]        = useState("");
  const [to,          setTo]          = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const filters: AuditFilters = useMemo(() => ({
    entityType:     entityType !== "all" ? entityType : undefined,
    action:         action !== "all" ? action : undefined,
    companyName:    company !== "all" ? company : undefined,
    departmentName: department !== "all" ? department : undefined,
    locationName:   location !== "all" ? location : undefined,
    search:         search || undefined,
    from:           from || undefined,
    to:             to || undefined,
    limit:          500,
  }), [entityType, action, company, department, location, search, from, to]);

  const { data: entries = [], isLoading } = useAuditLog(filters);

  const activeFilterCount = [
    entityType !== "all", action !== "all", company !== "all",
    department !== "all", location !== "all", !!from, !!to,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setEntityType("all"); setAction("all"); setCompany("all");
    setDepartment("all"); setLocation("all"); setFrom(""); setTo("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Trail</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Complete history of every change across all assets, employees, and licenses
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(v => !v)} className="gap-1.5">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadCSV(entries)} disabled={entries.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {/* Search bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by asset code, name, employee, username…"
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
                  <X className="h-3 w-3" /> Clear
                </Button>
              )}
            </div>

            {/* Advanced filters */}
            {showFilters && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2 border-t">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Entity Type</label>
                  <Select value={entityType} onValueChange={setEntityType}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENTITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Action</label>
                  <Select value={action} onValueChange={setAction}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Company</label>
                  <Select value={company} onValueChange={setCompany}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      {(companies ?? []).map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Department</label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {(departments ?? []).map((d: any) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Location</label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {(locations ?? []).map((l: any) => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">From date</label>
                  <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">To date</label>
                  <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats bar */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{entries.length}</span>
        <span>event{entries.length !== 1 ? "s" : ""}</span>
        {activeFilterCount > 0 && <span className="text-xs">(filtered)</span>}
      </div>

      {/* Timeline */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && entries.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <PackagePlus className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No activity found.</p>
            <p className="text-xs text-muted-foreground/60">
              Transactions will appear here as assets, employees, and licenses are created and modified.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && entries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">{entries.length} event{entries.length !== 1 ? "s" : ""}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-px bg-border" />
              <ul className="space-y-0">
                {entries.map((entry, idx) => {
                  const Icon = ICON_MAP[entry.action] ?? PackagePlus;
                  const colorClass = COLOR_MAP[entry.action] ?? "bg-muted text-muted-foreground";
                  return (
                    <li key={entry.id}
                      className={`flex gap-4 px-4 py-3 ${idx !== entries.length - 1 ? "border-b" : ""}`}>
                      <div className="relative z-10 flex-shrink-0 mt-0.5">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{entry.entity_name || "—"}</span>
                          {entry.entity_code && (
                            <span className="text-xs text-muted-foreground font-mono">{entry.entity_code}</span>
                          )}
                          <Badge variant="outline" className="text-xs">{actionLabel(entry.action)}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{entityLabel(entry.entity_type)}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                          {entry.actor_username && (
                            <span>By: <span className="text-foreground">@{entry.actor_username}</span></span>
                          )}
                          {entry.employee_name && (
                            <span>Employee: <span className="text-foreground">{entry.employee_name}</span></span>
                          )}
                          {entry.location_name && (
                            <span>Location: <span className="text-foreground">{entry.location_name}</span></span>
                          )}
                          {entry.department_name && (
                            <span>Dept: <span className="text-foreground">{entry.department_name}</span></span>
                          )}
                          {entry.company_name && (
                            <span>Company: <span className="text-foreground">{entry.company_name}</span></span>
                          )}
                          {entry.notes && <span className="italic">{entry.notes}</span>}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-xs text-muted-foreground whitespace-nowrap mt-0.5">
                        {format(new Date(entry.created_at), "dd MMM yyyy, HH:mm")}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
