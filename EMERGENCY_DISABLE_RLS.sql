-- ============================================================
-- EMERGENCY: Completely Disable RLS for Testing
-- This removes ALL permission checks - USE WITH CAUTION
-- ============================================================

-- Disable RLS on all tables (NO PERMISSION CHECKS AT ALL)
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

-- Drop ALL policies
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

SELECT '✅ RLS COMPLETELY DISABLED' as status;
SELECT '✅ All tables are now open - no permission checks' as status;
SELECT '⚠️ SECURITY WARNING: Anyone can read/write all data' as warning;
SELECT '🔄 Refresh your app and test NOW' as instruction;
