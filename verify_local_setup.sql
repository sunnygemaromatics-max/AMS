-- ============================================================
-- VERIFY LOCAL POSTGRESQL SETUP
-- Run this after importing data to check everything works
-- ============================================================

-- 1. Check all tables exist and have data
SELECT 'TABLE COUNTS' as check_type;
SELECT 
  'companies' as table_name, count(*) as row_count 
FROM public.companies
UNION ALL SELECT 'locations', count(*) FROM public.locations
UNION ALL SELECT 'departments', count(*) FROM public.departments
UNION ALL SELECT 'categories', count(*) FROM public.categories
UNION ALL SELECT 'vendors', count(*) FROM public.vendors
UNION ALL SELECT 'employees', count(*) FROM public.employees
UNION ALL SELECT 'assets', count(*) FROM public.assets
UNION ALL SELECT 'licenses', count(*) FROM public.licenses
UNION ALL SELECT 'profiles', count(*) FROM public.profiles
UNION ALL SELECT 'user_roles', count(*) FROM public.user_roles
ORDER BY table_name;

-- 2. Check your user has admin role
SELECT 'YOUR PERMISSIONS' as check_type;
SELECT 
  'ed8feb2f-7c4a-4a76-b72f-729775b45271' as user_id,
  (SELECT full_name FROM public.profiles WHERE id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271') as name,
  (SELECT approval_status FROM public.profiles WHERE id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271') as approval_status,
  (SELECT string_agg(role::text, ', ') FROM public.user_roles WHERE user_id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271') as roles,
  public.has_role('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid, 'admin') as has_admin,
  public.is_approved('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid) as is_approved,
  public.can_write_assets('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid) as can_write;

-- 3. Check RLS policies exist
SELECT 'RLS POLICIES' as check_type;
SELECT tablename, policyname, permissive, roles, cmd, qual::text as using_clause
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. Check security functions work
SELECT 'SECURITY FUNCTIONS' as check_type;
SELECT 
  public.has_role('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid, 'admin') as has_role_works,
  public.is_approved('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid) as is_approved_works,
  public.can_write_assets('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid) as can_write_works;

-- 5. Sample data check
SELECT 'SAMPLE DATA' as check_type;
SELECT 'Companies: ' || string_agg(name, ', ') FROM (SELECT name FROM public.companies LIMIT 3) t;
SELECT 'Assets: ' || count(*)::text || ' total assets' FROM public.assets;
SELECT 'Employees: ' || count(*)::text || ' total employees' FROM public.employees;

-- 6. Quick fix if permissions are wrong
-- Uncomment and run if has_admin or is_approved shows false:
-- UPDATE public.profiles SET approval_status = 'approved', approved_at = now() WHERE id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271';
-- INSERT INTO public.user_roles (user_id, role) VALUES ('ed8feb2f-7c4a-4a76-b72f-729775b45271', 'admin') ON CONFLICT DO NOTHING;
