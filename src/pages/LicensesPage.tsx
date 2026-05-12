import { useState, useMemo } from "react";
import { useLicenses, useCreateLicense, useUpdateLicense, useDeleteLicense, useEmployees, useCompanies, useLocations } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Loader2, Key, Mail, Shield, Monitor, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

const LICENSE_TYPES = [
  { value: 'email', label: 'Email Account', icon: Mail },
  { value: 'sap', label: 'SAP License', icon: Monitor },
  { value: 'antivirus', label: 'Antivirus', icon: Shield },
  { value: 'software', label: 'Software License', icon: Key },
  { value: 'office365', label: 'Office 365', icon: Mail },
];

const statusColors: Record<string, string> = {
  active: 'bg-accent/10 text-accent border-accent/30',
  expired: 'bg-destructive/10 text-destructive border-destructive/30',
  revoked: 'bg-muted text-muted-foreground',
};

const EMPTY_LICENSE = {
  license_type: 'email', license_key: '', product_name: '', email_id: '', domain: '',
  sap_user_id: '', sap_license_type: '', validity_start: '', validity_end: '',
  max_users: '', assigned_employee_id: '', company_id: '', location_id: '', notes: '',
};

export default function LicensesPage() {
  const { data: licenses, isLoading } = useLicenses();
  const { data: employees } = useEmployees();
  const { data: companies } = useCompanies();
  const { data: locations } = useLocations();
  const createLicense = useCreateLicense();
  const updateLicense = useUpdateLicense();
  const deleteLicense = useDeleteLicense();
  const { isAdmin, canManageLicenses } = useAuth();
  const canEdit = isAdmin || canManageLicenses;

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_LICENSE);

  const filtered = useMemo(() => {
    return (licenses || []).filter((l: any) => {
      const q = search.toLowerCase();
      const matchSearch = !q || l.email_id?.toLowerCase().includes(q) || l.product_name?.toLowerCase().includes(q) || l.license_key?.toLowerCase().includes(q) || l.employees?.name?.toLowerCase().includes(q);
      const matchType = typeFilter === 'all' || l.license_type === typeFilter;
      return matchSearch && matchType;
    });
  }, [licenses, search, typeFilter]);

  const buildPayload = () => ({
    license_type: form.license_type,
    license_key: form.license_key || null,
    product_name: form.product_name || null,
    email_id: form.email_id || null,
    domain: form.domain || null,
    sap_user_id: form.sap_user_id || null,
    sap_license_type: form.sap_license_type || null,
    validity_start: form.validity_start || null,
    validity_end: form.validity_end || null,
    max_users: form.max_users ? parseInt(form.max_users) : null,
    assigned_employee_id: form.assigned_employee_id || null,
    company_id: form.company_id || null,
    location_id: form.location_id || null,
    notes: form.notes || null,
  });

  const handleCreate = async () => {
    if (!form.license_type) { toast({ title: "Error", description: "License type required", variant: "destructive" }); return; }
    try {
      await createLicense.mutateAsync(buildPayload());
      toast({ title: "Success", description: "License created" });
      setShowCreate(false);
      setForm(EMPTY_LICENSE);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const openEdit = (l: any) => {
    setEditing(l);
    setForm({
      license_type: l.license_type ?? 'email',
      license_key:  l.license_key ?? '',
      product_name: l.product_name ?? '',
      email_id:     l.email_id ?? '',
      domain:       l.domain ?? '',
      sap_user_id:  l.sap_user_id ?? '',
      sap_license_type: l.sap_license_type ?? '',
      validity_start: l.validity_start ?? '',
      validity_end:   l.validity_end ?? '',
      max_users: l.max_users != null ? String(l.max_users) : '',
      assigned_employee_id: l.assigned_employee_id ?? '',
      company_id: l.company_id ?? '',
      location_id: l.location_id ?? '',
      notes: l.notes ?? '',
    });
  };

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      await updateLicense.mutateAsync({ id: editing.id, ...buildPayload() });
      toast({ title: "Updated", description: "License updated" });
      setEditing(null);
      setForm(EMPTY_LICENSE);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteLicense.mutateAsync(confirmDelete.id);
      toast({ title: "Deleted", description: "License removed" });
      setConfirmDelete(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Dynamic fields based on type
  const TypeFields = () => {
    if (form.license_type === 'email' || form.license_type === 'office365') {
      return (
        <>
          <div><Label>Email ID</Label><Input value={form.email_id} onChange={e => setForm(f => ({ ...f, email_id: e.target.value }))} placeholder="user@domain.com" /></div>
          <div><Label>Domain</Label><Input value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} placeholder="gemaromatics.in" /></div>
        </>
      );
    }
    if (form.license_type === 'sap') {
      return (
        <>
          <div><Label>SAP User ID</Label><Input value={form.sap_user_id} onChange={e => setForm(f => ({ ...f, sap_user_id: e.target.value }))} /></div>
          <div>
            <Label>License Type</Label>
            <Select value={form.sap_license_type} onValueChange={v => setForm(f => ({ ...f, sap_license_type: v }))}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="limited">Limited</SelectItem>
                <SelectItem value="indirect">Indirect</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      );
    }
    if (form.license_type === 'antivirus' || form.license_type === 'software') {
      return (
        <>
          <div><Label>License Key</Label><Input value={form.license_key} onChange={e => setForm(f => ({ ...f, license_key: e.target.value }))} /></div>
          <div><Label>Max Users</Label><Input type="number" value={form.max_users} onChange={e => setForm(f => ({ ...f, max_users: e.target.value }))} /></div>
        </>
      );
    }
    return null;
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Licenses & Accounts</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} licenses tracked</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          {canEdit && (
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Add License</Button>
            </DialogTrigger>
          )}
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add License / Account</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <Label>Type *</Label>
                <Select value={form.license_type} onValueChange={v => setForm(f => ({ ...f, license_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LICENSE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Product Name</Label><Input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} /></div>
              <TypeFields />
              <div><Label>Validity Start</Label><Input type="date" value={form.validity_start} onChange={e => setForm(f => ({ ...f, validity_start: e.target.value }))} /></div>
              <div><Label>Validity End</Label><Input type="date" value={form.validity_end} onChange={e => setForm(f => ({ ...f, validity_end: e.target.value }))} /></div>
              <div>
                <Label>Assigned Employee</Label>
                <Select value={form.assigned_employee_id} onValueChange={v => setForm(f => ({ ...f, assigned_employee_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{(employees || []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Company</Label>
                <Select value={form.company_id} onValueChange={v => setForm(f => ({ ...f, company_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{(companies || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location</Label>
                <Select value={form.location_id} onValueChange={v => setForm(f => ({ ...f, location_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{(locations || []).map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createLicense.isPending}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {LICENSE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase">Type</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase">Product / Email</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase">Assigned To</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase">Company</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase">Location</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase">Validity</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  {canEdit && <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l: any) => (
                  <tr key={l.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-3"><Badge variant="outline" className="text-[10px]">{l.license_type}</Badge></td>
                    <td className="py-3 px-3 font-medium">{l.email_id || l.product_name || l.license_key || '—'}</td>
                    <td className="py-3 px-3">{l.employees?.name || '—'}</td>
                    <td className="py-3 px-3 text-muted-foreground">{l.companies?.name || '—'}</td>
                    <td className="py-3 px-3 text-muted-foreground">{l.locations?.name || '—'}</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">{l.validity_end || '—'}</td>
                    <td className="py-3 px-3">
                      <Badge variant="outline" className={`text-[10px] ${statusColors[l.status] || ''}`}>{l.status}</Badge>
                    </td>
                    {canEdit && (
                      <td className="py-3 px-3">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(l)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setConfirmDelete(l)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={canEdit ? 8 : 7} className="py-12 text-center text-muted-foreground">No licenses found.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit License Dialog — reuses the create form */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) { setEditing(null); setForm(EMPTY_LICENSE); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit License</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Type</Label>
              <Select value={form.license_type} onValueChange={v => setForm(f => ({ ...f, license_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LICENSE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>License Key</Label><Input value={form.license_key} onChange={e => setForm(f => ({ ...f, license_key: e.target.value }))} /></div>
            <div><Label>Product Name</Label><Input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} /></div>
            <div><Label>Email ID</Label><Input value={form.email_id} onChange={e => setForm(f => ({ ...f, email_id: e.target.value }))} /></div>
            <div><Label>Domain</Label><Input value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} /></div>
            <div><Label>Validity Start</Label><Input type="date" value={form.validity_start} onChange={e => setForm(f => ({ ...f, validity_start: e.target.value }))} /></div>
            <div><Label>Validity End</Label><Input type="date" value={form.validity_end} onChange={e => setForm(f => ({ ...f, validity_end: e.target.value }))} /></div>
            <div className="col-span-2">
              <Label>Assigned to</Label>
              <Select value={form.assigned_employee_id || "none"} onValueChange={v => setForm(f => ({ ...f, assigned_employee_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {(employees ?? []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setEditing(null); setForm(EMPTY_LICENSE); }}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateLicense.isPending}>
              {updateLicense.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this license?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.email_id || confirmDelete?.product_name || confirmDelete?.license_key || "This record"} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
