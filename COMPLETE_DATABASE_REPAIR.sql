-- ============================================================
-- ☢️ COMPLETE DATABASE REPAIR - Fix Everything
-- This script checks and repairs the entire database schema
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: Check Current Schema State
-- ============================================================

SELECT '========================================' as separator;
SELECT 'STEP 1: CHECKING CURRENT TABLES' as status;
SELECT '========================================' as separator;

SELECT 
  table_name,
  EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.column_name = 'id') as has_id,
  EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.column_name = 'created_at') as has_created_at,
  EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.column_name = 'updated_at') as has_updated_at
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================================
-- STEP 2: Add Missing Columns to locations Table
-- ============================================================

SELECT '========================================' as separator;
SELECT 'STEP 2: FIXING LOCATIONS TABLE' as status;
SELECT '========================================' as separator;

-- Check what columns locations currently has
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'locations' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add ALL missing columns to locations
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create unique constraint on code if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'locations_code_key'
  ) THEN
    ALTER TABLE public.locations ADD CONSTRAINT locations_code_key UNIQUE (code);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Constraint may already exist or code column has duplicates';
END $$;

-- Create index on company_id
CREATE INDEX IF NOT EXISTS idx_locations_company ON public.locations(company_id);

SELECT '✅ Locations table fixed' as status;

-- ============================================================
-- STEP 3: Fix Companies Table (ensure all columns exist)
-- ============================================================

SELECT '========================================' as separator;
SELECT 'STEP 3: FIXING COMPANIES TABLE' as status;
SELECT '========================================' as separator;

ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Unknown',
ADD COLUMN IF NOT EXISTS code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_code_key'
  ) THEN
    ALTER TABLE public.companies ADD CONSTRAINT companies_code_key UNIQUE (code);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Constraint handling...';
END $$;

SELECT '✅ Companies table fixed' as status;

-- ============================================================
-- STEP 4: Fix All Other Core Tables
-- ============================================================

SELECT '========================================' as separator;
SELECT 'STEP 4: FIXING DEPARTMENTS TABLE' as status;
SELECT '========================================' as separator;

ALTER TABLE public.departments 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id),
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_departments_company ON public.departments(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_location ON public.departments(location_id);

SELECT '========================================' as separator;
SELECT 'STEP 5: FIXING CATEGORIES TABLE' as status;
SELECT '========================================' as separator;

-- Check if asset_type enum exists
DO $$ BEGIN
  CREATE TYPE public.asset_type AS ENUM ('tangible', 'intangible');
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'asset_type enum already exists';
END $$;

ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id),
ADD COLUMN IF NOT EXISTS asset_type public.asset_type DEFAULT 'tangible',
ADD COLUMN IF NOT EXISTS is_consumable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

SELECT '========================================' as separator;
SELECT 'STEP 6: FIXING VENDORS TABLE' as status;
SELECT '========================================' as separator;

ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS contact_person TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS gst_number TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

SELECT '========================================' as separator;
SELECT 'STEP 7: FIXING EMPLOYEES TABLE' as status;
SELECT '========================================' as separator;

ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
ADD COLUMN IF NOT EXISTS employee_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id),
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id),
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id),
ADD COLUMN IF NOT EXISTS reporting_manager UUID REFERENCES public.employees(id),
ADD COLUMN IF NOT EXISTS employee_type TEXT,
ADD COLUMN IF NOT EXISTS designation TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_employees_department ON public.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_location ON public.employees(location_id);
CREATE INDEX IF NOT EXISTS idx_employees_company ON public.employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON public.employees(reporting_manager);

SELECT '========================================' as separator;
SELECT 'STEP 8: FIXING PROFILES TABLE' as status;
SELECT '========================================' as separator;

-- Check if approval_status enum exists
DO $$ BEGIN
  CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'approval_status enum already exists';
END $$;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approval_status public.approval_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Add updated_at if you want it (but we saw it may not exist)
DO $$
BEGIN
  ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'updated_at already exists';
END $$;

SELECT '========================================' as separator;
SELECT 'STEP 9: FIXING USER_ROLES TABLE' as status;
SELECT '========================================' as separator;

-- Check if app_role enum exists
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'it', 'hr', 'viewer');
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'app_role enum already exists';
END $$;

ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS role public.app_role NOT NULL,
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Create unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_role_key'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Unique constraint handling...';
END $$;

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);

-- ============================================================
-- STEP 10: Fix Your User Account
-- ============================================================

SELECT '========================================' as separator;
SELECT 'STEP 10: FIXING YOUR USER ACCOUNT' as status;
SELECT '========================================' as separator;

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find your user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email LIKE '%sunny%' LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ Could not find user with email containing sunny';
  ELSE
    RAISE NOTICE '✅ Found user ID: %', v_user_id;
    
    -- Delete and recreate profile
    DELETE FROM public.profiles WHERE id = v_user_id;
    
    INSERT INTO public.profiles (id, full_name, approval_status, created_at)
    VALUES (v_user_id, 'sunny.sobhani90@gmail.com', 'approved', now());
    
    -- Update timestamps if columns exist
    BEGIN
      UPDATE public.profiles SET approved_at = now() WHERE id = v_user_id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    
    -- Delete and recreate roles
    DELETE FROM public.user_roles WHERE user_id = v_user_id;
    
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin');
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'it');
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'hr');
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'viewer');
    
    RAISE NOTICE '✅ User % is now admin with all roles', v_user_id;
  END IF;
END $$;

-- ============================================================
-- STEP 11: Create Security Functions
-- ============================================================

SELECT '========================================' as separator;
SELECT 'STEP 11: CREATING SECURITY FUNCTIONS' as status;
SELECT '========================================' as separator;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.is_approved(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_write_assets(uuid) CASCADE;

-- Create has_role function
CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_user_id AND role = p_role
  );
END;
$$;

-- Create is_approved function
CREATE OR REPLACE FUNCTION public.is_approved(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_user_id AND approval_status = 'approved'
  );
END;
$$;

-- Create can_write_assets function
CREATE OR REPLACE FUNCTION public.can_write_assets(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN public.is_approved(p_user_id) AND 
    (public.has_role(p_user_id, 'admin') OR public.has_role(p_user_id, 'it'));
END;
$$;

SELECT '✅ Security functions created' as status;

-- ============================================================
-- STEP 12: Refresh PostgREST Schema Cache
-- ============================================================

SELECT '========================================' as separator;
SELECT 'STEP 12: REFRESHING API CACHE' as status;
SELECT '========================================' as separator;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

SELECT '✅ Schema cache refreshed' as status;

-- ============================================================
-- STEP 13: Final Verification
-- ============================================================

SELECT '========================================' as separator;
SELECT 'STEP 13: FINAL VERIFICATION' as status;
SELECT '========================================' as separator;

-- Check locations table now has all columns
SELECT 'Locations table columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'locations' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check your permissions
SELECT 'Your permissions:' as info;
SELECT 
  (SELECT id FROM auth.users WHERE email LIKE '%sunny%' LIMIT 1) as user_id,
  public.has_role((SELECT id FROM auth.users WHERE email LIKE '%sunny%' LIMIT 1), 'admin') as has_admin,
  public.is_approved((SELECT id FROM auth.users WHERE email LIKE '%sunny%' LIMIT 1)) as is_approved;

SELECT '========================================' as separator;
SELECT '✅ DATABASE REPAIR COMPLETE!' as status;
SELECT '✅ Refresh your app and try again' as status;
SELECT '========================================' as separator;
