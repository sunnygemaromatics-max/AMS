
-- Asset subtype enum
CREATE TYPE public.asset_subtype AS ENUM (
  'laptop', 'desktop', 'printer', 'scanner', 'server',
  'mobile_device', 'tablet',
  'antivirus', 'email_account', 'sap_license', 'software_license',
  'networking', 'ups', 'other'
);

-- Departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id),
  location_id UUID REFERENCES public.locations(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert departments" ON public.departments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update departments" ON public.departments FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Licenses table
CREATE TABLE public.licenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  license_type TEXT NOT NULL,
  license_key TEXT,
  product_name TEXT,
  email_id TEXT,
  domain TEXT,
  sap_user_id TEXT,
  sap_license_type TEXT,
  validity_start DATE,
  validity_end DATE,
  max_users INTEGER,
  current_users INTEGER DEFAULT 0,
  assigned_employee_id UUID REFERENCES public.employees(id),
  assigned_asset_id UUID REFERENCES public.assets(id),
  company_id UUID REFERENCES public.companies(id),
  location_id UUID REFERENCES public.locations(id),
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view licenses" ON public.licenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert licenses" ON public.licenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update licenses" ON public.licenses FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER update_licenses_updated_at BEFORE UPDATE ON public.licenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add columns to assets
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS asset_subtype public.asset_subtype DEFAULT 'other';
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS imei2 TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS mobile_number TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS sim_provider TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id);

-- Add columns to employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS designation TEXT;

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.assets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.licenses;
