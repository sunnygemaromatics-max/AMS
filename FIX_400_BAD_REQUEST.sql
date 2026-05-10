-- ════════════════════════════════════════════════════════════════════════════
-- FIX_400_BAD_REQUEST.sql  (v2 — uses canonical column names)
--
-- Root cause of the empty UI:
--   Every Supabase request returns 400 because columns the frontend expects
--   don't exist (e.g. assets.current_employee_id, assets.purchase_cost,
--   licenses.validity_end) AND because PostgREST's schema cache may still
--   point at an older shape.
--
-- This script:
--   1) Drops the WRONG FKs that an earlier fix created on assets.employee_id
--      and assets.location_id (those columns are not in the canonical schema
--      and create ambiguous join paths).
--   2) Creates every enum the schema needs.
--   3) Adds every column the frontend reads (idempotent).
--   4) Recreates the FK constraints on the CORRECT columns
--      (current_employee_id, current_location_id, etc.).
--   5) NOTIFY pgrst, 'reload schema' so PostgREST picks them up immediately.
--
-- Paste the WHOLE file into Supabase SQL Editor and click RUN.
-- Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 0 — drop the bad FKs/columns from previous attempt
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS fk_assets_employee_id;
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS fk_assets_location_id;
-- Don't drop the columns themselves yet — keep data safe. Just remove the FK
-- constraints so PostgREST doesn't see two FKs from assets→employees.

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
-- STEP 2 — make sure every column the frontend reads exists
-- (canonical names from supabase/migrations/SETUP_NEW_PROJECT.sql)
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
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS imei                text;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS imei2               text;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS iccid               text;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS mobile_number       text;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS sim_provider        text;
ALTER TABLE public.assets       ADD COLUMN IF NOT EXISTS license_key         text;

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
-- STEP 3 — recreate FKs on the CORRECT (canonical) columns
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION pg_temp.add_fk(
  p_table text, p_col text, p_ref_table text, p_ref_col text DEFAULT 'id'
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_constraint text := format('fk_%s_%s', p_table, p_col);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema='public' AND table_name=p_table) THEN
    RAISE NOTICE 'skip table % missing', p_table;
    RETURN;
  END IF;
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

-- assets joins (canonical column names)
SELECT pg_temp.add_fk('assets',     'company_id',           'companies');
SELECT pg_temp.add_fk('assets',     'department_id',        'departments');
SELECT pg_temp.add_fk('assets',     'category_id',          'categories');
SELECT pg_temp.add_fk('assets',     'vendor_id',            'vendors');
SELECT pg_temp.add_fk('assets',     'current_employee_id',  'employees');
SELECT pg_temp.add_fk('assets',     'current_location_id',  'locations');

-- employees joins
SELECT pg_temp.add_fk('employees',  'company_id',           'companies');
SELECT pg_temp.add_fk('employees',  'location_id',          'locations');
SELECT pg_temp.add_fk('employees',  'department_id',        'departments');

-- locations / departments
SELECT pg_temp.add_fk('locations',  'company_id',           'companies');
SELECT pg_temp.add_fk('departments','company_id',           'companies');
SELECT pg_temp.add_fk('departments','location_id',          'locations');

-- licenses joins
SELECT pg_temp.add_fk('licenses',   'company_id',           'companies');
SELECT pg_temp.add_fk('licenses',   'location_id',          'locations');
SELECT pg_temp.add_fk('licenses',   'assigned_employee_id', 'employees');
SELECT pg_temp.add_fk('licenses',   'assigned_asset_id',    'assets');

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 4 — tell PostgREST to reload its schema cache
-- ────────────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 5 — verify the columns the dashboard needs are now present
-- ────────────────────────────────────────────────────────────────────────────
SELECT '=== assets columns (should include current_employee_id, current_location_id, purchase_cost, asset_subtype, warranty_end) ===' AS section;
SELECT column_name, data_type
FROM   information_schema.columns
WHERE  table_schema='public' AND table_name='assets'
  AND  column_name IN ('id','sap_code','name','status','purchase_cost',
                       'current_location_id','current_employee_id',
                       'asset_subtype','warranty_end','department_id','is_deleted')
ORDER  BY column_name;

SELECT '=== licenses columns (should include license_type, validity_end, status) ===' AS section;
SELECT column_name, data_type
FROM   information_schema.columns
WHERE  table_schema='public' AND table_name='licenses'
  AND  column_name IN ('id','license_type','validity_end','status',
                       'assigned_employee_id','assigned_asset_id','company_id','location_id')
ORDER  BY column_name;

SELECT '=== FK constraints on assets ===' AS section;
SELECT  kcu.column_name, ccu.table_name AS references_table
FROM    information_schema.table_constraints tc
JOIN    information_schema.key_column_usage  kcu ON tc.constraint_name = kcu.constraint_name
JOIN    information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE   tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' AND tc.table_name='assets'
ORDER   BY kcu.column_name;

SELECT '✅ DONE. Wait ~5s, then HARD-REFRESH the browser (Ctrl+Shift+R).' AS message;
