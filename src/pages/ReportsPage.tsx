import { useState, useMemo } from "react";
import {
  useAssets, useEmployees, useLicenses,
  useCompanies, useDepartments, useLocations,
} from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, Users, Package, Key, AlertTriangle } from "lucide-react";
import { format, addDays } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── CSV helper ──────────────────────────────────────────────────────────────
function exportCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (v: any) => JSON.stringify(v ?? "");
  const content = [headers.map(escape).join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `${filename}-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF helper ───────────────────────────────────────────────────────────────
function exportPDF(title: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14); doc.text(title, 14, 16);
  doc.setFontSize(9); doc.setTextColor(100);
  doc.text(`Generated: ${format(new Date(), "dd MMM yyyy HH:mm")} — TSI Asset Management`, 14, 23);
  autoTable(doc, {
    head: [headers],
    body: rows.map(r => r.map(v => v ?? "—")),
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
  });
  doc.save(`${title.replace(/\s+/g, "-").toLowerCase()}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

// ─── Shared filter panel ──────────────────────────────────────────────────────
interface Filters { company: string; department: string; location: string; employee: string; status: string; dateFrom: string; dateTo: string; }
const EMPTY_FILTERS: Filters = { company: "all", department: "all", location: "all", employee: "all", status: "all", dateFrom: "", dateTo: "" };

function FilterPanel({ filters, setFilters, companies, departments, locations, employees, showStatus = false, showEmployee = false }: {
  filters: Filters; setFilters: (f: Filters) => void;
  companies: any[]; departments: any[]; locations: any[]; employees: any[];
  showStatus?: boolean; showEmployee?: boolean;
}) {
  const update = (k: keyof Filters, v: string) => setFilters({ ...filters, [k]: v });
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 bg-muted/30 rounded-lg border">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Company</label>
        <Select value={filters.company} onValueChange={v => update("company", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Department</label>
        <Select value={filters.department} onValueChange={v => update("department", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Location</label>
        <Select value={filters.location} onValueChange={v => update("location", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {showEmployee && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Employee</label>
          <Select value={filters.employee} onValueChange={v => update("employee", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      {showStatus && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Status</label>
          <Select value={filters.status} onValueChange={v => update("status", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["all","available","allocated","under_maintenance","lost","damaged","scrapped"].map(s =>
                <SelectItem key={s} value={s}>{s === "all" ? "All Statuses" : s.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">From date</label>
        <Input type="date" value={filters.dateFrom} onChange={e => update("dateFrom", e.target.value)} className="h-8 text-xs" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">To date</label>
        <Input type="date" value={filters.dateTo} onChange={e => update("dateTo", e.target.value)} className="h-8 text-xs" />
      </div>
      <div className="flex items-end">
        <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground"
          onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</Button>
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: ASSETS REPORT
// ═══════════════════════════════════════════════════════════════════════════════
function AssetsReport({ companies, departments, locations, employees }: any) {
  const { data: assets = [] } = useAssets();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return (assets as any[]).filter(a => {
      if (filters.company !== "all" && a.company_id !== filters.company) return false;
      if (filters.department !== "all" && a.department_id !== filters.department) return false;
      if (filters.location !== "all" && a.current_location_id !== filters.location) return false;
      if (filters.employee !== "all" && a.current_employee_id !== filters.employee) return false;
      if (filters.status !== "all" && a.status !== filters.status) return false;
      if (filters.dateFrom && a.purchase_date && a.purchase_date < filters.dateFrom) return false;
      if (filters.dateTo && a.purchase_date && a.purchase_date > filters.dateTo) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!a.sap_code?.toLowerCase().includes(q) && !a.name?.toLowerCase().includes(q) &&
            !a.employees?.name?.toLowerCase().includes(q) && !a.serial_number?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [assets, filters, search]);

  const totalValue = filtered.reduce((s: number, a: any) => s + (Number(a.purchase_cost) || 0), 0);
  const allocated  = filtered.filter((a: any) => a.status === "allocated").length;

  const toPdfRows = () => filtered.map((a: any) => [
    a.sap_code, a.bin_card_no, a.name,
    a.asset_subtype?.replace(/_/g," ") || "—",
    a.serial_number || "—",
    a.status?.replace(/_/g," "),
    a.employees?.name || "—",
    a.locations?.name || "—",
    a.departments?.name || a.companies?.name || "—",
    a.purchase_cost ? `₹${Number(a.purchase_cost).toLocaleString()}` : "—",
    a.warranty_end || "—",
  ]);

  return (
    <div className="space-y-4">
      <FilterPanel filters={filters} setFilters={setFilters}
        companies={companies} departments={departments} locations={locations} employees={employees}
        showStatus showEmployee />
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-xs">
          <Input placeholder="Search SAP, name, employee, serial…" value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-sm" />
        </div>
        <Button size="sm" variant="outline" onClick={() => exportCSV("assets-report",
          ["SAP Code","Bin#","Name","Type","Serial","Status","Employee","Location","Dept/Company","Value","Warranty End"],
          toPdfRows()
        )}><Download className="h-3.5 w-3.5 mr-1" /> CSV</Button>
        <Button size="sm" variant="outline" onClick={() => exportPDF("Assets Report",
          ["SAP Code","Bin#","Name","Type","Serial","Status","Employee","Location","Dept","Value","Warranty End"],
          toPdfRows()
        )}><FileText className="h-3.5 w-3.5 mr-1" /> PDF</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Assets" value={filtered.length} />
        <StatCard label="Allocated" value={allocated} sub={`${filtered.length ? Math.round(allocated/filtered.length*100) : 0}% utilisation`} />
        <StatCard label="Available" value={filtered.filter((a:any)=>a.status==="available").length} />
        <StatCard label="Total Value" value={`₹${totalValue.toLocaleString()}`} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  {["SAP Code","Bin#","Asset Name","Type","Serial","Status","Employee","Location","Department","Value","Warranty"].map(h =>
                    <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((a: any) => (
                  <tr key={a.id} className="border-b border-border/50 hover:bg-muted/10">
                    <td className="py-2 px-3 font-mono font-semibold text-accent">{a.sap_code}</td>
                    <td className="py-2 px-3 text-muted-foreground">{a.bin_card_no}</td>
                    <td className="py-2 px-3 font-medium max-w-[180px] truncate">{a.name}</td>
                    <td className="py-2 px-3 capitalize">{(a.asset_subtype||"other").replace(/_/g," ")}</td>
                    <td className="py-2 px-3 font-mono text-muted-foreground">{a.serial_number||"—"}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {a.status?.replace(/_/g," ")}
                      </Badge>
                    </td>
                    <td className="py-2 px-3">{a.employees?.name||"—"}</td>
                    <td className="py-2 px-3">{a.locations?.name||"—"}</td>
                    <td className="py-2 px-3">{a.departments?.name||"—"}</td>
                    <td className="py-2 px-3 text-right">{a.purchase_cost?`₹${Number(a.purchase_cost).toLocaleString()}`:"—"}</td>
                    <td className="py-2 px-3 text-muted-foreground">{a.warranty_end||"—"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={11} className="py-10 text-center text-muted-foreground">No assets match the selected filters.</td></tr>
                )}
              </tbody>
            </table>
            {filtered.length > 200 && (
              <p className="text-xs text-muted-foreground p-3">Showing first 200 of {filtered.length}. Export for full list.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: EMPLOYEE ASSETS
// ═══════════════════════════════════════════════════════════════════════════════
function EmployeeAssetsReport({ companies, departments, locations, employees }: any) {
  const { data: assets = [] } = useAssets();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const employeeRows = useMemo(() => {
    const empFiltered = (employees as any[]).filter(e => {
      if (filters.company !== "all" && e.company_id !== filters.company) return false;
      if (filters.department !== "all" && e.department_id !== filters.department) return false;
      if (filters.location !== "all" && e.location_id !== filters.location) return false;
      return true;
    });
    return empFiltered.map((e: any) => {
      const empAssets = (assets as any[]).filter(a => a.current_employee_id === e.id);
      return {
        ...e,
        assets: empAssets,
        assetCount: empAssets.length,
        assetValue: empAssets.reduce((s, a) => s + (Number(a.purchase_cost)||0), 0),
      };
    }).sort((a: any, b: any) => b.assetCount - a.assetCount);
  }, [employees, assets, filters]);

  const toPdfRows = () => employeeRows.flatMap((e: any) =>
    e.assets.length === 0
      ? [[e.employee_code, e.name, e.departments?.name || e.department || "—", e.locations?.name||"—", e.companies?.name||"—", "No assets", "—", "—", "—"]]
      : e.assets.map((a: any) => [
          e.employee_code, e.name, e.departments?.name || e.department || "—", e.locations?.name||"—", e.companies?.name||"—",
          a.sap_code, a.name, a.status?.replace(/_/g," ")||"—",
          a.purchase_cost ? `₹${Number(a.purchase_cost).toLocaleString()}` : "—",
        ])
  );

  return (
    <div className="space-y-4">
      <FilterPanel filters={filters} setFilters={setFilters}
        companies={companies} departments={departments} locations={locations} employees={employees} />
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={() => exportCSV("employee-assets",
          ["Emp Code","Name","Department","Location","Company","SAP Code","Asset Name","Status","Value"],
          toPdfRows()
        )}><Download className="h-3.5 w-3.5 mr-1" /> CSV</Button>
        <Button size="sm" variant="outline" onClick={() => exportPDF("Employee Assets Report",
          ["Emp Code","Name","Department","Location","Company","SAP Code","Asset Name","Status","Value"],
          toPdfRows()
        )}><FileText className="h-3.5 w-3.5 mr-1" /> PDF</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Employees" value={employeeRows.length} />
        <StatCard label="With Assets" value={employeeRows.filter((e:any)=>e.assetCount>0).length} />
        <StatCard label="Total Asset Value" value={`₹${employeeRows.reduce((s:number,e:any)=>s+e.assetValue,0).toLocaleString()}`} />
      </div>

      <div className="space-y-3">
        {employeeRows.map((e: any) => (
          <Card key={e.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold text-sm">{e.name?.[0]?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{e.name}</p>
                      <p className="text-xs text-muted-foreground">{e.departments?.name || e.department || "—"} · {e.employee_code}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{e.assetCount} asset{e.assetCount !== 1 ? "s" : ""}</p>
                  {e.assetValue > 0 && <p className="text-xs text-muted-foreground">₹{e.assetValue.toLocaleString()}</p>}
                </div>
              </div>
              {e.assets.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {e.assets.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between bg-muted/30 rounded px-2.5 py-1.5">
                      <div>
                        <p className="font-mono text-[10px] text-accent font-semibold">{a.sap_code}</p>
                        <p className="text-xs truncate max-w-[140px]">{a.name}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {a.status?.replace(/_/g," ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              {e.assets.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No assets assigned</p>
              )}
            </CardContent>
          </Card>
        ))}
        {employeeRows.length === 0 && (
          <p className="text-center text-muted-foreground py-10">No employees match the selected filters.</p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: LOCATION / DEPARTMENT / COMPANY SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════
function SummaryReport({ companies, departments, locations }: any) {
  const { data: assets = [] } = useAssets();
  const [groupBy, setGroupBy] = useState<"location"|"department"|"company">("department");

  const rows = useMemo(() => {
    const groups: Record<string, { label: string; count: number; allocated: number; value: number }> = {};
    (assets as any[]).forEach(a => {
      let key = "Unassigned";
      if (groupBy === "location") key = a.locations?.name || "Unassigned";
      else if (groupBy === "department") key = a.departments?.name || a.categories?.name || "Unassigned";
      else if (groupBy === "company") key = a.companies?.name || "Unassigned"; // note: no join yet, use company_id lookup
      if (!groups[key]) groups[key] = { label: key, count: 0, allocated: 0, value: 0 };
      groups[key].count++;
      if (a.status === "allocated") groups[key].allocated++;
      groups[key].value += Number(a.purchase_cost) || 0;
    });
    return Object.values(groups).sort((a, b) => b.count - a.count);
  }, [assets, groupBy]);

  const toPdfRows = () => rows.map(r => [
    r.label, r.count, r.allocated,
    r.count ? `${Math.round(r.allocated/r.count*100)}%` : "0%",
    `₹${r.value.toLocaleString()}`,
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Group by:</label>
        <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
          <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="department">Department</SelectItem>
            <SelectItem value="location">Location</SelectItem>
            <SelectItem value="company">Company</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2 ml-auto">
          <Button size="sm" variant="outline" onClick={() => exportCSV(`${groupBy}-summary`,
            [groupBy.charAt(0).toUpperCase()+groupBy.slice(1),"Total Assets","Allocated","Utilisation%","Total Value"],
            toPdfRows()
          )}><Download className="h-3.5 w-3.5 mr-1" /> CSV</Button>
          <Button size="sm" variant="outline" onClick={() => exportPDF(`${groupBy.charAt(0).toUpperCase()+groupBy.slice(1)} Summary`,
            [groupBy.charAt(0).toUpperCase()+groupBy.slice(1),"Total","Allocated","Utilisation%","Value"],
            toPdfRows()
          )}><FileText className="h-3.5 w-3.5 mr-1" /> PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Groups" value={rows.length} />
        <StatCard label="Total Assets" value={(assets as any[]).length} />
        <StatCard label="Total Allocated" value={(assets as any[]).filter((a:any)=>a.status==="allocated").length} />
        <StatCard label="Total Value" value={`₹${(assets as any[]).reduce((s,a:any)=>s+(Number(a.purchase_cost)||0),0).toLocaleString()}`} />
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground capitalize">{groupBy}</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Allocated</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Utilisation</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.label} className="border-b border-border/50 hover:bg-muted/10">
                  <td className="py-3 px-4 font-medium">{r.label}</td>
                  <td className="py-3 px-4 text-right">{r.count}</td>
                  <td className="py-3 px-4 text-right">{r.allocated}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-accent rounded-full"
                          style={{ width: `${r.count ? Math.round(r.allocated/r.count*100) : 0}%` }} />
                      </div>
                      <span className="text-xs">{r.count ? Math.round(r.allocated/r.count*100) : 0}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-muted-foreground">₹{r.value.toLocaleString()}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">No data available.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: EXPIRY ALERTS
// ═══════════════════════════════════════════════════════════════════════════════
function ExpiryReport() {
  const { data: assets = [] }   = useAssets();
  const { data: licenses = [] } = useLicenses();
  const [expiryDays, setExpiryDays] = useState("30");

  const today = new Date();
  const cutoff = addDays(today, parseInt(expiryDays)).toISOString().split("T")[0];
  const todayStr = today.toISOString().split("T")[0];

  const warranties = useMemo(() =>
    (assets as any[]).filter(a => a.warranty_end && a.warranty_end >= todayStr && a.warranty_end <= cutoff)
      .sort((a, b) => a.warranty_end.localeCompare(b.warranty_end)),
    [assets, cutoff, todayStr]
  );

  const licenseExpiries = useMemo(() =>
    (licenses as any[]).filter(l => l.validity_end && l.validity_end >= todayStr && l.validity_end <= cutoff)
      .sort((a, b) => a.validity_end.localeCompare(b.validity_end)),
    [licenses, cutoff, todayStr]
  );

  const toWarrantyRows = () => warranties.map(a => [
    a.sap_code, a.name, a.asset_subtype?.replace(/_/g," ")||"—",
    a.warranty_end, a.employees?.name||"—", a.locations?.name||"—",
  ]);

  const toLicenseRows = () => licenseExpiries.map(l => [
    l.license_type, l.product_name||l.email_id||"—", l.license_key||"—",
    l.validity_end, l.employees?.name||"—", l.companies?.name||"—",
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Expiring within:</label>
        <Select value={expiryDays} onValueChange={setExpiryDays}>
          <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="60">60 days</SelectItem>
            <SelectItem value="90">90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Warranties Expiring" value={warranties.length} sub={`within ${expiryDays} days`} />
        <StatCard label="Licenses Expiring" value={licenseExpiries.length} sub={`within ${expiryDays} days`} />
      </div>

      {/* Warranties */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Warranty Expiries ({warranties.length})
          </h3>
          {warranties.length > 0 && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => exportCSV("warranty-expiry",
                ["SAP Code","Name","Type","Expiry Date","Employee","Location"], toWarrantyRows()
              )}><Download className="h-3.5 w-3.5 mr-1" /> CSV</Button>
              <Button size="sm" variant="outline" onClick={() => exportPDF("Warranty Expiry Report",
                ["SAP Code","Name","Type","Expiry Date","Employee","Location"], toWarrantyRows()
              )}><FileText className="h-3.5 w-3.5 mr-1" /> PDF</Button>
            </div>
          )}
        </div>
        {warranties.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {["SAP Code","Asset Name","Type","Expiry","Assigned To","Location"].map(h =>
                      <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {warranties.map(a => {
                    const daysLeft = Math.round((new Date(a.warranty_end).getTime() - today.getTime()) / 86400000);
                    return (
                      <tr key={a.id} className="border-b border-border/50">
                        <td className="py-2 px-3 font-mono font-semibold text-accent">{a.sap_code}</td>
                        <td className="py-2 px-3 font-medium">{a.name}</td>
                        <td className="py-2 px-3 capitalize">{a.asset_subtype?.replace(/_/g," ")||"—"}</td>
                        <td className="py-2 px-3">
                          <span className="font-medium">{a.warranty_end}</span>{" "}
                          <Badge variant="outline" className={`text-[10px] ${daysLeft <= 7 ? "border-red-500 text-red-600" : "border-amber-500 text-amber-600"}`}>
                            {daysLeft}d
                          </Badge>
                        </td>
                        <td className="py-2 px-3">{a.employees?.name||"—"}</td>
                        <td className="py-2 px-3">{a.locations?.name||"—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">No warranty expirations in this period.</p>
        )}
      </div>

      {/* Licenses */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Key className="h-4 w-4 text-amber-500" /> License Expiries ({licenseExpiries.length})
          </h3>
          {licenseExpiries.length > 0 && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => exportCSV("license-expiry",
                ["Type","Name","Key","Expiry","Assigned To","Company"], toLicenseRows()
              )}><Download className="h-3.5 w-3.5 mr-1" /> CSV</Button>
              <Button size="sm" variant="outline" onClick={() => exportPDF("License Expiry Report",
                ["Type","Name","Key","Expiry","Assigned To","Company"], toLicenseRows()
              )}><FileText className="h-3.5 w-3.5 mr-1" /> PDF</Button>
            </div>
          )}
        </div>
        {licenseExpiries.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {["Type","Name","License Key","Expiry","Assigned To","Company"].map(h =>
                      <th key={h} className="text-left py-2 px-3 font-medium text-muted-foreground">{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {licenseExpiries.map((l: any) => {
                    const daysLeft = Math.round((new Date(l.validity_end).getTime() - today.getTime()) / 86400000);
                    return (
                      <tr key={l.id} className="border-b border-border/50">
                        <td className="py-2 px-3 capitalize">{l.license_type}</td>
                        <td className="py-2 px-3">{l.product_name||l.email_id||"—"}</td>
                        <td className="py-2 px-3 font-mono">{l.license_key||"—"}</td>
                        <td className="py-2 px-3">
                          <span className="font-medium">{l.validity_end}</span>{" "}
                          <Badge variant="outline" className={`text-[10px] ${daysLeft <= 7 ? "border-red-500 text-red-600" : "border-amber-500 text-amber-600"}`}>
                            {daysLeft}d
                          </Badge>
                        </td>
                        <td className="py-2 px-3">{l.employees?.name||"—"}</td>
                        <td className="py-2 px-3">{l.companies?.name||"—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">No license expirations in this period.</p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function ReportsPage() {
  const { roles } = useAuth();
  const { data: companies   = [] } = useCompanies();
  const { data: departments = [] } = useDepartments();
  const { data: locations   = [] } = useLocations();
  const { data: employees   = [] } = useEmployees();

  const isHR   = roles.includes("hr");
  const isAdmin = roles.includes("admin");
  const isIT    = roles.includes("it");
  const canSeeAssets     = isAdmin || isIT || roles.includes("viewer");
  const canSeeEmployees  = isAdmin || isHR || isIT;

  const defaultTab = canSeeAssets ? "assets" : "employees";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground text-sm">Filter, analyse, and export data by department, company, location, or person</p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          {canSeeAssets && (
            <>
              <TabsTrigger value="assets"><Package className="h-4 w-4 mr-1" /> Asset Register</TabsTrigger>
              <TabsTrigger value="summary"><FileText className="h-4 w-4 mr-1" /> Summary</TabsTrigger>
              <TabsTrigger value="expiry"><AlertTriangle className="h-4 w-4 mr-1" /> Expiry Alerts</TabsTrigger>
            </>
          )}
          {canSeeEmployees && (
            <TabsTrigger value="employees"><Users className="h-4 w-4 mr-1" /> Employee Assets</TabsTrigger>
          )}
        </TabsList>

        {canSeeAssets && (
          <>
            <TabsContent value="assets" className="mt-4">
              <AssetsReport companies={companies} departments={departments} locations={locations} employees={employees} />
            </TabsContent>
            <TabsContent value="summary" className="mt-4">
              <SummaryReport companies={companies} departments={departments} locations={locations} />
            </TabsContent>
            <TabsContent value="expiry" className="mt-4">
              <ExpiryReport />
            </TabsContent>
          </>
        )}
        {canSeeEmployees && (
          <TabsContent value="employees" className="mt-4">
            <EmployeeAssetsReport companies={companies} departments={departments} locations={locations} employees={employees} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
