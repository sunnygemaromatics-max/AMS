-- ════════════════════════════════════════════════════════════════════════════
-- FIX_400_BAD_REQUEST.sql  —  fix the "400 Bad Request" Supabase errors
--
-- The frontend uses PostgREST embedded FK joins like:
--    .select("*, employees(name), locations(name), companies(name)")
-- These return 400 unless the FK constraints exist AND PostgREST's schema
-- cache has been told to reload.
--
-- Paste this ENTIRE file into the Supabase SQL Editor and click RUN.
-- Safe to re-run; every step is idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 1 — show current FK constraints (so you can compare before/after)
-- ────────────────────────────────────────────────────────────────────────────
SELECT '=== EXISTING FK CONSTRAINTS (before) ===' AS section;
SELECT  tc.table_name, kcu.column_name, ccu.table_name AS references_table, ccu.column_name AS references_col
FROM    information_schema.table_constraints tc
JOIN    information_schema.key_column_usage  kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN    information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE   tc.constraint_type = 'FOREIGN KEY'
  AND   tc.table_schema = 'public'
ORDER   BY tc.table_name, kcu.column_name;

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 2 — make sure every column referenced by the app actually exists
-- ────────────────────────────────────────────────────────────────────────────

-- assets
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS is_deleted     boolean      NOT NULL DEFAULT false;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS company_id     uuid;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS location_id    uuid;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS department_id  uuid;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS category_id    uuid;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS vendor_id      uuid;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS employee_id    uuid;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS sap_code       text;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS bin_card_no    integer;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS status         text         DEFAULT 'available';

-- employees
ALTER TABLE public.employees    ADD COLUMN IF NOT EXISTS is_active      boolean      NOT NULL DEFAULT true;
ALTER TABLE public.employees    ADD COLUMN IF NOT EXISTS company_id     uuid;
ALTER TABLE public.employees    ADD COLUMN IF NOT EXISTS location_id    uuid;
ALTER TABLE public.employees    ADD COLUMN IF NOT EXISTS department_id  uuid;
ALTER TABLE public.employees    ADD COLUMN IF NOT EXISTS department     text;     -- legacy text fallback
ALTER TABLE public.employees    ADD COLUMN IF NOT EXISTS employee_code  text;
ALTER TABLE public.employees    ADD COLUMN IF NOT EXISTS email          text;

-- locations
ALTER TABLE public.locations    ADD COLUMN IF NOT EXISTS is_active      boolean      NOT NULL DEFAULT true;
ALTER TABLE public.locations    ADD COLUMN IF NOT EXISTS company_id     uuid;
ALTER TABLE public.locations    ADD COLUMN IF NOT EXISTS code           text;

-- departments
ALTER TABLE public.departments  ADD COLUMN IF NOT EXISTS is_active      boolean      NOT NULL DEFAULT true;
ALTER TABLE public.departments  ADD COLUMN IF NOT EXISTS company_id     uuid;
ALTER TABLE public.departments  ADD COLUMN IF NOT EXISTS location_id    uuid;
ALTER TABLE public.departments  ADD COLUMN IF NOT EXISTS code           text;

-- categories
ALTER TABLE public.categories   ADD COLUMN IF NOT EXISTS code           text;

-- vendors
ALTER TABLE public.vendors      ADD COLUMN IF NOT EXISTS is_active      boolean      NOT NULL DEFAULT true;

-- companies
ALTER TABLE public.companies    ADD COLUMN IF NOT EXISTS is_active      boolean      NOT NULL DEFAULT true;

