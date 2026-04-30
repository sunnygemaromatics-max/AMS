import { useState, useMemo } from "react";
import {
  useEmployees, useLocations, useCompanies, useDepartments,
  useCreateEmployee, useAssets,
} from "@/hooks/useSupabaseData";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, User, Package, Plus, Loader2, Eye, ChevronDown } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const statusLabel = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const EMPLOYEE_TYPES = [
  { value: "full_time", label: "Full-Time" },
  { value: "part_time", label: "Part-Time" },
  { value: "contractor", label: "Contractor" },
  { value: "intern", label: "Intern" },
  { value: "temporary", label: "Temporary" },
];

const ACCESS_LEVELS = [
  { value: "standard", label: "Standard" },
  { value: "elevated", label: "Elevated" },
  { value: "admin", label: "Admin" },
  { value: "restricted", label: "Restricted" },
];

const EMPTY_FORM = {
  // Core (required)
  employee_code: "",
  name: "",
  department: "",
  // Position
  designation: "",
  role: "",
  reporting_manager: "",
  employee_type: "full_time",
  // Contact
  email: "",
  phone: "",
  emergency_contact: "",
  secondary_email: "",
  // Location & company
  location_id: "",
  company_id: "",
  department_id: "",
  work_location: "",
  // Access & status
  access_level: "standard",
  is_active: true,
  date_of_joining: "",
};

type FormState = typeof EMPTY_FORM;

