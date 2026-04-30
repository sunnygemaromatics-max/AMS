import { useState } from "react";
import {
  useCompanies, useCategories, useVendors, useDepartments, useLocations, useCompanies as useCompaniesRef,
  useCreateCompany, useUpdateCompany, useDeactivateCompany,
  useCreateCategory, useUpdateCategory, useDeleteCategory,
  useCreateVendor, useUpdateVendor, useDeactivateVendor,
  useCreateDepartment, useUpdateDepartment, useDeactivateDepartment,
} from "@/hooks/useSupabaseData";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Tag, Truck, Plus, Loader2, Pencil, Trash2, LayoutGrid } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { parseDbError } from "@/lib/supabase-error";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function err(e: unknown) {
  toast({ title: "Error", description: parseDbError(e), variant: "destructive" });
}
function ok(msg: string, cb?: () => void) {
  toast({ title: "Success", description: msg });
  cb?.();
}

type FormMode = "closed" | "create" | "edit";

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE ROOT
// ═══════════════════════════════════════════════════════════════════════════════

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage companies, departments, categories, vendors, and SAP configuration</p>
      </div>
      <Tabs defaultValue="companies">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="companies"><Building2 className="h-4 w-4 mr-1" /> Companies</TabsTrigger>
          <TabsTrigger value="departments"><LayoutGrid className="h-4 w-4 mr-1" /> Departments</TabsTrigger>
          <TabsTrigger value="categories"><Tag className="h-4 w-4 mr-1" /> Categories</TabsTrigger>
          <TabsTrigger value="vendors"><Truck className="h-4 w-4 mr-1" /> Vendors</TabsTrigger>
          <TabsTrigger value="sap">SAP Config</TabsTrigger>
        </TabsList>
        <TabsContent value="companies"><CompaniesTab /></TabsContent>
        <TabsContent value="departments"><DepartmentsTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="vendors"><VendorsTab /></TabsContent>
        <TabsContent value="sap"><SapConfigTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPANIES TAB
// ═══════════════════════════════════════════════════════════════════════════════

const COMPANY_EMPTY = { name: "", code: "", address: "" };

