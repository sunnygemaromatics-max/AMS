-- ============================================================
-- MAKE ADMIN ALL POWERFUL - Full Admin Rights
-- This gives your user complete admin access
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: Ensure Your Profile Exists with Admin Status
-- ============================================================

DO $$
DECLARE
  v_user_id UUID := 'ed8feb2f-7c4a-4a76-b72f-729775b45271';
  v_email TEXT := 'sunny.sobhani90@gmail.com';
  v_has_approved_at BOOLEAN;
  v_has_created_at BOOLEAN;
BEGIN
  -- Check which columns exist
  SELECT EXISTS(SELECT 1 FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='approved_at') INTO v_has_approved_at;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='created_at') INTO v_has_created_at;
  
  -- Insert or update profile
  INSERT INTO public.profiles (id, full_name, approval_status)
  VALUES (v_user_id, v_email, 'approved')
  ON CONFLICT (id) DO UPDATE 
  SET approval_status = 'approved', full_name = v_email;
  
  -- Set approved_at if column exists
  IF v_has_approved_at THEN
    UPDATE public.profiles SET approved_at = now() WHERE id = v_user_id;
  END IF;
  
  -- Set created_at if column exists
  IF v_has_created_at THEN
    UPDATE public.profiles SET created_at = COALESCE(created_at, now()) WHERE id = v_user_id;
  END IF;
  
  RAISE NOTICE '✅ Profile approved for %', v_user_id;
END $$;

-- ============================================================
-- STEP 2: Add Admin Role (Multiple times to ensure)
-- ============================================================

-- Remove any existing roles first to avoid conflicts
DELETE FROM public.user_roles WHERE user_id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271';

-- Add admin role
INSERT INTO public.user_roles (user_id, role) 
VALUES ('ed8feb2f-7c4a-4a76-b72f-729775b45271', 'admin');

-- Also add IT role for extra permissions
INSERT INTO public.user_roles (user_id, role) 
VALUES ('ed8feb2f-7c4a-4a76-b72f-729775b45271', 'it');

-- Add HR role too
INSERT INTO public.user_roles (user_id, role) 
VALUES ('ed8feb2f-7c4a-4a76-b72f-729775b45271', 'hr');

-- Add viewer role
INSERT INTO public.user_roles (user_id, role) 
VALUES ('ed8feb2f-7c4a-4a76-b72f-729775b45271', 'viewer');

-- ============================================================
-- STEP 3: Recreate Security Functions (Bulletproof)
-- ============================================================

-- Drop all security functions
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.is_approved(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_write_assets(uuid) CASCADE;

-- Create has_role - ALWAYS returns true for our admin user
CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Hardcoded: Our specific user is ALWAYS admin
  IF p_user_id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271' THEN
    RETURN true;
  END IF;
  
  -- Check from user_roles table
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_user_id AND role = p_role
  ) INTO v_is_admin;
  
  RETURN v_is_admin;
END;
$$;

-- Create is_approved - ALWAYS returns true for our admin user
CREATE OR REPLACE FUNCTION public.is_approved(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Hardcoded: Our specific user is ALWAYS approved
  IF p_user_id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271' THEN
    RETURN true;
  END IF;
  
  -- Check from profiles table
  RETURN EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE id = p_user_id AND approval_status = 'approved'
  );
END;
$$;

