-- ════════════════════════════════════════════════════════════════════════════
-- FIX_400_BAD_REQUEST.sql  (v3 — kill duplicate FKs)
--
-- ROOT CAUSE THIS RUN:
--   PostgREST said
--     "Could not embed because more than one relationship was found
--      for 'assets' and 'employees'"
--   The assets table has more than one FK pointing at employees (probably
--   both current_employee_id and employee_id, or leftover named FKs from
--   earlier attempts). PostgREST can't pick one and returns 400.
--
-- This v3:
--   1) Drops EVERY foreign key on `assets` that references employees,
--      locations, companies, departments, categories, vendors, and on
--      `licenses` to assets/employees/companies/locations.
--   2) Adds the columns the frontend reads (idempotent).
--   3) Recreates ONE canonical FK per relationship.
--   4) NOTIFY pgrst, 'reload schema'.
--
-- Paste the WHOLE file into Supabase SQL Editor → RUN. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 1 — enums the schema relies on
-- ────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE public.asset_status     AS ENUM ('available','allocated','under_maintenance','lost','damaged','scrapped');                                                     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.asset_type       AS ENUM ('tangible','intangible');                                                                                                       EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.transaction_type AS ENUM ('allocation','return','transfer','maintenance_start','maintenance_end','lost','damaged','scrapped','purchase');                EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.asset_subtype    AS ENUM ('laptop','desktop','printer','scanner','server','mobile_device','tablet','antivirus','email_account','sap_license','software_license','networking','ups','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.app_role         AS ENUM ('admin','it','hr','viewer');                                                                                                    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.approval_status  AS ENUM ('pending','approved','rejected');                                                                                               EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 2 — show ALL FKs we are about to drop (so the result panel proves it)
-- ────────────────────────────────────────────────────────────────────────────
SELECT '=== FKs BEFORE cleanup ===' AS section;
SELECT  tc.table_name, tc.constraint_name, kcu.column_name, ccu.table_name AS references_table
FROM    information_schema.table_constraints tc
JOIN    information_schema.key_column_usage  kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN    information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE   tc.constraint_type = 'FOREIGN KEY'
  AND   tc.table_schema = 'public'
  AND   tc.table_name IN ('assets','licenses','employees','departments','locations')
ORDER   BY tc.table_name, kcu.column_name, tc.constraint_name;

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 3 — DROP every FK on the join-source tables (clean slate)
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tc.table_name, tc.constraint_name
    FROM   information_schema.table_constraints tc
    WHERE  tc.constraint_type = 'FOREIGN KEY'
      AND  tc.table_schema = 'public'
      AND  tc.table_name IN ('assets','licenses','employees','departments','locations')
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I',
                   r.table_name, r.constraint_name);
    RAISE NOTICE 'dropped FK % on %', r.constraint_name, r.table_name;
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 4 — make sure every column the frontend reads exists
-- ────────────────────────────────────────────────────────────────────────────

-- assets
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS sap_code            text;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS bin_card_no         integer;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS name                text;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS system_info         text;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS serial_number       text;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS brand               text;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS model               text;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS asset_subtype       public.asset_subtype DEFAULT 'other';
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS asset_type          public.asset_type   NOT NULL DEFAULT 'tangible';
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS status              public.asset_status NOT NULL DEFAULT 'available';
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS purchase_date       date;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS purchase_bill_no    text;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS purchase_cost       numeric(12,2);
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS warranty_start      date;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS warranty_end        date;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS amc_start           date;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS amc_end             date;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS notes               text;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS is_deleted          boolean NOT NULL DEFAULT false;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS company_id          uuid;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS department_id       uuid;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS category_id         uuid;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS vendor_id           uuid;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS current_employee_id uuid;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS current_location_id uuid;

-- employees
ALTER TABLE public.employees    ADD COLUMN IF NOT EXISTS employee_code       text;
ALTER TABLE public.employees    ADD COLUMN IF NOT EXISTS name                text;
ALTER TABLE public.employees    ADD COLUMN IF NOT EXISTS email               text;
ALTER TABLE public.employees    ADD COLUMN IF NOT EXISTS phone               text;
ALTER TABLE public.employees    ADD COLUMN IF NOT EXISTS department          text DEFAULT 'General';
ALTER TABLE public.employees    ADD COLUMN IF NOT EXISTS designation         text;
ALTER TABLE public.employees    ADD COLUMN IF NOT EXISTS department_id       uuid;
ALTER TABLE public.employees    ADD COLUMN IF NOT EXISTS location_id         uuid;
ALTER TABLE public.employees    ADD COLUMN IF NOT EXISTS company_id          uuid;
ALTER TABLE public.employees    ADD COLUMN IF NOT EXISTS is_active           boolean NOT NULL DEFAULT true;

-- locations
ALTER TABLE public.locations    ADD COLUMN IF NOT EXISTS code                text;
ALTER TABLE public.locations    ADD COLUMN IF NOT EXISTS company_id          uuid;
ALTER TABLE public.locations    ADD COLUMN IF NOT EXISTS is_active           boolean NOT NULL DEFAULT true;

-- departments
ALTER TABLE public.departments  ADD COLUMN IF NOT EXISTS code                text;
ALTER TABLE public.departments  ADD COLUMN IF NOT EXISTS company_id          uuid;
ALTER TABLE public.departments  ADD COLUMN IF NOT EXISTS location_id         uuid;
ALTER TABLE public.departments  ADD COLUMN IF NOT EXISTS is_active           boolean NOT NULL DEFAULT true;

