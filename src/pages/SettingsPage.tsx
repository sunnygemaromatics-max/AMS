import { useState } from "react";
import { useCompanies, useCategories, useVendors, useCreateCompany, useCreateCategory, useCreateVendor } from "@/hooks/useSupabaseData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Tag, Truck, Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage companies, categories, vendors, and system configuration</p>
      </div>

      <Tabs defaultValue="companies">
        <TabsList>
          <TabsTrigger value="companies"><Building2 className="h-4 w-4 mr-1" /> Companies</TabsTrigger>
          <TabsTrigger value="categories"><Tag className="h-4 w-4 mr-1" /> Categories</TabsTrigger>
          <TabsTrigger value="vendors"><Truck className="h-4 w-4 mr-1" /> Vendors</TabsTrigger>
          <TabsTrigger value="sap">SAP Config</TabsTrigger>
        </TabsList>

        <TabsContent value="companies"><CompaniesTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="vendors"><VendorsTab /></TabsContent>
        <TabsContent value="sap"><SapConfigTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function CompaniesTab() {
  const { data: companies, isLoading } = useCompanies();
  const createCompany = useCreateCompany();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', address: '' });

  const handleCreate = async () => {
    if (!form.name || !form.code) { toast({ title: "Error", description: "Name and Code required", variant: "destructive" }); return; }
    try {
      await createCompany.mutateAsync({ name: form.name, code: form.code, address: form.address || null });
      toast({ title: "Success", description: "Company created" });
      setShowCreate(false);
      setForm({ name: '', code: '', address: '' });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-8" />;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Company</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Company</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Code *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="GEM" /></div>
              <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createCompany.isPending}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {(companies || []).length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(companies || []).map((c: any) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{c.code}</p>
                  </div>
                </div>
                {c.address && <p className="text-xs text-muted-foreground mt-2">{c.address}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-8">No companies yet. Add your first company.</p>
      )}
    </div>
  );
}

function CategoriesTab() {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', asset_type: 'tangible' as any, is_consumable: false });

  const handleCreate = async () => {
    if (!form.name || !form.code) { toast({ title: "Error", description: "Name and Code required", variant: "destructive" }); return; }
    try {
      await createCategory.mutateAsync({ name: form.name, code: form.code, asset_type: form.asset_type, is_consumable: form.is_consumable });
      toast({ title: "Success", description: "Category created" });
      setShowCreate(false);
      setForm({ name: '', code: '', asset_type: 'tangible', is_consumable: false });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-8" />;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Category</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Desktop Computer" /></div>
              <div><Label>Code *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="DT" /></div>
              <div>
                <Label>Type</Label>
                <Select value={form.asset_type} onValueChange={v => setForm(f => ({ ...f, asset_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tangible">Tangible</SelectItem>
                    <SelectItem value="intangible">Intangible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createCategory.isPending}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {(categories || []).length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(categories || []).map((c: any) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-accent" />
                    <p className="font-semibold text-sm">{c.name}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{c.asset_type}</Badge>
                </div>
                <p className="text-xs font-mono text-muted-foreground mt-1">{c.code}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-8">No categories yet.</p>
      )}
    </div>
  );
}

function VendorsTab() {
  const { data: vendors, isLoading } = useVendors();
  const createVendor = useCreateVendor();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', contact_person: '', email: '', phone: '', gst_number: '' });

  const handleCreate = async () => {
    if (!form.name) { toast({ title: "Error", description: "Name required", variant: "destructive" }); return; }
    try {
      await createVendor.mutateAsync({
        name: form.name,
        contact_person: form.contact_person || null,
        email: form.email || null,
        phone: form.phone || null,
        gst_number: form.gst_number || null,
      });
      toast({ title: "Success", description: "Vendor created" });
      setShowCreate(false);
      setForm({ name: '', contact_person: '', email: '', phone: '', gst_number: '' });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-8" />;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Vendor</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Vendor</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><Label>GST Number</Label><Input value={form.gst_number} onChange={e => setForm(f => ({ ...f, gst_number: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createVendor.isPending}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {(vendors || []).length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(vendors || []).map((v: any) => (
            <Card key={v.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-accent" />
                  <p className="font-semibold text-sm">{v.name}</p>
                </div>
                {v.contact_person && <p className="text-xs text-muted-foreground mt-1">{v.contact_person}</p>}
                {v.phone && <p className="text-xs text-muted-foreground">{v.phone}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-8">No vendors yet.</p>
      )}
    </div>
  );
}

function SapConfigTab() {
  return (
    <div className="mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SAP Code Format Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium mb-2">Current Format</p>
            <code className="text-sm font-mono bg-muted px-3 py-1.5 rounded">COMPANY-LOCATION-CATEGORY-XXXX</code>
            <p className="text-xs text-muted-foreground mt-2">Example: GEM-MUM-DT-0001</p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-medium">Code Components:</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/30 rounded p-3">
                <p className="text-xs text-muted-foreground">Company Code</p>
                <p className="font-mono font-medium">3 characters (e.g., GEM)</p>
              </div>
              <div className="bg-muted/30 rounded p-3">
                <p className="text-xs text-muted-foreground">Location Code</p>
                <p className="font-mono font-medium">3 characters (e.g., MUM)</p>
              </div>
              <div className="bg-muted/30 rounded p-3">
                <p className="text-xs text-muted-foreground">Category Code</p>
                <p className="font-mono font-medium">2-4 characters (e.g., DT)</p>
              </div>
              <div className="bg-muted/30 rounded p-3">
                <p className="text-xs text-muted-foreground">Sequence</p>
                <p className="font-mono font-medium">4-digit auto-increment</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">SAP code auto-generation will be available after setting up companies, locations, and categories.</p>
        </CardContent>
      </Card>
    </div>
  );
}
