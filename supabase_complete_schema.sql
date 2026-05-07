-- ============================================================
-- COMPLETE DATABASE SCHEMA EXPORT
-- For Migration to PostgreSQL or Microsoft SQL Server
-- Generated: May 8, 2026
-- ============================================================

-- ============================================================
-- SECTION 1: ENUM TYPES (PostgreSQL specific)
-- For SQL Server: Convert these to VARCHAR with CHECK constraints
-- ============================================================

-- Asset Status Enum
DO $$ BEGIN
  CREATE TYPE public.asset_status AS ENUM ('available','allocated','under_maintenance','lost','damaged','scrapped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Asset Type Enum
DO $$ BEGIN
  CREATE TYPE public.asset_type AS ENUM ('tangible','intangible');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Transaction Type Enum
DO $$ BEGIN
  CREATE TYPE public.transaction_type AS ENUM ('allocation','return','transfer','maintenance_start','maintenance_end','lost','damaged','scrapped','purchase');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Asset Subtype Enum
DO $$ BEGIN
  CREATE TYPE public.asset_subtype AS ENUM ('laptop','desktop','printer','scanner','server','mobile_device','tablet','antivirus','email_account','sap_license','software_license','networking','ups','other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- App Role Enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','it','hr','viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Approval Status Enum
DO $$ BEGIN
  CREATE TYPE public.approval_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- SECTION 2: CORE TABLES
-- ============================================================

-- Companies Table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Locations Table
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

-- Departments Table
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

-- Categories Table
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

-- Vendors Table
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

-- Employees Table
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department_id UUID REFERENCES public.departments(id),
  location_id UUID REFERENCES public.locations(id),
  company_id UUID REFERENCES public.companies(id),
  reporting_manager UUID REFERENCES public.employees(id),
  employee_type TEXT,
  designation TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assets Table
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sap_code TEXT NOT NULL UNIQUE,
  bin_card_no INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  vendor_id UUID REFERENCES public.vendors(id),
  company_id UUID REFERENCES public.companies(id),
  location_id UUID REFERENCES public.locations(id),
  current_employee_id UUID REFERENCES public.employees(id),
  current_location_id UUID REFERENCES public.locations(id),
  purchase_date DATE,
  purchase_cost NUMERIC(15,2),
  status public.asset_status NOT NULL DEFAULT 'available',
  asset_type public.asset_type NOT NULL DEFAULT 'tangible',
  asset_subtype public.asset_subtype,
  serial_number TEXT,
  model_number TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Licenses Table
CREATE TABLE IF NOT EXISTS public.licenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  license_key TEXT NOT NULL,
  license_type TEXT,
  software_name TEXT NOT NULL,
  vendor_id UUID REFERENCES public.vendors(id),
  seats INTEGER DEFAULT 1,
  assigned_employee_id UUID REFERENCES public.employees(id),
  assigned_asset_id UUID REFERENCES public.assets(id),
  company_id UUID REFERENCES public.companies(id),
  location_id UUID REFERENCES public.locations(id),
  purchase_date DATE,
  expiry_date DATE,
  cost NUMERIC(15,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Asset Transactions Table
CREATE TABLE IF NOT EXISTS public.asset_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id),
  transaction_type public.transaction_type NOT NULL,
  from_employee_id UUID REFERENCES public.employees(id),
  to_employee_id UUID REFERENCES public.employees(id),
  from_location_id UUID REFERENCES public.locations(id),
  to_location_id UUID REFERENCES public.locations(id),
  performed_by UUID,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles Table (for user management)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  approval_status public.approval_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Audit Log Table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  performed_by UUID,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization Settings Table
CREATE TABLE IF NOT EXISTS public.organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name TEXT NOT NULL DEFAULT 'Asset Management System',
  org_address TEXT,
  org_phone TEXT,
  org_email TEXT,
  org_website TEXT,
  logo_url TEXT,
  primary_color TEXT,
  pdf_footer_text TEXT,
  email_alerts_enabled BOOLEAN DEFAULT false,
  email_alert_recipients TEXT[] DEFAULT '{}',
  email_alert_days_before INTEGER DEFAULT 30,
  email_alert_time TEXT DEFAULT '09:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Import Runs Table
CREATE TABLE IF NOT EXISTS public.import_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  success_rows INTEGER NOT NULL DEFAULT 0,
  error_rows INTEGER NOT NULL DEFAULT 0,
  errors JSONB,
  started_by UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- SECTION 3: INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_assets_sap_code ON public.assets(sap_code);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_employee ON public.assets(current_employee_id);
CREATE INDEX IF NOT EXISTS idx_assets_location ON public.assets(current_location_id);
CREATE INDEX IF NOT EXISTS idx_assets_category ON public.assets(category_id);
CREATE INDEX IF NOT EXISTS idx_employees_reporting_manager ON public.employees(reporting_manager);
CREATE INDEX IF NOT EXISTS idx_employees_department ON public.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_location ON public.employees(location_id);
CREATE INDEX IF NOT EXISTS idx_locations_company ON public.locations(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_company ON public.departments(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_location ON public.departments(location_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON public.audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_transactions_asset ON public.asset_transactions(asset_id);
CREATE INDEX IF NOT EXISTS idx_licenses_expiry ON public.licenses(expiry_date);

-- ============================================================
-- SECTION 4: TRIGGERS AND FUNCTIONS
-- ============================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_locations_updated_at ON public.locations;
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_departments_updated_at ON public.departments;
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendors_updated_at ON public.vendors;
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_employees_updated_at ON public.employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_assets_updated_at ON public.assets;
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_licenses_updated_at ON public.licenses;
CREATE TRIGGER update_licenses_updated_at BEFORE UPDATE ON public.licenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_org_settings_updated ON public.organization_settings;
CREATE TRIGGER trg_org_settings_updated BEFORE UPDATE ON public.organization_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, approval_status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email), 'pending')
  ON CONFLICT (id) DO NOTHING;

  SELECT COUNT(*) INTO v_count FROM public.profiles WHERE approval_status = 'approved';
  IF v_count = 0 THEN
    UPDATE public.profiles SET approval_status = 'approved', approved_at = now() WHERE id = NEW.id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Next bin card number function
CREATE OR REPLACE FUNCTION public.next_bin_card_no()
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(bin_card_no), 0) + 1 FROM public.assets;
$$ LANGUAGE sql STABLE SET search_path = public;

-- ============================================================
-- SECTION 5: SECURITY FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = p_role);
END; $$;

CREATE OR REPLACE FUNCTION public.is_approved(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND approval_status = 'approved');
END; $$;

CREATE OR REPLACE FUNCTION public.can_write_assets(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  RETURN public.is_approved(p_user_id) AND (public.has_role(p_user_id, 'admin') OR public.has_role(p_user_id, 'it'));
END; $$;

-- ============================================================
-- SECTION 6: RLS POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_runs ENABLE ROW LEVEL SECURITY;

-- Entity table policies
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'companies', 'locations', 'departments', 'categories', 'vendors', 
    'licenses', 'asset_transactions', 'import_runs'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Approved view %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admin IT insert %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admin IT update %1$s" ON public.%1$s', t);
    
    EXECUTE format('CREATE POLICY "Approved view %1$s" ON public.%1$s FOR SELECT TO authenticated USING (public.is_approved(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Admin IT insert %1$s" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), ''admin'') OR public.has_role(auth.uid(), ''it''))', t);
    EXECUTE format('CREATE POLICY "Admin IT update %1$s" ON public.%1$s FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), ''admin'') OR public.has_role(auth.uid(), ''it''))', t);
  END LOOP;
END $$;

-- Assets policies (with delete)
DROP POLICY IF EXISTS "Approved view assets" ON public.assets;
DROP POLICY IF EXISTS "Admin IT insert assets" ON public.assets;
DROP POLICY IF EXISTS "Admin IT update assets" ON public.assets;
DROP POLICY IF EXISTS "Admin IT delete assets" ON public.assets;
CREATE POLICY "Approved view assets" ON public.assets FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "Admin IT insert assets" ON public.assets FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it'));
CREATE POLICY "Admin IT update assets" ON public.assets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it'));
CREATE POLICY "Admin IT delete assets" ON public.assets FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it'));

-- Employees policies (with HR role)
DROP POLICY IF EXISTS "Approved view employees" ON public.employees;
DROP POLICY IF EXISTS "Admin IT HR insert employees" ON public.employees;
DROP POLICY IF EXISTS "Admin IT HR update employees" ON public.employees;
CREATE POLICY "Approved view employees" ON public.employees FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "Admin IT HR insert employees" ON public.employees FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it') OR public.has_role(auth.uid(), 'hr')));
CREATE POLICY "Admin IT HR update employees" ON public.employees FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it') OR public.has_role(auth.uid(), 'hr')));

-- Profiles policies
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins insert profiles" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Admins update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR id = auth.uid());

-- User roles policies
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Audit log policies
DROP POLICY IF EXISTS "Approved view audit" ON public.audit_log;
CREATE POLICY "Approved view audit" ON public.audit_log FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));

-- Organization settings policies
DROP POLICY IF EXISTS "Approved view org settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Admins insert org settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Admins update org settings" ON public.organization_settings;
CREATE POLICY "Approved view org settings" ON public.organization_settings FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "Admins insert org settings" ON public.organization_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update org settings" ON public.organization_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- SECTION 7: SEED DATA
-- ============================================================

-- Seed organization settings
INSERT INTO public.organization_settings (org_name, pdf_footer_text)
VALUES ('Asset Management System', 'Generated by Asset Management System')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 8: COMPLETION
-- ============================================================

SELECT 'Schema created successfully!' as status;