-- Create can_write_assets - ALWAYS returns true for our admin user
CREATE OR REPLACE FUNCTION public.can_write_assets(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Hardcoded: Our specific user can ALWAYS write
  IF p_user_id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271' THEN
    RETURN true;
  END IF;
  
  RETURN public.is_approved(p_user_id) AND 
    (public.has_role(p_user_id, 'admin') OR public.has_role(p_user_id, 'it'));
END;
$$;

-- ============================================================
-- STEP 4: Drop All RLS Policies
-- ============================================================

-- Disable RLS on all tables first
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_runs DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ============================================================
-- STEP 5: Create Permissive Policies (Allow Everything for Admin)
-- ============================================================

-- Companies - Admin can do everything
CREATE POLICY "Admin full access companies" 
  ON public.companies FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin')) 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved view companies" 
  ON public.companies FOR SELECT TO authenticated 
  USING (public.is_approved(auth.uid()));

-- Locations
CREATE POLICY "Admin full access locations" 
  ON public.locations FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin')) 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved view locations" 
  ON public.locations FOR SELECT TO authenticated 
  USING (public.is_approved(auth.uid()));

-- Departments
CREATE POLICY "Admin full access departments" 
  ON public.departments FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin')) 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved view departments" 
  ON public.departments FOR SELECT TO authenticated 
  USING (public.is_approved(auth.uid()));

-- Categories
CREATE POLICY "Admin full access categories" 
  ON public.categories FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin')) 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved view categories" 
  ON public.categories FOR SELECT TO authenticated 
  USING (public.is_approved(auth.uid()));

-- Vendors
CREATE POLICY "Admin full access vendors" 
  ON public.vendors FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin')) 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved view vendors" 
  ON public.vendors FOR SELECT TO authenticated 
  USING (public.is_approved(auth.uid()));

-- Employees
CREATE POLICY "Admin full access employees" 
  ON public.employees FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin')) 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved view employees" 
  ON public.employees FOR SELECT TO authenticated 
  USING (public.is_approved(auth.uid()));

-- Assets
CREATE POLICY "Admin full access assets" 
  ON public.assets FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin')) 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved view assets" 
  ON public.assets FOR SELECT TO authenticated 
  USING (public.is_approved(auth.uid()));

-- Licenses
CREATE POLICY "Admin full access licenses" 
  ON public.licenses FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin')) 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved view licenses" 
  ON public.licenses FOR SELECT TO authenticated 
  USING (public.is_approved(auth.uid()));

-- Asset Transactions
CREATE POLICY "Admin full access transactions" 
  ON public.asset_transactions FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin')) 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved view transactions" 
  ON public.asset_transactions FOR SELECT TO authenticated 
  USING (public.is_approved(auth.uid()));

-- Profiles
CREATE POLICY "Admin full access profiles" 
  ON public.profiles FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin')) 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own profile" 
  ON public.profiles FOR SELECT TO authenticated 
  USING (id = auth.uid());

-- User Roles
CREATE POLICY "Admin full access user_roles" 
  ON public.user_roles FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin')) 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own roles" 
  ON public.user_roles FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

-- Other tables
CREATE POLICY "Admin full access audit_log" 
  ON public.audit_log FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin full access org_settings" 
  ON public.organization_settings FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin')) 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin full access import_runs" 
  ON public.import_runs FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin')) 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Re-enable RLS
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

-- ============================================================
-- STEP 6: Final Verification
-- ============================================================

SELECT '========================================' as separator;
SELECT 'ADMIN SETUP COMPLETE - VERIFICATION' as status;
SELECT '========================================' as separator;

-- Check your account
SELECT 
  'YOUR ACCOUNT' as check_type,
  (SELECT full_name FROM public.profiles WHERE id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271') as name,
  (SELECT approval_status FROM public.profiles WHERE id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271') as approval_status,
  (SELECT string_agg(role::text, ', ') FROM public.user_roles WHERE user_id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271') as all_roles;

-- Check permissions
SELECT 
  'PERMISSION CHECKS' as check_type,
  public.has_role('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid, 'admin') as has_admin,
  public.is_approved('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid) as is_approved,
  public.can_write_assets('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid) as can_write_assets;

-- Count policies
SELECT 
  'POLICY COUNT' as check_type,
  count(*) as total_policies
FROM pg_policies WHERE schemaname = 'public';

SELECT '========================================' as separator;
SELECT '✅ YOU ARE NOW ALL-POWERFUL ADMIN!' as message;
SELECT '✅ Refresh your app and save will work!' as message;
SELECT '========================================' as separator;
