import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Asset = Database["public"]["Tables"]["assets"]["Row"];
type AssetInsert = Database["public"]["Tables"]["assets"]["Insert"];
type Employee = Database["public"]["Tables"]["employees"]["Row"];
type EmployeeInsert = Database["public"]["Tables"]["employees"]["Insert"];
type Location = Database["public"]["Tables"]["locations"]["Row"];
type LocationInsert = Database["public"]["Tables"]["locations"]["Insert"];
type Company = Database["public"]["Tables"]["companies"]["Row"];
type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
type Category = Database["public"]["Tables"]["categories"]["Row"];
type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];
type Vendor = Database["public"]["Tables"]["vendors"]["Row"];
type VendorInsert = Database["public"]["Tables"]["vendors"]["Insert"];
type AssetTransaction = Database["public"]["Tables"]["asset_transactions"]["Row"];
type TransactionInsert = Database["public"]["Tables"]["asset_transactions"]["Insert"];
type Department = Database["public"]["Tables"]["departments"]["Row"];
type DepartmentInsert = Database["public"]["Tables"]["departments"]["Insert"];
type License = Database["public"]["Tables"]["licenses"]["Row"];
type LicenseInsert = Database["public"]["Tables"]["licenses"]["Insert"];

export type { Asset, AssetInsert, Employee, EmployeeInsert, Location, LocationInsert, Company, CompanyInsert, Category, CategoryInsert, Vendor, VendorInsert, AssetTransaction, TransactionInsert, Department, DepartmentInsert, License, LicenseInsert };

// Assets
export function useAssets() {
  return useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("*, employees(name, employee_code, department), locations(name, code), vendors(name), categories(name, code), departments(name, code)")
        .eq("is_deleted", false)
        .order("bin_card_no");
      if (error) throw error;
      return data;
    },
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: ["assets", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("*, employees(name, employee_code, department), locations(name, code), vendors(name), categories(name, code), departments(name, code)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (asset: AssetInsert) => {
      const { data, error } = await supabase.from("assets").insert(asset).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Asset> & { id: string }) => {
      const { data, error } = await supabase.from("assets").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
}

// Employees
export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*, locations(name), companies(name), departments(name)")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (emp: EmployeeInsert) => {
      const { data, error } = await supabase.from("employees").insert(emp).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Employee> & { id: string }) => {
      const { data, error } = await supabase.from("employees").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

// Locations
export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("*, companies(name)").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (loc: LocationInsert) => {
      const { data, error } = await supabase.from("locations").insert(loc).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locations"] }),
  });
}

// Companies
export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (company: CompanyInsert) => {
      const { data, error } = await supabase.from("companies").insert(company).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}

// Categories
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cat: CategoryInsert) => {
      const { data, error } = await supabase.from("categories").insert(cat).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

// Vendors
export function useVendors() {
  return useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendors").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vendor: VendorInsert) => {
      const { data, error } = await supabase.from("vendors").insert(vendor).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendors"] }),
  });
}

// Departments
export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("*, companies(name), locations(name)").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dept: DepartmentInsert) => {
      const { data, error } = await supabase.from("departments").insert(dept).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
}

// Licenses
export function useLicenses() {
  return useQuery({
    queryKey: ["licenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("licenses")
        .select("*, employees:assigned_employee_id(name, employee_code), assets:assigned_asset_id(sap_code, name), companies(name), locations(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (license: LicenseInsert) => {
      const { data, error } = await supabase.from("licenses").insert(license).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["licenses"] }),
  });
}

export function useUpdateLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<License> & { id: string }) => {
      const { data, error } = await supabase.from("licenses").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["licenses"] }),
  });
}

// Transactions
export function useAssetTransactions(assetId?: string) {
  return useQuery({
    queryKey: ["transactions", assetId],
    queryFn: async () => {
      let query = supabase
        .from("asset_transactions")
        .select("*, assets(sap_code, name), employees!asset_transactions_to_employee_id_fkey(name), locations!asset_transactions_to_location_id_fkey(name)")
        .order("created_at", { ascending: false });
      if (assetId) query = query.eq("asset_id", assetId);
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
    enabled: assetId ? !!assetId : true,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tx: TransactionInsert) => {
      const { data, error } = await supabase.from("asset_transactions").insert(tx).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

// Organisation settings (single row)
export interface OrgSettings {
  id: string;
  org_name: string;
  org_address: string | null;
  org_phone: string | null;
  org_email: string | null;
  org_website: string | null;
  logo_url: string | null;
  primary_color: string | null;
  pdf_footer_text: string | null;
  email_alerts_enabled: boolean;
  email_alert_recipients: string[];
  email_alert_days_before: number;
  email_alert_time: string;
}

export function useOrgSettings() {
  return useQuery({
    queryKey: ["org_settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("organization_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as OrgSettings | null;
    },
    staleTime: 60_000,
  });
}

export function useUpdateOrgSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OrgSettings> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("organization_settings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org_settings"] }),
  });
}

// Dashboard stats
export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [assetsRes, employeesRes, locationsRes, licensesRes] = await Promise.all([
        supabase.from("assets").select("id, status, purchase_cost, current_location_id, current_employee_id, sap_code, name, asset_subtype, warranty_end, department_id").eq("is_deleted", false),
        supabase.from("employees").select("id, department").eq("is_active", true),
        supabase.from("locations").select("id, name").eq("is_active", true),
        supabase.from("licenses").select("id, license_type, validity_end, status"),
      ]);
      if (assetsRes.error) throw assetsRes.error;
      if (employeesRes.error) throw employeesRes.error;
      if (locationsRes.error) throw locationsRes.error;

      const assets = assetsRes.data || [];
      const licenses = licensesRes.data || [];
      const totalValue = assets.reduce((s, a) => s + (Number(a.purchase_cost) || 0), 0);
      const allocated = assets.filter(a => a.status === 'allocated').length;
      const available = assets.filter(a => a.status === 'available').length;

      const deptStats: Record<string, number> = {};
      (employeesRes.data || []).forEach(e => { deptStats[e.department] = (deptStats[e.department] || 0) + 1; });

      // Asset subtype stats
      const subtypeStats: Record<string, number> = {};
      assets.forEach(a => {
        const st = a.asset_subtype || 'other';
        subtypeStats[st] = (subtypeStats[st] || 0) + 1;
      });

      // Location stats
      const locationStats: Record<string, number> = {};
      const locationMap = new Map((locationsRes.data || []).map(l => [l.id, l.name]));
      assets.forEach(a => {
        const locName = a.current_location_id ? locationMap.get(a.current_location_id) || 'Unknown' : 'Unassigned';
        locationStats[locName] = (locationStats[locName] || 0) + 1;
      });

      // Expiring licenses/warranties
      const now = new Date().toISOString().split('T')[0];
      const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      const expiringWarranties = assets.filter(a => a.warranty_end && a.warranty_end >= now && a.warranty_end <= thirtyDays);
      const expiringLicenses = licenses.filter(l => l.validity_end && l.validity_end >= now && l.validity_end <= thirtyDays);

      return {
        totalAssets: assets.length,
        allocated,
        available,
        totalValue,
        employeeCount: (employeesRes.data || []).length,
        locationCount: (locationsRes.data || []).length,
        licenseCount: licenses.length,
        departmentStats: Object.entries(deptStats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
        subtypeStats: Object.entries(subtypeStats).map(([name, value]) => ({ name: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), value })).sort((a, b) => b.value - a.value),
        locationStats: Object.entries(locationStats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
        expiringWarranties,
        expiringLicenses,
        assets,
      };
    },
  });
}
