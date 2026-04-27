import { useState, useMemo } from "react";
import { useAssets, useEmployees, useLocations, useVendors, useCategories, useCompanies, useDepartments, useCreateAsset, useUpdateAsset } from "@/hooks/useSupabaseData";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Package, ChevronDown, ChevronUp, Plus, Loader2, Filter, X, Eye, Download, UserCheck, UserX, ArrowRightLeft } from "lucide-react";
import { exportAssetReport } from "@/lib/pdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { AllocationDialog } from "@/components/AllocationDialog";
import { BulkActionsBar } from "@/components/BulkActionsBar";
import { useAuth } from "@/contexts/AuthContext";

const statusLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const STATUSES = ['available', 'allocated', 'under_maintenance', 'lost', 'damaged', 'scrapped'];
const SUBTYPES = [
  { value: 'laptop', label: 'Laptop' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'printer', label: 'Printer' },
  { value: 'scanner', label: 'Scanner' },
  { value: 'server', label: 'Server' },
  { value: 'mobile_device', label: 'Mobile Device' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'antivirus', label: 'Antivirus' },
  { value: 'email_account', label: 'Email Account' },
  { value: 'sap_license', label: 'SAP License' },
  { value: 'software_license', label: 'Software License' },
  { value: 'networking', label: 'Networking' },
  { value: 'ups', label: 'UPS' },
  { value: 'other', label: 'Other' },
];

const QUICK_FILTERS = [
  { label: 'All Assets', status: 'all', subtype: 'all' },
  { label: 'Available', status: 'available', subtype: 'all' },
  { label: 'Allocated', status: 'allocated', subtype: 'all' },
  { label: 'Laptops', status: 'all', subtype: 'laptop' },
  { label: 'Desktops', status: 'all', subtype: 'desktop' },
  { label: 'Mobile Devices', status: 'all', subtype: 'mobile_device' },
];

// Dynamic fields based on asset subtype
function DynamicFields({ subtype, form, setForm }: { subtype: string; form: any; setForm: any }) {
  if (subtype === 'mobile_device' || subtype === 'tablet') {
    return (
      <>
        <div><Label>IMEI 1</Label><Input value={form.imei || ''} onChange={e => setForm((f: any) => ({ ...f, imei: e.target.value }))} /></div>
        <div><Label>IMEI 2</Label><Input value={form.imei2 || ''} onChange={e => setForm((f: any) => ({ ...f, imei2: e.target.value }))} /></div>
        <div><Label>Mobile Number</Label><Input value={form.mobile_number || ''} onChange={e => setForm((f: any) => ({ ...f, mobile_number: e.target.value }))} /></div>
        <div><Label>SIM Provider</Label><Input value={form.sim_provider || ''} onChange={e => setForm((f: any) => ({ ...f, sim_provider: e.target.value }))} /></div>
      </>
    );
  }
  if (subtype === 'antivirus' || subtype === 'software_license') {
    return (
      <>
        <div><Label>License Key</Label><Input value={form.license_key || ''} onChange={e => setForm((f: any) => ({ ...f, license_key: e.target.value }))} /></div>
        <div><Label>Warranty/Expiry End</Label><Input type="date" value={form.warranty_end || ''} onChange={e => setForm((f: any) => ({ ...f, warranty_end: e.target.value }))} /></div>
      </>
    );
  }
  if (subtype === 'email_account') {
    return (
      <>
        <div><Label>License Key / Email</Label><Input value={form.license_key || ''} onChange={e => setForm((f: any) => ({ ...f, license_key: e.target.value }))} placeholder="user@domain.com" /></div>
        <div><Label>Specifications (Domain)</Label><Input value={form.specifications || ''} onChange={e => setForm((f: any) => ({ ...f, specifications: e.target.value }))} placeholder="gemaromatics.in" /></div>
      </>
    );
  }
  if (subtype === 'sap_license') {
    return (
      <>
        <div><Label>License Key</Label><Input value={form.license_key || ''} onChange={e => setForm((f: any) => ({ ...f, license_key: e.target.value }))} /></div>
        <div><Label>Specifications (License Type)</Label><Input value={form.specifications || ''} onChange={e => setForm((f: any) => ({ ...f, specifications: e.target.value }))} placeholder="Professional / Limited" /></div>
        <div><Label>Validity Start</Label><Input type="date" value={form.warranty_start || ''} onChange={e => setForm((f: any) => ({ ...f, warranty_start: e.target.value }))} /></div>
        <div><Label>Validity End</Label><Input type="date" value={form.warranty_end || ''} onChange={e => setForm((f: any) => ({ ...f, warranty_end: e.target.value }))} /></div>
      </>
    );
  }
  return null;
}

