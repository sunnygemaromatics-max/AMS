-- ==========================================
-- 1. ROLES & PROFILES
-- ==========================================
CREATE TYPE public.app_role AS ENUM ('admin', 'it', 'hr', 'viewer');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.profiles (
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

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. SECURITY DEFINER FUNCTIONS (no recursion)
-- ==========================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND approval_status = 'approved')
$$;

CREATE OR REPLACE FUNCTION public.can_write_assets(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_approved(_user_id) AND (
    public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'it')
  )
$$;

-- ==========================================
-- 3. AUTO-PROFILE TRIGGER
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, approval_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    'pending'
  );

  -- First user becomes auto-approved admin
  SELECT COUNT(*) INTO v_count FROM public.profiles;
  IF v_count = 1 THEN
    UPDATE public.profiles SET approval_status = 'approved', approved_at = now() WHERE id = NEW.id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 4. PROFILE / ROLES POLICIES
-- ==========================================
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND approval_status = (SELECT approval_status FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admins update any profile" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert profiles" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR id = auth.uid());

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ==========================================
-- 5. UPDATE EXISTING TABLE POLICIES (require approval + roles)
-- ==========================================
-- ASSETS
DROP POLICY IF EXISTS "Authenticated users can view assets" ON public.assets;
DROP POLICY IF EXISTS "Authenticated users can insert assets" ON public.assets;
DROP POLICY IF EXISTS "Authenticated users can update assets" ON public.assets;
CREATE POLICY "Approved users view assets" ON public.assets FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "IT/Admin insert assets" ON public.assets FOR INSERT TO authenticated WITH CHECK (public.can_write_assets(auth.uid()));
CREATE POLICY "IT/Admin update assets" ON public.assets FOR UPDATE TO authenticated USING (public.can_write_assets(auth.uid()));

-- EMPLOYEES (HR can write too)
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can update employees" ON public.employees;
CREATE POLICY "Approved view employees" ON public.employees FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "HR/IT/Admin insert employees" ON public.employees FOR INSERT TO authenticated
  WITH CHECK (public.is_approved(auth.uid()) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr') OR public.has_role(auth.uid(),'it')));
CREATE POLICY "HR/IT/Admin update employees" ON public.employees FOR UPDATE TO authenticated
  USING (public.is_approved(auth.uid()) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr') OR public.has_role(auth.uid(),'it')));

-- LOCATIONS, COMPANIES, DEPARTMENTS, CATEGORIES, VENDORS — same pattern (admin/it write)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['locations','companies','departments','categories','vendors','licenses','asset_transactions','audit_log']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can view %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can insert %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can update %1$s" ON public.%1$s', t);
    EXECUTE format('CREATE POLICY "Approved view %1$s" ON public.%1$s FOR SELECT TO authenticated USING (public.is_approved(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "IT/Admin insert %1$s" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (public.can_write_assets(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "IT/Admin update %1$s" ON public.%1$s FOR UPDATE TO authenticated USING (public.can_write_assets(auth.uid()))', t);
  END LOOP;
END $$;

-- ==========================================
-- 6. AUTOMATION: bin card → asset status sync
-- ==========================================
CREATE OR REPLACE FUNCTION public.sync_asset_on_transaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.transaction_type = 'allocation' THEN
    UPDATE public.assets SET status = 'allocated', current_employee_id = NEW.to_employee_id,
      current_location_id = COALESCE(NEW.to_location_id, current_location_id), updated_at = now()
      WHERE id = NEW.asset_id;
  ELSIF NEW.transaction_type = 'return' THEN
    UPDATE public.assets SET status = 'available', current_employee_id = NULL,
      current_location_id = COALESCE(NEW.to_location_id, current_location_id), updated_at = now()
      WHERE id = NEW.asset_id;
  ELSIF NEW.transaction_type = 'transfer' THEN
    UPDATE public.assets SET current_employee_id = NEW.to_employee_id,
      current_location_id = COALESCE(NEW.to_location_id, current_location_id), updated_at = now()
      WHERE id = NEW.asset_id;
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

-- updated_at trigger for profiles
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();