function CompaniesTab() {
  const { data: companies, isLoading } = useCompanies();
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const deactivateCompany = useDeactivateCompany();
  const [mode, setMode] = useState<FormMode>("closed");
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(COMPANY_EMPTY);

  const openCreate = () => { setForm(COMPANY_EMPTY); setEditing(null); setMode("create"); };
  const openEdit = (c: any) => { setForm({ name: c.name, code: c.code, address: c.address ?? "" }); setEditing(c); setMode("edit"); };
  const close = () => setMode("closed");

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) { err("Name and Code are required"); return; }
    try {
      if (mode === "create") {
        await createCompany.mutateAsync({ name: form.name.trim(), code: form.code.trim().toUpperCase(), address: form.address.trim() || null });
        ok("Company created", close);
      } else {
        await updateCompany.mutateAsync({ id: editing.id, name: form.name.trim(), code: form.code.trim().toUpperCase(), address: form.address.trim() || null });
        ok("Company updated", close);
      }
    } catch (e) { err(e); }
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Company</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(companies ?? []).map((c: any) => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <Building2 className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{c.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{c.code}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <DeactivateButton label="company" onConfirm={() => deactivateCompany.mutateAsync(c.id).then(() => ok("Company removed")).catch(err)} />
                </div>
              </div>
              {c.address && <p className="text-xs text-muted-foreground mt-2 truncate">{c.address}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      {(companies ?? []).length === 0 && <EmptyState label="No companies yet. Add your first company." />}

      <EntityDialog
        open={mode !== "closed"}
        title={mode === "create" ? "Add Company" : "Edit Company"}
        onClose={close}
        onSave={handleSave}
        isPending={createCompany.isPending || updateCompany.isPending}
      >
        <Field label="Name *"><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="The Studio Infinito" /></Field>
        <Field label="Code *"><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="TSI" maxLength={10} /></Field>
        <Field label="Address"><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></Field>
      </EntityDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPARTMENTS TAB
// ═══════════════════════════════════════════════════════════════════════════════

const DEPT_EMPTY = { name: "", code: "", company_id: "", location_id: "" };

function DepartmentsTab() {
  const { data: departments, isLoading } = useDepartments();
  const { data: companies } = useCompaniesRef();
  const { data: locations } = useLocations();
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deactivateDept = useDeactivateDepartment();
  const [mode, setMode] = useState<FormMode>("closed");
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(DEPT_EMPTY);

  const openCreate = () => { setForm(DEPT_EMPTY); setEditing(null); setMode("create"); };
  const openEdit = (d: any) => { setForm({ name: d.name, code: d.code, company_id: d.company_id ?? "", location_id: d.location_id ?? "" }); setEditing(d); setMode("edit"); };
  const close = () => setMode("closed");

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) { err("Name and Code are required"); return; }
    const payload = { name: form.name.trim(), code: form.code.trim().toUpperCase(), company_id: form.company_id || null, location_id: form.location_id || null };
    try {
      if (mode === "create") {
        await createDept.mutateAsync(payload as any);
        ok("Department created", close);
      } else {
        await updateDept.mutateAsync({ id: editing.id, ...payload });
        ok("Department updated", close);
      }
    } catch (e) { err(e); }
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Department</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(departments ?? []).map((d: any) => (
          <Card key={d.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <LayoutGrid className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">{d.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{d.code}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <DeactivateButton label="department" onConfirm={() => deactivateDept.mutateAsync(d.id).then(() => ok("Department removed")).catch(err)} />
                </div>
              </div>
              {d.companies?.name && <p className="text-xs text-muted-foreground mt-1">{d.companies.name}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      {(departments ?? []).length === 0 && <EmptyState label="No departments yet." />}

      <EntityDialog
        open={mode !== "closed"}
        title={mode === "create" ? "Add Department" : "Edit Department"}
        onClose={close}
        onSave={handleSave}
        isPending={createDept.isPending || updateDept.isPending}
      >
        <Field label="Name *"><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Engineering" /></Field>
        <Field label="Code *"><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="ENG" maxLength={10} /></Field>
        <Field label="Company">
          <Select value={form.company_id || "__none__"} onValueChange={v => setForm(f => ({ ...f, company_id: v === "__none__" ? "" : v }))}>
            <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— None —</SelectItem>
              {(companies ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Location">
          <Select value={form.location_id || "__none__"} onValueChange={v => setForm(f => ({ ...f, location_id: v === "__none__" ? "" : v }))}>
            <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— None —</SelectItem>
              {(locations ?? []).map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </EntityDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIES TAB
// ═══════════════════════════════════════════════════════════════════════════════

const CAT_EMPTY = { name: "", code: "", asset_type: "tangible" as "tangible" | "intangible", is_consumable: false };

function CategoriesTab() {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const [mode, setMode] = useState<FormMode>("closed");
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(CAT_EMPTY);

  const openCreate = () => { setForm(CAT_EMPTY); setEditing(null); setMode("create"); };
  const openEdit = (c: any) => { setForm({ name: c.name, code: c.code, asset_type: c.asset_type, is_consumable: c.is_consumable }); setEditing(c); setMode("edit"); };
  const close = () => setMode("closed");

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) { err("Name and Code are required"); return; }
    try {
      if (mode === "create") {
        await createCategory.mutateAsync({ name: form.name.trim(), code: form.code.trim().toUpperCase(), asset_type: form.asset_type, is_consumable: form.is_consumable });
        ok("Category created", close);
      } else {
        await updateCategory.mutateAsync({ id: editing.id, name: form.name.trim(), code: form.code.trim().toUpperCase(), asset_type: form.asset_type, is_consumable: form.is_consumable });
        ok("Category updated", close);
      }
    } catch (e) { err(e); }
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Category</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(categories ?? []).map((c: any) => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Tag className="h-4 w-4 text-accent shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{c.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant="outline" className="text-xs">{c.asset_type}</Badge>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <DeactivateButton label="category" destructive onConfirm={() => deleteCategory.mutateAsync(c.id).then(() => ok("Category deleted")).catch(err)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {(categories ?? []).length === 0 && <EmptyState label="No categories yet." />}

      <EntityDialog
        open={mode !== "closed"}
        title={mode === "create" ? "Add Category" : "Edit Category"}
        onClose={close}
        onSave={handleSave}
        isPending={createCategory.isPending || updateCategory.isPending}
      >
        <Field label="Name *"><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Desktop Computer" /></Field>
        <Field label="Code *"><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="DT" maxLength={10} /></Field>
        <Field label="Type">
          <Select value={form.asset_type} onValueChange={(v: any) => setForm(f => ({ ...f, asset_type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tangible">Tangible (physical)</SelectItem>
              <SelectItem value="intangible">Intangible (software/license)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </EntityDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VENDORS TAB
// ═══════════════════════════════════════════════════════════════════════════════

const VENDOR_EMPTY = { name: "", contact_person: "", email: "", phone: "", gst_number: "" };

function VendorsTab() {
  const { data: vendors, isLoading } = useVendors();
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const deactivateVendor = useDeactivateVendor();
  const [mode, setMode] = useState<FormMode>("closed");
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(VENDOR_EMPTY);

  const openCreate = () => { setForm(VENDOR_EMPTY); setEditing(null); setMode("create"); };
  const openEdit = (v: any) => { setForm({ name: v.name, contact_person: v.contact_person ?? "", email: v.email ?? "", phone: v.phone ?? "", gst_number: v.gst_number ?? "" }); setEditing(v); setMode("edit"); };
  const close = () => setMode("closed");

  const handleSave = async () => {
    if (!form.name.trim()) { err("Vendor name is required"); return; }
    const payload = { name: form.name.trim(), contact_person: form.contact_person.trim() || null, email: form.email.trim() || null, phone: form.phone.trim() || null, gst_number: form.gst_number.trim() || null };
    try {
      if (mode === "create") {
        await createVendor.mutateAsync(payload);
        ok("Vendor created", close);
      } else {
        await updateVendor.mutateAsync({ id: editing.id, ...payload });
        ok("Vendor updated", close);
      }
    } catch (e) { err(e); }
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Vendor</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(vendors ?? []).map((v: any) => (
          <Card key={v.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Truck className="h-4 w-4 text-accent shrink-0" />
                  <p className="font-semibold text-sm truncate">{v.name}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(v)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <DeactivateButton label="vendor" onConfirm={() => deactivateVendor.mutateAsync(v.id).then(() => ok("Vendor removed")).catch(err)} />
                </div>
              </div>
              {v.contact_person && <p className="text-xs text-muted-foreground mt-1">{v.contact_person}</p>}
              {v.phone && <p className="text-xs text-muted-foreground">{v.phone}</p>}
              {v.gst_number && <p className="text-xs font-mono text-muted-foreground">GST: {v.gst_number}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      {(vendors ?? []).length === 0 && <EmptyState label="No vendors yet." />}

      <EntityDialog
        open={mode !== "closed"}
        title={mode === "create" ? "Add Vendor" : "Edit Vendor"}
        onClose={close}
        onSave={handleSave}
        isPending={createVendor.isPending || updateVendor.isPending}
      >
        <Field label="Name *"><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
        <Field label="Contact Person"><Input value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></Field>
        <Field label="GST Number"><Input value={form.gst_number} onChange={e => setForm(f => ({ ...f, gst_number: e.target.value }))} /></Field>
      </EntityDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAP CONFIG TAB
// ═══════════════════════════════════════════════════════════════════════════════

function SapConfigTab() {
  return (
    <div className="mt-4">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <p className="text-sm font-semibold mb-1">SAP Code Format</p>
            <code className="text-sm font-mono bg-muted px-3 py-1.5 rounded block w-fit">COMPANY-LOCATION-CATEGORY-XXXX</code>
            <p className="text-xs text-muted-foreground mt-1">Example: TSI-MUM-DT-0001</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[["Company Code", "3 chars, e.g. TSI"], ["Location Code", "3 chars, e.g. MUM"], ["Category Code", "2–4 chars, e.g. DT"], ["Sequence", "4-digit auto-increment"]].map(([label, val]) => (
              <div key={label} className="bg-muted/40 rounded p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-mono font-medium text-xs mt-0.5">{val}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">SAP code auto-generation is available after setting up companies, locations, and categories in their respective tabs.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function Spinner() {
  return <div className="flex justify-center mt-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-center text-muted-foreground py-10 text-sm">{label}</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-sm">{label}</Label>{children}</div>;
}

function EntityDialog({ open, title, onClose, onSave, isPending, children }: {
  open: boolean; title: string; onClose: () => void; onSave: () => void; isPending: boolean; children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">{children}</div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave} disabled={isPending}>
            {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeactivateButton({ label, onConfirm, destructive = false }: { label: string; onConfirm: () => void; destructive?: boolean }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            {destructive
              ? `This will permanently delete the ${label}. This cannot be undone.`
              : `This will deactivate the ${label}. It won't appear in dropdowns but existing data is preserved.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