export default function AssetsPage() {
  const { data: assets, isLoading } = useAssets();
  const { data: employees } = useEmployees();
  const { data: locations } = useLocations();
  const { data: vendors } = useVendors();
  const { data: categories } = useCategories();
  const { data: companies } = useCompanies();
  const { data: departments } = useDepartments();
  const createAsset = useCreateAsset();
  const navigate = useNavigate();
  const { canWrite } = useAuth();
  const [allocAsset, setAllocAsset] = useState<any | null>(null);
  const [allocMode, setAllocMode] = useState<"allocation" | "return" | "transfer">("allocation");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [subtypeFilter, setSubtypeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [sortField, setSortField] = useState("sap_code");
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const initialForm = {
    sap_code: '', name: '', bin_card_no: 0, system_info: '', serial_number: '',
    brand: '', model: '', purchase_date: '', purchase_bill_no: '', purchase_cost: '',
    vendor_id: '', category_id: '', current_location_id: '', current_employee_id: '',
    company_id: '', department_id: '',
    status: 'available' as any, notes: '', warranty_start: '', warranty_end: '',
    asset_subtype: 'other' as any, imei: '', imei2: '', mobile_number: '', sim_provider: '',
    license_key: '', specifications: '',
  };
  const [form, setForm] = useState(initialForm);

  const activeFilterCount = [statusFilter, subtypeFilter, locationFilter, companyFilter, vendorFilter, employeeFilter].filter(f => f !== 'all').length;

  const filtered = useMemo(() => {
    let result = (assets || []).filter((a: any) => {
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        a.sap_code?.toLowerCase().includes(q) ||
        a.name?.toLowerCase().includes(q) ||
        a.employees?.name?.toLowerCase().includes(q) ||
        a.serial_number?.toLowerCase().includes(q) ||
        a.mobile_number?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      const matchesSubtype = subtypeFilter === "all" || a.asset_subtype === subtypeFilter;
      const matchesLocation = locationFilter === "all" || a.current_location_id === locationFilter;
      const matchesCompany = companyFilter === "all" || a.company_id === companyFilter;
      const matchesVendor = vendorFilter === "all" || a.vendor_id === vendorFilter;
      const matchesEmployee = employeeFilter === "all" || a.current_employee_id === employeeFilter;
      return matchesSearch && matchesStatus && matchesSubtype && matchesLocation && matchesCompany && matchesVendor && matchesEmployee;
    });
    result.sort((a: any, b: any) => {
      const av = a[sortField] ?? '';
      const bv = b[sortField] ?? '';
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [assets, search, statusFilter, subtypeFilter, locationFilter, companyFilter, vendorFilter, employeeFilter, sortField, sortDir]);

  const clearFilters = () => {
    setStatusFilter("all"); setSubtypeFilter("all"); setLocationFilter("all");
    setCompanyFilter("all"); setVendorFilter("all"); setEmployeeFilter("all");
  };

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />;
  };

  const handleCreate = async () => {
    if (!form.sap_code || !form.name || !form.bin_card_no) {
      toast({ title: "Error", description: "SAP Code, Name, and Bin Card No. are required", variant: "destructive" });
      return;
    }
    try {
      await createAsset.mutateAsync({
        sap_code: form.sap_code, name: form.name, bin_card_no: form.bin_card_no,
        system_info: form.system_info || null, serial_number: form.serial_number || null,
        brand: form.brand || null, model: form.model || null,
        purchase_date: form.purchase_date || null, purchase_bill_no: form.purchase_bill_no || null,
        purchase_cost: form.purchase_cost ? parseFloat(form.purchase_cost) : null,
        vendor_id: form.vendor_id || null, category_id: form.category_id || null,
        current_location_id: form.current_location_id || null, current_employee_id: form.current_employee_id || null,
        company_id: form.company_id || null, department_id: form.department_id || null,
        status: form.status, notes: form.notes || null,
        warranty_start: form.warranty_start || null, warranty_end: form.warranty_end || null,
        asset_subtype: form.asset_subtype || 'other',
        imei: form.imei || null, imei2: form.imei2 || null,
        mobile_number: form.mobile_number || null, sim_provider: form.sim_provider || null,
        license_key: form.license_key || null, specifications: form.specifications || null,
      });
      toast({ title: "Success", description: "Asset created successfully" });
      setShowCreate(false);
      setForm(initialForm);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assets Registry</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} of {(assets || []).length} assets</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportAssetReport(filtered)}>
            <Download className="h-4 w-4 mr-1" /> Export PDF
          </Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Add Asset</Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create New Asset</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <Label>Asset Type *</Label>
                <Select value={form.asset_subtype} onValueChange={v => setForm(f => ({ ...f, asset_subtype: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SUBTYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>SAP Code *</Label><Input value={form.sap_code} onChange={e => setForm(f => ({ ...f, sap_code: e.target.value }))} placeholder="MCD-31" /></div>
              <div><Label>Bin Card No. *</Label><Input type="number" value={form.bin_card_no || ''} onChange={e => setForm(f => ({ ...f, bin_card_no: parseInt(e.target.value) || 0 }))} /></div>
              <div className="col-span-2"><Label>Asset Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="col-span-2"><Label>System Info</Label><Textarea value={form.system_info} onChange={e => setForm(f => ({ ...f, system_info: e.target.value }))} placeholder="I5 12500 / 8GB / 512GB" /></div>
              <div><Label>Serial Number</Label><Input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} /></div>
              <div><Label>Brand</Label><Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} /></div>
              <div><Label>Model</Label><Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <DynamicFields subtype={form.asset_subtype} form={form} setForm={setForm} />

              <div><Label>Purchase Date</Label><Input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} /></div>
              <div><Label>Purchase Cost (₹)</Label><Input type="number" value={form.purchase_cost} onChange={e => setForm(f => ({ ...f, purchase_cost: e.target.value }))} /></div>
              <div><Label>Purchase Bill No.</Label><Input value={form.purchase_bill_no} onChange={e => setForm(f => ({ ...f, purchase_bill_no: e.target.value }))} /></div>
              <div>
                <Label>Vendor</Label>
                <Select value={form.vendor_id} onValueChange={v => setForm(f => ({ ...f, vendor_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>{(vendors || []).map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{(categories || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
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
                <Select value={form.current_location_id} onValueChange={v => setForm(f => ({ ...f, current_location_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{(locations || []).map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Department</Label>
                <Select value={form.department_id} onValueChange={v => setForm(f => ({ ...f, department_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{(departments || []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assign To Employee</Label>
                <Select value={form.current_employee_id} onValueChange={v => setForm(f => ({ ...f, current_employee_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{(employees || []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name} ({e.department})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {!['antivirus', 'software_license', 'sap_license'].includes(form.asset_subtype) && (
                <>
                  <div><Label>Warranty Start</Label><Input type="date" value={form.warranty_start} onChange={e => setForm(f => ({ ...f, warranty_start: e.target.value }))} /></div>
                  <div><Label>Warranty End</Label><Input type="date" value={form.warranty_end} onChange={e => setForm(f => ({ ...f, warranty_end: e.target.value }))} /></div>
                </>
              )}
              <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createAsset.isPending}>{createAsset.isPending ? 'Creating...' : 'Create Asset'}</Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map(qf => {
          const isActive = statusFilter === qf.status && subtypeFilter === qf.subtype;
          return (
            <Button key={qf.label} variant={isActive ? "default" : "outline"} size="sm" className="text-xs h-7"
              onClick={() => { setStatusFilter(qf.status); setSubtypeFilter(qf.subtype); }}>
              {qf.label}
            </Button>
          );
        })}
      </div>

      {/* Search + Advanced Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search SAP code, name, employee, serial, mobile..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1.5">
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">{activeFilterCount}</Badge>}
              </Button>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
                  <X className="h-3 w-3" /> Clear
                </Button>
              )}
            </div>
            {showFilters && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Asset Type</label>
                  <Select value={subtypeFilter} onValueChange={setSubtypeFilter}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {SUBTYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Location</label>
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {(locations || []).map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Company</label>
                  <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {(companies || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Vendor</label>
                  <Select value={vendorFilter} onValueChange={setVendorFilter}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {(vendors || []).map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Employee</label>
                  <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {(employees || []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b bg-muted/30">
                  <th className="w-10 py-3 px-3">
                    <Checkbox
                      checked={filtered.length > 0 && filtered.every((a: any) => selectedIds.has(a.id))}
                      onCheckedChange={(checked) => {
                        const next = new Set(selectedIds);
                        if (checked) filtered.forEach((a: any) => next.add(a.id));
                        else filtered.forEach((a: any) => next.delete(a.id));
                        setSelectedIds(next);
                      }}
                      aria-label="Select all"
                    />
                  </th>
                  {[
                    { key: 'sap_code', label: 'SAP Code' },
                    { key: 'bin_card_no', label: 'Bin #' },
                    { key: 'name', label: 'Asset Name' },
                    { key: 'asset_subtype', label: 'Type' },
                    { key: 'serial_number', label: 'Serial No.' },
                    { key: 'employee', label: 'Assigned To' },
                    { key: 'location', label: 'Location' },
                    { key: 'status', label: 'Status' },
                    { key: 'actions', label: '' },
                  ].map(col => (
                    <th key={col.key} onClick={col.key !== 'actions' ? () => toggleSort(col.key) : undefined}
                      className={`text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider ${col.key !== 'actions' ? 'cursor-pointer hover:text-foreground' : ''} transition-colors`}>
                      {col.label}<SortIcon field={col.key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((asset: any) => (
                  <tr key={asset.id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${selectedIds.has(asset.id) ? 'bg-accent/5' : ''}`}>
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(asset.id)}
                        onCheckedChange={(checked) => {
                          const next = new Set(selectedIds);
                          if (checked) next.add(asset.id); else next.delete(asset.id);
                          setSelectedIds(next);
                        }}
                        aria-label={`Select ${asset.sap_code}`}
                      />
                    </td>
                    <td className="py-3 px-3 font-mono text-xs font-semibold text-accent">{asset.sap_code}</td>
                    <td className="py-3 px-3 text-muted-foreground">{asset.bin_card_no}</td>
                    <td className="py-3 px-3 font-medium">{asset.name}</td>
                    <td className="py-3 px-3">
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {statusLabel(asset.asset_subtype || 'other')}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-muted-foreground">{asset.serial_number || '—'}</td>
                    <td className="py-3 px-3">{asset.employees?.name || '—'}</td>
                    <td className="py-3 px-3 text-muted-foreground">{asset.locations?.name || '—'}</td>
                    <td className="py-3 px-3"><StatusBadge status={statusLabel(asset.status)} /></td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 justify-end">
                        {canWrite && asset.status === "available" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-accent hover:bg-accent/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAllocMode("allocation");
                                  setAllocAsset(asset);
                                }}
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Allocate</TooltipContent>
                          </Tooltip>
                        )}
                        {canWrite && asset.status === "allocated" && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAllocMode("transfer");
                                    setAllocAsset(asset);
                                  }}
                                >
                                  <ArrowRightLeft className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Transfer</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAllocMode("return");
                                    setAllocAsset(asset);
                                  }}
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Return</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigate(`/assets/${asset.id}`)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="py-12 text-center text-muted-foreground">No assets found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {allocAsset && (
        <AllocationDialog
          asset={allocAsset}
          open={!!allocAsset}
          onOpenChange={(o) => { if (!o) setAllocAsset(null); }}
          defaultMode={allocMode}
        />
      )}

      <BulkActionsBar
        selected={filtered.filter((a: any) => selectedIds.has(a.id))}
        onClear={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
