-- ============================================================
-- DIAGNOSE: Why data isn't showing in the app
-- Run this in Supabase SQL Editor and share the output.
-- ============================================================

-- 1. Row counts per table (raw, ignores filters)
SELECT 'companies'   AS table_name, COUNT(*) AS total FROM public.companies
UNION ALL SELECT 'locations',         COUNT(*) FROM public.locations
UNION ALL SELECT 'departments',       COUNT(*) FROM public.departments
UNION ALL SELECT 'categories',        COUNT(*) FROM public.categories
UNION ALL SELECT 'vendors',           COUNT(*) FROM public.vendors
UNION ALL SELECT 'employees',         COUNT(*) FROM public.employees
UNION ALL SELECT 'assets',            COUNT(*) FROM public.assets
UNION ALL SELECT 'licenses',          COUNT(*) FROM public.licenses
ORDER BY table_name;

-- 2. Active vs total counts (the app filters by is_active = true on most tables)
DO $$
DECLARE
  v_tables TEXT[] := ARRAY['companies','locations','departments','vendors','employees'];
  v_t TEXT;
  v_total INT;
  v_active INT;
  v_has_active BOOLEAN;
BEGIN
  RAISE NOTICE '=== Active row counts (the app only shows active rows) ===';
  FOREACH v_t IN ARRAY v_tables LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=v_t AND column_name='is_active'
    ) INTO v_has_active;
    EXECUTE format('SELECT COUNT(*) FROM public.%I', v_t) INTO v_total;
    IF v_has_active THEN
      EXECUTE format('SELECT COUNT(*) FROM public.%I WHERE is_active=true', v_t) INTO v_active;
      RAISE NOTICE '  % : % active / % total', rpad(v_t,12), v_active, v_total;
    ELSE
      RAISE NOTICE '  % : % total (no is_active column)', rpad(v_t,12), v_total;
    END IF;
  END LOOP;

  -- assets uses is_deleted=false instead
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='assets' AND column_name='is_deleted') THEN
    EXECUTE 'SELECT COUNT(*) FROM public.assets WHERE is_deleted=false' INTO v_active;
    EXECUTE 'SELECT COUNT(*) FROM public.assets' INTO v_total;
    RAISE NOTICE '  assets       : % visible (is_deleted=false) / % total', v_active, v_total;
  END IF;
END $$;

-- 3. Show your sample rows specifically
SELECT 'company'  AS entity, name AS info FROM public.companies   WHERE name = 'Sample Company TSI'
UNION ALL SELECT 'location',   name FROM public.locations    WHERE name = 'Sample HQ'
UNION ALL SELECT 'department', name FROM public.departments  WHERE name = 'Sample IT Department'
UNION ALL SELECT 'category',   name FROM public.categories   WHERE name = 'Sample Laptop Category'
UNION ALL SELECT 'vendor',     name FROM public.vendors      WHERE name = 'Sample Vendor Co.'
UNION ALL SELECT 'employee',   name FROM public.employees    WHERE employee_code = 'SAMPLE-EMP-001'
UNION ALL SELECT 'asset',      name FROM public.assets       WHERE sap_code = 'SAMPLE-ASSET-001';

-- 4. RLS status — if any of these are TRUE without policies, the app sees nothing
SELECT
  schemaname || '.' || tablename AS table_name,
  rowsecurity                    AS rls_enabled,
  (SELECT COUNT(*) FROM pg_policies p
    WHERE p.schemaname=t.schemaname AND p.tablename=t.tablename) AS policy_count
FROM pg_tables t
WHERE schemaname='public'
  AND tablename IN ('companies','locations','departments','categories','vendors','employees','assets','licenses')
ORDER BY tablename;

-- 5. Your auth user's roles (the app's RLS policies usually check user_roles)
SELECT
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 10;
