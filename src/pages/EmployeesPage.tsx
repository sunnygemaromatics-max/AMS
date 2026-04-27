import { useState, useMemo } from "react";
import { useEmployees, useLocations, useCompanies, useDepartments, useCreateEmployee, useAssets } from "@/hooks/useSupabaseData";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, User, Package, Plus, Loader2, Eye } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const statusLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function EmployeesPage() {
  const { data: employees, isLoading } = useEmployees();
  const { data: assets } = useAssets();
  const { data: locations } = useLocations();
  const { data: companies } = useCompanies();
  const { data: departments } = useDepartments();
  const createEmployee = useCreateEmployee();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ employee_code: '', name: '', department: '', role: '', designation: '', email: '', phone: '', location_id: '', company_id: '', department_id: '' });

  const uniqueDepts = useMemo(() => {
    const depts = new Set((employees || []).map((e: any) => e.department));
    return Array.from(depts).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (employees || []).filter((e: any) => {
      const matchSearch = !q || e.name?.toLowerCase().includes(q) || e.employee_code?.toLowerCase().includes(q) || e.department?.toLowerCase().includes(q);
      const matchDept = deptFilter === "all" || e.department === deptFilter;
      const matchLoc = locationFilter === "all" || e.location_id === locationFilter;
      return matchSearch && matchDept && matchLoc;
    });
  }, [employees, search, deptFilter, locationFilter]);

  const selectedEmployee = selected ? (employees || []).find((e: any) => e.id === selected) : null;
  const employeeAssets = selectedEmployee ? (assets || []).filter((a: any) => a.current_employee_id === selected) : [];

  const handleCreate = async () => {
    if (!form.employee_code || !form.name || !form.department) {
      toast({ title: "Error", description: "Code, Name, and Department are required", variant: "destructive" });
      return;
    }
    try {
      await createEmployee.mutateAsync({
        employee_code: form.employee_code, name: form.name, department: form.department,
        role: form.role || null, email: form.email || null, phone: form.phone || null,
        location_id: form.location_id || null, company_id: form.company_id || null,
        department_id: form.department_id || null, designation: form.designation || null,
      });
      toast({ title: "Success", description: "Employee created" });
      setShowCreate(false);
      setForm({ employee_code: '', name: '', department: '', role: '', designation: '', email: '', phone: '', location_id: '', company_id: '', department_id: '' });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} of {(employees || []).length} employees</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add Employee</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><Label>Employee Code *</Label><Input value={form.employee_code} onChange={e => setForm(f => ({ ...f, employee_code: e.target.value }))} /></div>
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Department *</Label><Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} /></div>
              <div><Label>Designation</Label><Input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} /></div>
              <div><Label>Role</Label><Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div>
                <Label>Location</Label>
                <Select value={form.location_id} onValueChange={v => setForm(f => ({ ...f, location_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{(locations || []).map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Company</Label>
                <Select value={form.company_id} onValueChange={v => setForm(f => ({ ...f, company_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{(companies || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createEmployee.isPending}>{createEmployee.isPending ? 'Creating...' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {uniqueDepts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Location" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {(locations || []).map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((emp: any) => {
          const empAssets = (assets || []).filter((a: any) => a.current_employee_id === emp.id);
          return (
            <Card key={emp.id} className="cursor-pointer hover:border-accent/50 transition-colors" onClick={() => setSelected(emp.id)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.department}</p>
                    {emp.designation && <p className="text-xs text-muted-foreground/70">{emp.designation}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3 text-accent" />
                        <span className="text-xs text-muted-foreground">{empAssets.length} asset{empAssets.length !== 1 ? 's' : ''}</span>
                      </div>
                      {emp.locations?.name && <Badge variant="outline" className="text-[10px] h-4">{emp.locations.name}</Badge>}
                    </div>
                  </div>
                </div>
                {empAssets.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {empAssets.slice(0, 3).map((a: any) => (
                      <span key={a.id} className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{a.sap_code}</span>
                    ))}
                    {empAssets.length > 3 && <span className="text-[10px] text-muted-foreground">+{empAssets.length - 3}</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">No employees found.</p>}

      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          {selectedEmployee && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  {(selectedEmployee as any).name}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Employee Code</p><p className="font-medium">{(selectedEmployee as any).employee_code}</p></div>
                <div><p className="text-xs text-muted-foreground">Department</p><p className="font-medium">{(selectedEmployee as any).department}</p></div>
                <div><p className="text-xs text-muted-foreground">Designation</p><p className="font-medium">{(selectedEmployee as any).designation || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Location</p><p className="font-medium">{(selectedEmployee as any).locations?.name || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Role</p><p className="font-medium">{(selectedEmployee as any).role || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium text-xs">{(selectedEmployee as any).email || '—'}</p></div>
              </div>
              {employeeAssets.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground font-medium mb-2">Assigned Assets ({employeeAssets.length})</p>
                  <div className="space-y-2">
                    {employeeAssets.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm cursor-pointer hover:bg-muted/50" onClick={() => { setSelected(null); navigate(`/assets/${a.id}`); }}>
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
