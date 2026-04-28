import { useState } from "react";
import { useLocations, useAssets, useEmployees, useCompanies, useCreateLocation, useUpdateLocation, useDeactivateLocation } from "@/hooks/useSupabaseData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Package, Users, Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { parseDbError } from "@/lib/supabase-error";

const EMPTY = { name: "", code: "", address: "", company_id: "" };
type FormMode = "closed" | "create" | "edit";

export default function LocationsPage() {
  const { data: locations, isLoading } = useLocations();
  const { data: assets } = useAssets();
  const { data: employees } = useEmployees();
  const { data: companies } = useCompanies();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deactivateLocation = useDeactivateLocation();

  const [mode, setMode] = useState<FormMode>("closed");
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(EMPTY);

  const openCreate = () => { setForm(EMPTY); setEditing(null); setMode("create"); };
  const openEdit = (loc: any) => {
    setForm({ name: loc.name, code: loc.code, address: loc.address ?? "", company_id: loc.company_id ?? "" });
    setEditing(loc);
    setMode("edit");
  };
  const close = () => setMode("closed");

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast({ title: "Error", description: "Name and Code are required", variant: "destructive" });
      return;
    }
    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      address: form.address.trim() || null,
      company_id: form.company_id || null,
    };
    try {
      if (mode === "create") {
        await createLocation.mutateAsync(payload);
        toast({ title: "Success", description: "Location created" });
      } else {
        await updateLocation.mutateAsync({ id: editing.id, ...payload });
        toast({ title: "Success", description: "Location updated" });
      }
      close();
    } catch (e) {
      toast({ title: "Error", description: parseDbError(e), variant: "destructive" });
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateLocation.mutateAsync(id);
      toast({ title: "Success", description: "Location removed" });
    } catch (e) {
      toast({ title: "Error", description: parseDbError(e), variant: "destructive" });
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Locations</h1>
          <p className="text-muted-foreground text-sm">Manage office and warehouse locations</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Location</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(locations ?? []).map((loc: any) => {
          const locAssets = (assets ?? []).filter((a: any) => a.current_location_id === loc.id).length;
          const locEmployees = (employees ?? []).filter((e: any) => e.location_id === loc.id).length;
          return (
            <Card key={loc.id} className="hover:border-accent/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{loc.name}</CardTitle>
                      <span className="text-xs font-mono text-muted-foreground">{loc.code}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(loc)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Deactivate {loc.name}?</AlertDialogTitle>
                          <AlertDialogDescription>This location will be hidden from dropdowns. Existing asset and employee records referencing it are preserved.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeactivate(loc.id)} className="bg-destructive hover:bg-destructive/90">Deactivate</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loc.address && <p className="text-xs text-muted-foreground mb-3 truncate">{loc.address}</p>}
                {loc.companies?.name && <p className="text-xs text-muted-foreground mb-3">{loc.companies.name}</p>}
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">{locAssets}</span>
                    <span className="text-xs text-muted-foreground">Assets</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">{locEmployees}</span>
                    <span className="text-xs text-muted-foreground">Employees</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(locations ?? []).length === 0 && (
        <p className="text-center text-muted-foreground py-12">No locations yet. Click "Add Location" to create one.</p>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={mode !== "closed"} onOpenChange={o => { if (!o) close(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "Add Location" : "Edit Location"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Mumbai Office" /></div>
            <div className="space-y-1"><Label>Code *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="MUM" maxLength={10} /></div>
            <div className="space-y-1"><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label>Company</Label>
              <Select value={form.company_id} onValueChange={v => setForm(f => ({ ...f, company_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {(companies ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button onClick={handleSave} disabled={createLocation.isPending || updateLocation.isPending}>
              {(createLocation.isPending || updateLocation.isPending) ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