-- licenses (referenced by useLicenses with two FK aliases)
ALTER TABLE public.licenses     ADD COLUMN IF NOT EXISTS assigned_employee_id uuid;
ALTER TABLE public.licenses     ADD COLUMN IF NOT EXISTS assigned_asset_id    uuid;
ALTER TABLE public.licenses     ADD COLUMN IF NOT EXISTS company_id           uuid;
ALTER TABLE public.licenses     ADD COLUMN IF NOT EXISTS location_id          uuid;

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 3 — add the FK constraints PostgREST needs in order to embed
-- (drop-then-add so they're idempotent and consistently named)
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION pg_temp.add_fk(
  p_table text, p_col text, p_ref_table text, p_ref_col text DEFAULT 'id'
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_constraint text := format('fk_%s_%s', p_table, p_col);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema='public' AND table_name=p_table) THEN
    RAISE NOTICE 'Skipping % — base table does not exist', p_table;
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema='public' AND table_name=p_ref_table) THEN
    RAISE NOTICE 'Skipping %.% — referenced table % does not exist', p_table, p_col, p_ref_table;
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name=p_table AND column_name=p_col) THEN
    RAISE NOTICE 'Skipping %.% — column does not exist', p_table, p_col;
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', p_table, v_constraint);
  BEGIN
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(%I) ON DELETE SET NULL ON UPDATE CASCADE',
      p_table, v_constraint, p_col, p_ref_table, p_ref_col);
    RAISE NOTICE '✔ Added FK %.% → %(%)', p_table, p_col, p_ref_table, p_ref_col;
  EXCEPTION WHEN others THEN
    RAISE NOTICE '✗ Could not add FK %.% → %(%): %', p_table, p_col, p_ref_table, p_ref_col, SQLERRM;
  END;
END $$;

SELECT pg_temp.add_fk('assets',     'company_id',           'companies');
SELECT pg_temp.add_fk('assets',     'location_id',          'locations');
SELECT pg_temp.add_fk('assets',     'department_id',        'departments');
SELECT pg_temp.add_fk('assets',     'category_id',          'categories');
SELECT pg_temp.add_fk('assets',     'vendor_id',            'vendors');
SELECT pg_temp.add_fk('assets',     'employee_id',          'employees');
SELECT pg_temp.add_fk('employees',  'company_id',           'companies');
SELECT pg_temp.add_fk('employees',  'location_id',          'locations');
SELECT pg_temp.add_fk('employees',  'department_id',        'departments');
SELECT pg_temp.add_fk('locations',  'company_id',           'companies');
SELECT pg_temp.add_fk('departments','company_id',           'companies');
SELECT pg_temp.add_fk('departments','location_id',          'locations');
SELECT pg_temp.add_fk('licenses',   'company_id',           'companies');
SELECT pg_temp.add_fk('licenses',   'location_id',          'locations');
SELECT pg_temp.add_fk('licenses',   'assigned_employee_id', 'employees');
SELECT pg_temp.add_fk('licenses',   'assigned_asset_id',    'assets');

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 4 — tell PostgREST to reload its schema cache (CRITICAL!)
-- Without this, even after adding the FKs you keep getting 400 errors.
-- ────────────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 5 — show FK constraints AFTER (verify the new ones are present)
-- ────────────────────────────────────────────────────────────────────────────
SELECT '=== FK CONSTRAINTS (after) ===' AS section;
SELECT  tc.table_name, kcu.column_name, ccu.table_name AS references_table, ccu.column_name AS references_col
FROM    information_schema.table_constraints tc
JOIN    information_schema.key_column_usage  kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN    information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE   tc.constraint_type = 'FOREIGN KEY'
  AND   tc.table_schema = 'public'
ORDER   BY tc.table_name, kcu.column_name;

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 6 — quick column check on the most important tables
-- ────────────────────────────────────────────────────────────────────────────
SELECT '=== assets COLUMNS ===' AS section;
SELECT column_name, data_type, is_nullable
FROM   information_schema.columns
WHERE  table_schema='public' AND table_name='assets'
ORDER  BY ordinal_position;

SELECT '=== employees COLUMNS ===' AS section;
SELECT column_name, data_type, is_nullable
FROM   information_schema.columns
WHERE  table_schema='public' AND table_name='employees'
ORDER  BY ordinal_position;

SELECT '✅ DONE. If any FK already existed it was replaced cleanly.' AS message;
SELECT '✅ PostgREST has been told to reload its schema cache (NOTIFY pgrst).' AS message;
SELECT '➡  Wait ~5 seconds, then HARD-REFRESH the browser (Ctrl+Shift+R).' AS message;