export default function EmployeesPage() {
  const { data: employees, isLoading } = useEmployees();
  const { data: assets }               = useAssets();
  const { data: locations }            = useLocations();
  const { data: companies }            = useCompanies();
  const { data: departments }          = useDepartments();
  const createEmployee                 = useCreateEmployee();
  const navigate                       = useNavigate();

  const [search, setSearch]               = useState("");
  const [deptFilter, setDeptFilter]       = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [typeFilter, setTypeFilter]       = useState("all");
  const [selected, setSelected]           = useState<string | null>(null);
  const [showCreate, setShowCreate]       = useState(false);
  const [form, setForm]                   = useState<FormState>(EMPTY_FORM);
  const [showAdvanced, setShowAdvanced]   = useState(false);

  const set = (k: keyof FormState, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // ── Derived data ────────────────────────────────────────────────────────────

  const uniqueDepts = useMemo(() => {
    const s = new Set((employees || []).map((e: any) => e.department as string));
    return Array.from(s).filter(Boolean).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (employees || []).filter((e: any) => {
      const matchSearch =
        !q ||
        e.name?.toLowerCase().includes(q) ||
        e.employee_code?.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q) ||
        e.designation?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q);
      const matchDept = deptFilter === "all" || e.department === deptFilter;
      const matchLoc  = locationFilter === "all" || e.location_id === locationFilter;
      const matchType = typeFilter === "all" || (e as any).employee_type === typeFilter;
      return matchSearch && matchDept && matchLoc && matchType;
    });
  }, [employees, search, deptFilter, locationFilter, typeFilter]);

  const selectedEmployee = selected
    ? (employees || []).find((e: any) => e.id === selected)
    : null;

  const employeeAssets = selectedEmployee
    ? (assets || []).filter((a: any) => a.current_employee_id === selected)
    : [];

  // ── Managers list (all employees, for dropdown) ──────────────────────────
  const managerOptions = useMemo(
    () => (employees || []).map((e: any) => ({ id: e.id, name: e.name, code: e.employee_code })),
    [employees],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!form.employee_code || !form.name || !form.department) {
      toast({ title: "Required fields missing", description: "Employee Code, Name, and Department are required.", variant: "destructive" });
      return;
    }
    try {
      await createEmployee.mutateAsync({
        employee_code:  form.employee_code.trim(),
        name:           form.name.trim(),
        department:     form.department.trim(),
        role:           form.role || null,
        email:          form.email || null,
        phone:          form.phone || null,
        location_id:    form.location_id || null,
        company_id:     form.company_id || null,
        department_id:  form.department_id || null,
        designation:    form.designation || null,
        // New fields (cast to any — DB columns added via migration, types.ts not regenerated)
        ...({
          employee_type:     form.employee_type || "full_time",
          reporting_manager: form.reporting_manager || null,
          access_level:      form.access_level || "standard",
          emergency_contact: form.emergency_contact || null,
          secondary_email:   form.secondary_email || null,
          work_location:     form.work_location || null,
          date_of_joining:   form.date_of_joining || null,
          is_active:         form.is_active,
        } as any),
      });
      toast({ title: "Employee created", description: `${form.name} has been added.` });
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setShowAdvanced(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground text-sm">
            {filtered.length} of {(employees || []).length} employees
          </p>
        </div>

        <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) { setForm(EMPTY_FORM); setShowAdvanced(false); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Add Employee</Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Employee</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 pt-2">

              {/* ── Section 1: Basic Information ────────────────────────── */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Basic Information
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <Label>Employee Code <span className="text-destructive">*</span></Label>
                    <Input
                      value={form.employee_code}
                      onChange={(e) => set("employee_code", e.target.value)}
                      placeholder="EMP-001"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Full Name <span className="text-destructive">*</span></Label>
                    <Input
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Rahul Sharma"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Employment Type</Label>
                    <Select value={form.employee_type} onValueChange={(v) => set("employee_type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EMPLOYEE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select value={form.is_active ? "active" : "inactive"} onValueChange={(v) => set("is_active", v === "active")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* ── Section 2: Position ─────────────────────────────────── */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Position
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <Label>Department <span className="text-destructive">*</span></Label>
                    <Input
                      value={form.department}
                      onChange={(e) => set("department", e.target.value)}
                      placeholder="Accounts"
                      list="dept-list"
                    />
                    <datalist id="dept-list">
                      {uniqueDepts.map((d) => <option key={d} value={d} />)}
                    </datalist>
                  </div>
                  <div className="space-y-1">
                    <Label>Designation / Title</Label>
                    <Input
                      value={form.designation}
                      onChange={(e) => set("designation", e.target.value)}
                      placeholder="Senior Accountant"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Role</Label>
                    <Input
                      value={form.role}
                      onChange={(e) => set("role", e.target.value)}
                      placeholder="Finance Lead"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Reporting Manager</Label>
                    <Select value={form.reporting_manager || "_none"} onValueChange={(v) => set("reporting_manager", v === "_none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— None —</SelectItem>
                        {managerOptions.map((m) => (
                          <SelectItem key={m.id} value={m.name}>
                            {m.name} ({m.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Date of Joining</Label>
                    <Input
                      type="date"
                      value={form.date_of_joining}
                      onChange={(e) => set("date_of_joining", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Department Group</Label>
                    <Select value={form.department_id || "_none"} onValueChange={(v) => set("department_id", v === "_none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— None —</SelectItem>
                        {(departments || []).map((d: any) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* ── Section 3: Contact ──────────────────────────────────── */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Contact Details
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <Label>Work Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="r.sharma@company.com" />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" />
                  </div>
                  <div className="space-y-1">
                    <Label>Personal / Secondary Email</Label>
                    <Input type="email" value={form.secondary_email} onChange={(e) => set("secondary_email", e.target.value)} placeholder="personal@gmail.com" />
                  </div>
                  <div className="space-y-1">
                    <Label>Emergency Contact</Label>
                    <Input value={form.emergency_contact} onChange={(e) => set("emergency_contact", e.target.value)} placeholder="Name — Phone" />
                  </div>
                </div>
              </div>

              {/* ── Section 4: Location & Access (collapsible) ─────────── */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <button type="button" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors w-full">
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                    Location, Company &amp; Access
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                    <div className="space-y-1">
                      <Label>Location / Branch</Label>
                      <Select value={form.location_id || "_none"} onValueChange={(v) => set("location_id", v === "_none" ? "" : v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">— None —</SelectItem>
                          {(locations || []).map((l: any) => (
                            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Company</Label>
                      <Select value={form.company_id || "_none"} onValueChange={(v) => set("company_id", v === "_none" ? "" : v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">— None —</SelectItem>
                          {(companies || []).map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Work Location (text)</Label>
                      <Input value={form.work_location} onChange={(e) => set("work_location", e.target.value)} placeholder="Mumbai HQ, Floor 3" />
                    </div>
                    <div className="space-y-1">
                      <Label>Access Level</Label>
                      <Select value={form.access_level} onValueChange={(v) => set("access_level", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ACCESS_LEVELS.map((a) => (
                            <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); setShowAdvanced(false); }}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createEmployee.isPending}>
                {createEmployee.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Employee
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, department, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {uniqueDepts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {EMPLOYEE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Location" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {(locations || []).map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Employee cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((emp: any) => {
          const empAssets = (assets || []).filter((a: any) => a.current_employee_id === emp.id);
          const typeLabel = EMPLOYEE_TYPES.find(t => t.value === emp.employee_type)?.label;
          return (
            <Card
              key={emp.id}
              className="cursor-pointer hover:border-accent/50 transition-colors"
              onClick={() => setSelected(emp.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold text-sm">
                      {(emp.name as string)?.[0]?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.department}</p>
                    {emp.designation && (
                      <p className="text-xs text-muted-foreground/70 truncate">{emp.designation}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3 text-accent" />
                        <span className="text-xs text-muted-foreground">
                          {empAssets.length} asset{empAssets.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {emp.locations?.name && (
                        <Badge variant="outline" className="text-[10px] h-4">{emp.locations.name}</Badge>
                      )}
                      {typeLabel && typeLabel !== "Full-Time" && (
                        <Badge variant="secondary" className="text-[10px] h-4">{typeLabel}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                {empAssets.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {empAssets.slice(0, 3).map((a: any) => (
                      <span key={a.id} className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
                        {a.sap_code}
                      </span>
                    ))}
                    {empAssets.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{empAssets.length - 3}</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No employees found.</p>
      )}

      {/* ── Employee detail dialog ──────────────────────────────────────────── */}
      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selectedEmployee && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">
                      {((selectedEmployee as any).name as string)?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  {(selectedEmployee as any).name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Core info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Employee Code", (selectedEmployee as any).employee_code],
                    ["Department",    (selectedEmployee as any).department],
                    ["Designation",   (selectedEmployee as any).designation || "—"],
                    ["Role",          (selectedEmployee as any).role || "—"],
                    ["Type",          EMPLOYEE_TYPES.find(t => t.value === (selectedEmployee as any).employee_type)?.label || "Full-Time"],
                    ["Access Level",  (selectedEmployee as any).access_level || "standard"],
                    ["Location",      (selectedEmployee as any).locations?.name || "—"],
                    ["Company",       (selectedEmployee as any).companies?.name || "—"],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-medium text-sm">{val}</p>
                    </div>
                  ))}
                </div>

                {/* Contact */}
                {((selectedEmployee as any).email || (selectedEmployee as any).phone || (selectedEmployee as any).reporting_manager) && (
                  <div className="border-t pt-3 grid grid-cols-2 gap-3 text-sm">
                    {(selectedEmployee as any).email && (
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium text-xs break-all">{(selectedEmployee as any).email}</p>
                      </div>
                    )}
                    {(selectedEmployee as any).phone && (
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium text-sm">{(selectedEmployee as any).phone}</p>
                      </div>
                    )}
                    {(selectedEmployee as any).reporting_manager && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Reporting Manager</p>
                        <p className="font-medium text-sm">{(selectedEmployee as any).reporting_manager}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Assets */}
                {employeeAssets.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground font-medium mb-2">
                      Assigned Assets ({employeeAssets.length})
                    </p>
                    <div className="space-y-2">
                      {employeeAssets.map((a: any) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm cursor-pointer hover:bg-muted/50"
                          onClick={() => { setSelected(null); navigate(`/assets/${a.id}`); }}
                        >
                          <div>
                            <span className="font-mono text-xs text-accent font-semibold">{a.sap_code}</span>
                            <p className="text-xs">{a.name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={statusLabel(a.status)} />
                            <Eye className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
