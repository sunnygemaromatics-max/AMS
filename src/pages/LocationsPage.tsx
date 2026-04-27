import { useState } from "react";
import { useLocations, useAssets, useEmployees, useCompanies, useCreateLocation } from "@/hooks/useSupabaseData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Package, Users, Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

export default function LocationsPage() {
  const { data: locations, isLoading } = useLocations();
  const { data: assets } = useAssets();
  const { data: employees } = useEmployees();
  const { data: companies } = useCompanies();
  const createLocation = useCreateLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', address: '', company_id: '' });

  const handleCreate = async () => {
    if (!form.name || !form.code) {
      toast({ title: "Error", description: "Name and Code are required", variant: "destructive" });
      return;
    }
    try {
      await createLocation.mutateAsync({
        name: form.name,
        code: form.code,
        address: form.address || null,
        company_id: form.company_id || null,
      });
      toast({ title: "Success", description: "Location created" });
      setShowCreate(false);
      setForm({ name: '', code: '', address: '', company_id: '' });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Locations</h1>
          <p className="text-muted-foreground text-sm">Manage office locations</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add Location</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Location</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Mumbai Office" /></div>
              <div><Label>Code *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="MUM" /></div>
              <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
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
              <Button onClick={handleCreate} disabled={createLocation.isPending}>{createLocation.isPending ? 'Creating...' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(locations || []).map((loc: any) => {
          const locAssets = (assets || []).filter((a: any) => a.current_location_id === loc.id).length;
          const locEmployees = (employees || []).filter((e: any) => e.location_id === loc.id).length;
          return (
            <Card key={loc.id} className="hover:border-accent/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{loc.name}</CardTitle>
                    <span className="text-xs font-mono text-muted-foreground">{loc.code}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loc.address && <p className="text-xs text-muted-foreground mb-4">{loc.address}</p>}
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

      {(locations || []).length === 0 && <p className="text-center text-muted-foreground py-12">No locations yet. Click "Add Location" to create one.</p>}
    </div>
  );
}