-- categories
ALTER TABLE public.categories   ADD COLUMN IF NOT EXISTS code                text;

-- vendors
ALTER TABLE public.vendors      ADD COLUMN IF NOT EXISTS is_active           boolean NOT NULL DEFAULT true;

-- companies
ALTER TABLE public.companies    ADD COLUMN IF NOT EXISTS is_active           boolean NOT NULL DEFAULT true;

-- licenses
ALTER TABLE public.licenses     ADD COLUMN IF NOT EXISTS license_type        text;
ALTER TABLE public.licenses     ADD COLUMN IF NOT EXISTS license_key         text;
ALTER TABLE public.licenses     ADD COLUMN IF NOT EXISTS product_name        text;
ALTER TABLE public.licenses     ADD COLUMN IF NOT EXISTS email_id            text;
ALTER TABLE public.licenses     ADD COLUMN IF NOT EXISTS validity_start      date;
ALTER TABLE public.licenses     ADD COLUMN IF NOT EXISTS validity_end        date;
ALTER TABLE public.licenses     ADD COLUMN IF NOT EXISTS status              text NOT NULL DEFAULT 'active';
ALTER TABLE public.licenses     ADD COLUMN IF NOT EXISTS assigned_employee_id uuid;
ALTER TABLE public.licenses     ADD COLUMN IF NOT EXISTS assigned_asset_id    uuid;
ALTER TABLE public.licenses     ADD COLUMN IF NOT EXISTS company_id          uuid;
ALTER TABLE public.licenses     ADD COLUMN IF NOT EXISTS location_id         uuid;

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 5 — drop the AMBIGUITY columns we may have added in earlier attempts
-- (employee_id and location_id on assets — replaced by current_*_id).
-- We delete the columns themselves so no lingering FK can ever come back.
-- ────────────────────────────────────────────────────────────────────────────

-- copy any data into the canonical column first (safety net)
UPDATE public.assets
   SET current_employee_id = COALESCE(current_employee_id, employee_id)
 WHERE EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='assets' AND column_name='employee_id');

UPDATE public.assets
   SET current_location_id = COALESCE(current_location_id, location_id)
 WHERE EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='assets' AND column_name='location_id');

ALTER TABLE public.assets DROP COLUMN IF EXISTS employee_id;
ALTER TABLE public.assets DROP COLUMN IF EXISTS location_id;

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 6 — recreate ONE canonical FK per relationship
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION pg_temp.add_fk(
  p_table text, p_col text, p_ref_table text, p_ref_col text DEFAULT 'id'
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_constraint text := format('fk_%s_%s', p_table, p_col);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name=p_table AND column_name=p_col) THEN
    RAISE NOTICE 'skip %.% column missing', p_table, p_col;
    RETURN;
  END IF;
  EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', p_table, v_constraint);
  BEGIN
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(%I) ON DELETE SET NULL ON UPDATE CASCADE',
      p_table, v_constraint, p_col, p_ref_table, p_ref_col);
    RAISE NOTICE '✔ %.% → %(%)', p_table, p_col, p_ref_table, p_ref_col;
  EXCEPTION WHEN others THEN
    RAISE NOTICE '✗ %.% → %(%) — %', p_table, p_col, p_ref_table, p_ref_col, SQLERRM;
  END;
END $$;

-- assets: exactly one FK per related table
SELECT pg_temp.add_fk('assets',     'company_id',           'companies');
SELECT pg_temp.add_fk('assets',     'department_id',        'departments');
SELECT pg_temp.add_fk('assets',     'category_id',          'categories');
SELECT pg_temp.add_fk('assets',     'vendor_id',            'vendors');
SELECT pg_temp.add_fk('assets',     'current_employee_id',  'employees');
SELECT pg_temp.add_fk('assets',     'current_location_id',  'locations');

-- employees
SELECT pg_temp.add_fk('employees',  'company_id',           'companies');
SELECT pg_temp.add_fk('employees',  'location_id',          'locations');
SELECT pg_temp.add_fk('employees',  'department_id',        'departments');

-- locations / departments
SELECT pg_temp.add_fk('locations',  'company_id',           'companies');
SELECT pg_temp.add_fk('departments','company_id',           'companies');
SELECT pg_temp.add_fk('departments','location_id',          'locations');

-- licenses
SELECT pg_temp.add_fk('licenses',   'company_id',           'companies');
SELECT pg_temp.add_fk('licenses',   'location_id',          'locations');
SELECT pg_temp.add_fk('licenses',   'assigned_employee_id', 'employees');
SELECT pg_temp.add_fk('licenses',   'assigned_asset_id',    'assets');

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 7 — reload PostgREST schema cache
-- ────────────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 8 — verify there is now EXACTLY ONE FK per relationship
-- ────────────────────────────────────────────────────────────────────────────
SELECT '=== FKs AFTER cleanup (each (table, references_table) should appear ONCE) ===' AS section;
SELECT  tc.table_name, ccu.table_name AS references_table, COUNT(*) AS num_fks,
        string_agg(kcu.column_name, ', ') AS columns
FROM    information_schema.table_constraints tc
JOIN    information_schema.key_column_usage  kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN    information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE   tc.constraint_type = 'FOREIGN KEY'
  AND   tc.table_schema = 'public'
  AND   tc.table_name IN ('assets','licenses','employees','departments','locations')
GROUP BY tc.table_name, ccu.table_name
ORDER BY tc.table_name, ccu.table_name;

SELECT '✅ DONE — Wait 5 seconds, then HARD-REFRESH the browser (Ctrl+Shift+R).' AS message;
