-- ============================================================
-- AMS — Complete Idempotent Setup (safe to run multiple times)
-- Project: dfznpbbqianbsgwxmcbs
-- ============================================================

-- ============================================================
-- SECTION 1 — ENUMS (idempotent via exception handler)
-- ============================================================

DO $$ BEGIN CREATE TYPE public.asset_status AS ENUM ('available','allocated','under_maintenance','lost','damaged','scrapped'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.asset_type AS ENUM ('tangible','intangible'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.transaction_type AS ENUM ('allocation','return','transfer','maintenance_start','maintenance_end','lost','damaged','scrapped','purchase'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.asset_subtype AS ENUM ('laptop','desktop','printer','scanner','server','mobile_device','tablet','antivirus','email_account','sap_license','software_license','networking','ups','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin','it','hr','viewer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.approval_status AS ENUM ('pending','approved','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- SECTION 2 — SHARED UTILITY FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- SECTION 3 — CORE TABLES (CREATE IF NOT EXISTS)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.locations (
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
DROP TRIGGER IF EXISTS update_locations_updated_at ON public.locations;
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.departments (
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
DROP TRIGGER IF EXISTS update_departments_updated_at ON public.departments;
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.categories (
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
DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.vendors (
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
DROP TRIGGER IF EXISTS update_vendors_updated_at ON public.vendors;
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department TEXT NOT NULL DEFAULT 'General',
  role TEXT,
  designation TEXT,
  department_id UUID REFERENCES public.departments(id),
  location_id UUID REFERENCES public.locations(id),
  company_id UUID REFERENCES public.companies(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  employee_type TEXT DEFAULT 'full_time' CHECK (employee_type IN ('full_time','part_time','contractor','intern','temporary')),
  reporting_manager TEXT,
  access_level TEXT DEFAULT 'standard' CHECK (access_level IN ('standard','elevated','admin','restricted')),
  emergency_contact TEXT,
  secondary_email TEXT,
  date_of_joining DATE,
  work_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_employees_updated_at ON public.employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_employees_reporting_manager ON public.employees(reporting_manager);
CREATE INDEX IF NOT EXISTS idx_employees_employee_type ON public.employees(employee_type);

CREATE TABLE IF NOT EXISTS public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sap_code TEXT NOT NULL UNIQUE,
  bin_card_no INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  system_info TEXT,
  serial_number TEXT,
  imei TEXT,
  imei2 TEXT,
  iccid TEXT,
  mobile_number TEXT,
  sim_provider TEXT,
  license_key TEXT,
  brand TEXT,
  model TEXT,
  specifications TEXT,
  asset_subtype public.asset_subtype DEFAULT 'other',
  category_id UUID REFERENCES public.categories(id),
  department_id UUID REFERENCES public.departments(id),
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
DROP TRIGGER IF EXISTS update_assets_updated_at ON public.assets;
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_assets_sap_code ON public.assets(sap_code);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_employee ON public.assets(current_employee_id);
CREATE INDEX IF NOT EXISTS idx_assets_location ON public.assets(current_location_id);

-- Backfill missing columns on existing assets table (if table pre-existed)
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS iccid TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS imei2 TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS mobile_number TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS sim_provider TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id);
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS asset_subtype public.asset_subtype DEFAULT 'other';

CREATE TABLE IF NOT EXISTS public.licenses (
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
DROP TRIGGER IF EXISTS update_licenses_updated_at ON public.licenses;
CREATE TRIGGER update_licenses_updated_at BEFORE UPDATE ON public.licenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.asset_transactions (
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
CREATE INDEX IF NOT EXISTS idx_transactions_asset ON public.asset_transactions(asset_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.asset_transactions(transaction_type);

CREATE TABLE IF NOT EXISTS public.audit_log (
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
CREATE INDEX IF NOT EXISTS idx_audit_table ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_record ON public.audit_log(record_id);

CREATE TABLE IF NOT EXISTS public.import_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  performed_by UUID,
  performed_by_name TEXT,
  file_names TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  total_rows INT NOT NULL DEFAULT 0,
  inserted INT NOT NULL DEFAULT 0,
  skipped INT NOT NULL DEFAULT 0,
  failed INT NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '[]'::JSONB,
  snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
  inserted_ids JSONB NOT NULL DEFAULT '{}'::JSONB,
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.import_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_import_runs_created_at ON public.import_runs(created_at DESC);

-- Backfill rollback columns if import_runs pre-existed without them
ALTER TABLE public.import_runs ADD COLUMN IF NOT EXISTS snapshot JSONB NOT NULL DEFAULT '{}'::JSONB;
ALTER TABLE public.import_runs ADD COLUMN IF NOT EXISTS inserted_ids JSONB NOT NULL DEFAULT '{}'::JSONB;
ALTER TABLE public.import_runs ADD COLUMN IF NOT EXISTS rolled_back_at TIMESTAMPTZ;
ALTER TABLE public.import_runs ADD COLUMN IF NOT EXISTS rolled_back_by UUID;

CREATE TABLE IF NOT EXISTS public.organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name TEXT NOT NULL DEFAULT 'The Studio Infinito',
  org_address TEXT,
  org_phone TEXT,
  org_email TEXT,
  org_website TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1e293b',
  pdf_footer_text TEXT DEFAULT 'Powered by Personify Crafters',
  email_alerts_enabled BOOLEAN NOT NULL DEFAULT false,
  email_alert_recipients TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  email_alert_days_before INTEGER NOT NULL DEFAULT 10,
  email_alert_time TIME NOT NULL DEFAULT '09:00:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_org_settings_updated ON public.organization_settings;
CREATE TRIGGER trg_org_settings_updated BEFORE UPDATE ON public.organization_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed org row (idempotent)
INSERT INTO public.organization_settings (org_name, pdf_footer_text)
SELECT 'The Studio Infinito', 'Powered by Personify Crafters — © All Rights Reserved'
WHERE NOT EXISTS (SELECT 1 FROM public.organization_settings LIMIT 1);

-- ============================================================
-- SECTION 4 — PROFILES & ROLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  approval_status public.approval_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECTION 5 — SECURITY FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND approval_status = 'approved')
$$;

CREATE OR REPLACE FUNCTION public.can_write_assets(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_approved(_user_id) AND (public.has_role(_user_id,'admin') OR public.has_role(_user_id,'it'))
$$;

CREATE OR REPLACE FUNCTION public.next_bin_card_no()
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(bin_card_no), 0) + 1 FROM public.assets;
$$ LANGUAGE sql STABLE SET search_path = public;

-- ============================================================
-- SECTION 6 — AUTO-PROFILE TRIGGER (first signup = admin)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, approval_status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email), 'pending')
  ON CONFLICT (id) DO NOTHING;

  SELECT COUNT(*) INTO v_count FROM public.profiles;
  IF v_count = 1 THEN
    UPDATE public.profiles SET approval_status = 'approved', approved_at = now() WHERE id = NEW.id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- SECTION 7 — ASSET STATUS SYNC TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_asset_on_transaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.transaction_type = 'allocation' THEN
    UPDATE public.assets SET status = 'allocated', current_employee_id = NEW.to_employee_id,
      current_location_id = COALESCE(NEW.to_location_id, current_location_id), updated_at = now() WHERE id = NEW.asset_id;
  ELSIF NEW.transaction_type = 'return' THEN
    UPDATE public.assets SET status = 'available', current_employee_id = NULL,
      current_location_id = COALESCE(NEW.to_location_id, current_location_id), updated_at = now() WHERE id = NEW.asset_id;
  ELSIF NEW.transaction_type = 'transfer' THEN
    UPDATE public.assets SET current_employee_id = NEW.to_employee_id,
      current_location_id = COALESCE(NEW.to_location_id, current_location_id), updated_at = now() WHERE id = NEW.asset_id;
  ELSIF NEW.transaction_type = 'maintenance_start' THEN
    UPDATE public.assets SET status = 'under_maintenance', updated_at = now() WHERE id = NEW.asset_id;
  ELSIF NEW.transaction_type = 'maintenance_end' THEN
    UPDATE public.assets SET status = 'available', updated_at = now() WHERE id = NEW.asset_id;
  ELSIF NEW.transaction_type IN ('lost','damaged','scrapped') THEN
    UPDATE public.assets SET status = NEW.transaction_type::public.asset_status, updated_at = now() WHERE id = NEW.asset_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_asset_on_transaction ON public.asset_transactions;
CREATE TRIGGER trg_sync_asset_on_transaction
  AFTER INSERT ON public.asset_transactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_asset_on_transaction();

-- ============================================================
-- SECTION 8 — ROW LEVEL SECURITY POLICIES (drop+recreate = idempotent)
-- ============================================================

-- Profiles
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins insert profiles" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Admins update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR id = auth.uid());

-- User Roles
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Assets
DROP POLICY IF EXISTS "Approved users view assets" ON public.assets;
DROP POLICY IF EXISTS "IT/Admin insert assets" ON public.assets;
DROP POLICY IF EXISTS "IT/Admin update assets" ON public.assets;
DROP POLICY IF EXISTS "IT/Admin delete assets" ON public.assets;
DROP POLICY IF EXISTS "Authenticated users can view assets" ON public.assets;
DROP POLICY IF EXISTS "Authenticated users can insert assets" ON public.assets;
DROP POLICY IF EXISTS "Authenticated users can update assets" ON public.assets;
CREATE POLICY "Approved users view assets" ON public.assets FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "IT/Admin insert assets" ON public.assets FOR INSERT TO authenticated WITH CHECK (public.can_write_assets(auth.uid()));
CREATE POLICY "IT/Admin update assets" ON public.assets FOR UPDATE TO authenticated USING (public.can_write_assets(auth.uid()));
CREATE POLICY "IT/Admin delete assets" ON public.assets FOR DELETE TO authenticated USING (public.can_write_assets(auth.uid()));

-- Employees
DROP POLICY IF EXISTS "Approved view employees" ON public.employees;
DROP POLICY IF EXISTS "HR/IT/Admin insert employees" ON public.employees;
DROP POLICY IF EXISTS "HR/IT/Admin update employees" ON public.employees;
DROP POLICY IF EXISTS "IT/Admin delete employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can update employees" ON public.employees;
CREATE POLICY "Approved view employees" ON public.employees FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "HR/IT/Admin insert employees" ON public.employees FOR INSERT TO authenticated
  WITH CHECK (public.is_approved(auth.uid()) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr') OR public.has_role(auth.uid(),'it')));
CREATE POLICY "HR/IT/Admin update employees" ON public.employees FOR UPDATE TO authenticated
  USING (public.is_approved(auth.uid()) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr') OR public.has_role(auth.uid(),'it')));
CREATE POLICY "IT/Admin delete employees" ON public.employees FOR DELETE TO authenticated
  USING (public.is_approved(auth.uid()) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr') OR public.has_role(auth.uid(),'it')));

-- All remaining tables (drop old + create new)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['locations','companies','departments','categories','vendors','licenses','asset_transactions','audit_log','import_runs'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can view %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can insert %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can update %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Approved view %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "IT/Admin insert %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "IT/Admin update %1$s" ON public.%1$s', t);
    EXECUTE format('CREATE POLICY "Approved view %1$s" ON public.%1$s FOR SELECT TO authenticated USING (public.is_approved(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "IT/Admin insert %1$s" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (public.can_write_assets(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "IT/Admin update %1$s" ON public.%1$s FOR UPDATE TO authenticated USING (public.can_write_assets(auth.uid()))', t);
  END LOOP;
END $$;

-- Extra delete policies
DROP POLICY IF EXISTS "IT/Admin delete licenses" ON public.licenses;
DROP POLICY IF EXISTS "IT/Admin delete asset_transactions" ON public.asset_transactions;
DROP POLICY IF EXISTS "IT/Admin update import_runs" ON public.import_runs;
CREATE POLICY "IT/Admin delete licenses" ON public.licenses FOR DELETE TO authenticated USING (public.can_write_assets(auth.uid()));
CREATE POLICY "IT/Admin delete asset_transactions" ON public.asset_transactions FOR DELETE TO authenticated USING (public.can_write_assets(auth.uid()));
CREATE POLICY "IT/Admin update import_runs" ON public.import_runs FOR UPDATE TO authenticated USING (public.can_write_assets(auth.uid())) WITH CHECK (public.can_write_assets(auth.uid()));

-- Org settings
DROP POLICY IF EXISTS "Approved view org settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Admins insert org settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Admins update org settings" ON public.organization_settings;
CREATE POLICY "Approved view org settings" ON public.organization_settings FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "Admins insert org settings" ON public.organization_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update org settings" ON public.organization_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- SECTION 9 — STORAGE (branding bucket)
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('branding','branding',true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Branding public read" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload branding" ON storage.objects;
DROP POLICY IF EXISTS "Admins update branding" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete branding" ON storage.objects;
CREATE POLICY "Branding public read" ON storage.objects FOR SELECT USING (bucket_id = 'branding');
CREATE POLICY "Admins upload branding" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update branding" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'branding' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete branding" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'branding' AND public.has_role(auth.uid(),'admin'));

-- ============================================================
-- SECTION 10 — REALTIME
-- ============================================================

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.assets; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.licenses; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- DONE. Next steps:
-- 1. Sign up at the app with admin@tsi.com / TSI@1234
-- 2. First signup is automatically approved + given admin role.
-- ============================================================
