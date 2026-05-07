-- ============================================================
-- DIAGNOSE: Single consolidated diagnostic — all info in ONE result
-- Run this in Supabase SQL Editor; share a screenshot of the table.
-- ============================================================

WITH counts AS (
  SELECT 'companies'   AS t, (SELECT COUNT(*)::int FROM public.companies)   AS total,
         (SELECT COUNT(*)::int FROM public.companies   WHERE is_active=true) AS visible_to_app
  UNION ALL SELECT 'locations',   (SELECT COUNT(*)::int FROM public.locations),
         (SELECT COUNT(*)::int FROM public.locations   WHERE is_active=true)
  UNION ALL SELECT 'departments', (SELECT COUNT(*)::int FROM public.departments),
         (SELECT COUNT(*)::int FROM public.departments WHERE is_active=true)
  UNION ALL SELECT 'categories',  (SELECT COUNT(*)::int FROM public.categories),
         (SELECT COUNT(*)::int FROM public.categories)  -- no is_active filter in hook
  UNION ALL SELECT 'vendors',     (SELECT COUNT(*)::int FROM public.vendors),
         (SELECT COUNT(*)::int FROM public.vendors     WHERE is_active=true)
  UNION ALL SELECT 'employees',   (SELECT COUNT(*)::int FROM public.employees),
         (SELECT COUNT(*)::int FROM public.employees   WHERE is_active=true)
  UNION ALL SELECT 'assets',      (SELECT COUNT(*)::int FROM public.assets),
         (SELECT COUNT(*)::int FROM public.assets      WHERE is_deleted=false)
  UNION ALL SELECT 'licenses',    (SELECT COUNT(*)::int FROM public.licenses),
         (SELECT COUNT(*)::int FROM public.licenses)   -- no filter in hook
),
sample_rows AS (
  SELECT 'companies'   AS t, EXISTS(SELECT 1 FROM public.companies   WHERE name = 'Sample Company TSI')      AS sample_present
  UNION ALL SELECT 'locations',   EXISTS(SELECT 1 FROM public.locations    WHERE name = 'Sample HQ')
  UNION ALL SELECT 'departments', EXISTS(SELECT 1 FROM public.departments  WHERE name = 'Sample IT Department')
  UNION ALL SELECT 'categories',  EXISTS(SELECT 1 FROM public.categories   WHERE name = 'Sample Laptop Category')
  UNION ALL SELECT 'vendors',     EXISTS(SELECT 1 FROM public.vendors      WHERE name = 'Sample Vendor Co.')
  UNION ALL SELECT 'employees',   EXISTS(SELECT 1 FROM public.employees    WHERE employee_code = 'SAMPLE-EMP-001')
  UNION ALL SELECT 'assets',      EXISTS(SELECT 1 FROM public.assets       WHERE sap_code = 'SAMPLE-ASSET-001')
  UNION ALL SELECT 'licenses',    EXISTS(SELECT 1 FROM public.licenses     WHERE id IS NOT NULL)  -- any row
),
rls AS (
  SELECT tablename AS t,
         rowsecurity AS rls_on,
         (SELECT COUNT(*)::int FROM pg_policies p
            WHERE p.schemaname='public' AND p.tablename=pt.tablename) AS policies
  FROM pg_tables pt
  WHERE schemaname='public'
    AND tablename IN ('companies','locations','departments','categories','vendors','employees','assets','licenses')
)
SELECT
  c.t                       AS table_name,
  c.total                   AS total_rows,
  c.visible_to_app          AS rows_app_can_see,
  s.sample_present          AS sample_row_in_db,
  r.rls_on                  AS rls_enabled,
  r.policies                AS rls_policy_count
FROM counts c
LEFT JOIN sample_rows s ON s.t = c.t
LEFT JOIN rls r        ON r.t = c.t
ORDER BY c.t;
