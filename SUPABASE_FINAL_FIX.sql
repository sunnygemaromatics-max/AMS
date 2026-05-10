-- ============================================================
-- SUPABASE FINAL FIX - One Script to Fix All Permission Issues
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: Fix Your Account (Auto-approve and add admin role)
-- ============================================================

DO $$
DECLARE
  v_user_id UUID := 'ed8feb2f-7c4a-4a76-b72f-729775b45271';
  v_email TEXT := 'sunny.sobhani90@gmail.com';
  v_profiles_cols TEXT[];
BEGIN
  -- Get actual columns in profiles
  SELECT array_agg(column_name) INTO v_profiles_cols
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'profiles';
  
  RAISE NOTICE 'Profiles table columns: %', v_profiles_cols;
  
  -- Create profile if doesn't exist with only available columns
  BEGIN
    INSERT INTO public.profiles (id, full_name, approval_status)
    VALUES (v_user_id, v_email, 'approved')
    ON CONFLICT (id) DO UPDATE 
    SET approval_status = 'approved';
    
    -- Update approved_at if column exists
    IF 'approved_at' = ANY(v_profiles_cols) THEN
      UPDATE public.profiles SET approved_at = now() WHERE id = v_user_id;
    END IF;
    
    RAISE NOTICE 'Profile created/updated for %', v_user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Profile error (non-critical): %', SQLERRM;
  END;
  
  -- Add admin role
  BEGIN
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (v_user_id, 'admin') 
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Admin role added for %', v_user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Role error (may already exist): %', SQLERRM;
  END;
  
END $$;

-- ============================================================
-- STEP 2: Fix Security Functions (Drop and Recreate Clean)
-- ============================================================

-- Drop existing functions with CASCADE to remove dependencies
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.is_approved(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_write_assets(uuid) CASCADE;

-- Recreate has_role with explicit parameter names
CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $func$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_user_id AND role = p_role
  );
END;
$func$;

-- Recreate is_approved with explicit parameter names
CREATE OR REPLACE FUNCTION public.is_approved(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $func$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_user_id AND approval_status = 'approved'
  );
END;
$func$;

-- Recreate can_write_assets
CREATE OR REPLACE FUNCTION public.can_write_assets(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $func$
BEGIN
  RETURN public.is_approved(p_user_id) AND 
    (public.has_role(p_user_id, 'admin') OR public.has_role(p_user_id, 'it'));
END;
$func$;

-- ============================================================
-- STEP 3: Recreate ALL RLS Policies (Clean Slate)
-- ============================================================

-- First, disable and re-enable RLS to clear any conflicts
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

-- Create clean policies
-- Companies
CREATE POLICY "Approved users can view companies" 
  ON public.companies FOR SELECT TO authenticated 
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Admin IT can insert companies" 
  ON public.companies FOR INSERT TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it'));

CREATE POLICY "Admin IT can update companies" 
  ON public.companies FOR UPDATE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it'));

-- Locations
CREATE POLICY "Approved users can view locations" 
  ON public.locations FOR SELECT TO authenticated 
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Admin IT can insert locations" 
  ON public.locations FOR INSERT TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it'));

CREATE POLICY "Admin IT can update locations" 
  ON public.locations FOR UPDATE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it'));

-- Departments
CREATE POLICY "Approved users can view departments" 
  ON public.departments FOR SELECT TO authenticated 
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Admin IT can insert departments" 
  ON public.departments FOR INSERT TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it'));

CREATE POLICY "Admin IT can update departments" 
  ON public.departments FOR UPDATE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it'));

-- Categories
CREATE POLICY "Approved users can view categories" 
  ON public.categories FOR SELECT TO authenticated 
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Admin IT can insert categories" 
  ON public.categories FOR INSERT TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it'));

CREATE POLICY "Admin IT can update categories" 
  ON public.categories FOR UPDATE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it'));

-- Vendors
CREATE POLICY "Approved users can view vendors" 
  ON public.vendors FOR SELECT TO authenticated 
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Admin IT can insert vendors" 
  ON public.vendors FOR INSERT TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it'));

CREATE POLICY "Admin IT can update vendors" 
  ON public.vendors FOR UPDATE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it'));

-- Employees
CREATE POLICY "Approved users can view employees" 
  ON public.employees FOR SELECT TO authenticated 
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Admin IT HR can insert employees" 
  ON public.employees FOR INSERT TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it') OR public.has_role(auth.uid(), 'hr'));

CREATE POLICY "Admin IT HR can update employees" 
  ON public.employees FOR UPDATE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it') OR public.has_role(auth.uid(), 'hr'));

-- Assets
CREATE POLICY "Approved users can view assets" 
  ON public.assets FOR SELECT TO authenticated 
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Admin IT can insert assets" 
  ON public.assets FOR INSERT TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it'));

CREATE POLICY "Admin IT can update assets" 
  ON public.assets FOR UPDATE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it'));

-- Licenses
CREATE POLICY "Approved users can view licenses" 
  ON public.licenses FOR SELECT TO authenticated 
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Admin IT can insert licenses" 
  ON public.licenses FOR INSERT TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it'));

CREATE POLICY "Admin IT can update licenses" 
  ON public.licenses FOR UPDATE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it'));

-- Asset Transactions
CREATE POLICY "Approved users can view transactions" 
  ON public.asset_transactions FOR SELECT TO authenticated 
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Admin IT can insert transactions" 
  ON public.asset_transactions FOR INSERT TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it'));

-- Profiles
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT TO authenticated 
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE TO authenticated 
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can update any profile" 
  ON public.profiles FOR UPDATE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- User Roles
CREATE POLICY "Users can view own roles" 
  ON public.user_roles FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" 
  ON public.user_roles FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- STEP 4: Verify Everything
-- ============================================================

SELECT '=== VERIFICATION RESULTS ===' as status;

-- Check your account
SELECT 
  'YOUR ACCOUNT' as check_type,
  (SELECT full_name FROM public.profiles WHERE id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271') as name,
  (SELECT approval_status FROM public.profiles WHERE id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271') as approval,
  (SELECT string_agg(role::text, ', ') FROM public.user_roles WHERE user_id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271') as roles;

-- Check functions
SELECT 
  'PERMISSIONS' as check_type,
  public.has_role('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid, 'admin') as has_admin,
  public.is_approved('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid) as is_approved,
  public.can_write_assets('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid) as can_write;

-- Check policies
SELECT 
  'RLS POLICIES' as check_type,
  count(*) as total_policies
FROM pg_policies WHERE schemaname = 'public';

-- Final status
SELECT 
  '✅ SETUP COMPLETE - Refresh your app and try saving!' as message;
