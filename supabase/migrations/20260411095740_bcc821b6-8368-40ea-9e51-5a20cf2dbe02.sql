
-- Create enums
CREATE TYPE public.asset_status AS ENUM ('available', 'allocated', 'under_maintenance', 'lost', 'damaged', 'scrapped');
CREATE TYPE public.asset_type AS ENUM ('tangible', 'intangible');
CREATE TYPE public.transaction_type AS ENUM ('allocation', 'return', 'transfer', 'maintenance_start', 'maintenance_end', 'lost', 'damaged', 'scrapped', 'purchase');

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Companies
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view companies" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update companies" ON public.companies FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Locations
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  company_id UUID REFERENCES public.companies(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view locations" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert locations" ON public.locations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update locations" ON public.locations FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Categories
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.categories(id),
  asset_type public.asset_type NOT NULL DEFAULT 'tangible',
  is_consumable BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update categories" ON public.categories FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vendors
CREATE TABLE public.vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  gst_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view vendors" ON public.vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert vendors" ON public.vendors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update vendors" ON public.vendors FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Employees
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department TEXT NOT NULL,
  role TEXT,
  location_id UUID REFERENCES public.locations(id),
  company_id UUID REFERENCES public.companies(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view employees" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert employees" ON public.employees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update employees" ON public.employees FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Assets
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sap_code TEXT NOT NULL UNIQUE,
  bin_card_no INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  system_info TEXT,
  serial_number TEXT,
  imei TEXT,
  license_key TEXT,
  brand TEXT,
  model TEXT,
  specifications TEXT,
  category_id UUID REFERENCES public.categories(id),
  asset_type public.asset_type NOT NULL DEFAULT 'tangible',
  is_consumable BOOLEAN NOT NULL DEFAULT false,
  purchase_date DATE,
  purchase_bill_no TEXT,
  purchase_cost DECIMAL(12,2),
  vendor_id UUID REFERENCES public.vendors(id),
  warranty_start DATE,
  warranty_end DATE,
  amc_start DATE,
  amc_end DATE,
  amc_vendor TEXT,
  depreciation_rate DECIMAL(5,2),
  status public.asset_status NOT NULL DEFAULT 'available',
  current_employee_id UUID REFERENCES public.employees(id),
  current_location_id UUID REFERENCES public.locations(id),
  company_id UUID REFERENCES public.companies(id),
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view assets" ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert assets" ON public.assets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update assets" ON public.assets FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_assets_sap_code ON public.assets(sap_code);
CREATE INDEX idx_assets_status ON public.assets(status);
CREATE INDEX idx_assets_employee ON public.assets(current_employee_id);
CREATE INDEX idx_assets_location ON public.assets(current_location_id);

-- Asset Transactions
CREATE TABLE public.asset_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id),
  transaction_type public.transaction_type NOT NULL,
  from_employee_id UUID REFERENCES public.employees(id),
  to_employee_id UUID REFERENCES public.employees(id),
  from_location_id UUID REFERENCES public.locations(id),
  to_location_id UUID REFERENCES public.locations(id),
  condition_status TEXT,
  notes TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view transactions" ON public.asset_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert transactions" ON public.asset_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX idx_transactions_asset ON public.asset_transactions(asset_id);
CREATE INDEX idx_transactions_type ON public.asset_transactions(transaction_type);

-- Audit Log
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view audit log" ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert audit log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX idx_audit_table ON public.audit_log(table_name);
CREATE INDEX idx_audit_record ON public.audit_log(record_id);

-- Auto-generate next bin card number
CREATE OR REPLACE FUNCTION public.next_bin_card_no()
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(bin_card_no), 0) + 1 FROM public.assets;
$$ LANGUAGE sql STABLE SET search_path = public;
