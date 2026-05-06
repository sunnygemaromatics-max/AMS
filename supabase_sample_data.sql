-- ============================================================
-- ASSET HARMONY — SAMPLE DATA SEED (1 of each entity)
-- Run in Supabase SQL Editor.
-- SCHEMA-DEFENSIVE: each insert checks which columns actually exist in
-- your DB and only inserts into those (handles schema drift gracefully).
-- All sample rows are prefixed "Sample " (and codes "SAMPLE-...") so
-- admins can easily identify and delete them later.
-- Idempotent: safe to re-run.
-- ============================================================

-- Helper: insert a row into a target table using only the columns that
-- exist in the live schema. Skips silently if the row already exists.
CREATE OR REPLACE FUNCTION pg_temp.safe_insert(
  p_table  TEXT,
  p_data   JSONB,
  p_unique TEXT DEFAULT NULL  -- column name to check for uniqueness; NULL = always insert
) RETURNS VOID AS $func$
DECLARE
  v_cols  TEXT := '';
  v_vals  TEXT := '';
  v_key   TEXT;
  v_val   JSONB;
  v_exists BOOLEAN;
  v_unique_val TEXT;
BEGIN
  -- If a uniqueness column was provided and a matching row already exists, skip.
  IF p_unique IS NOT NULL AND p_data ? p_unique THEN
    v_unique_val := p_data ->> p_unique;
    EXECUTE format(
      'SELECT EXISTS (SELECT 1 FROM public.%I WHERE %I = %L)',
      p_table, p_unique, v_unique_val
    ) INTO v_exists;
    IF v_exists THEN
      RAISE NOTICE 'safe_insert: % already has %=%, skipping', p_table, p_unique, v_unique_val;
      RETURN;
    END IF;
  END IF;

  -- Build column/value lists from JSONB, only including columns that exist.
  FOR v_key, v_val IN SELECT * FROM jsonb_each(p_data) LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = p_table
        AND column_name  = v_key
    ) THEN
      IF v_cols <> '' THEN v_cols := v_cols || ', '; v_vals := v_vals || ', '; END IF;
      v_cols := v_cols || quote_ident(v_key);
      -- jsonb_typeof preserves NULLs; for everything else, cast text
      IF jsonb_typeof(v_val) = 'null' THEN
        v_vals := v_vals || 'NULL';
      ELSIF jsonb_typeof(v_val) = 'string' THEN
        v_vals := v_vals || quote_literal(v_val #>> '{}');
      ELSIF jsonb_typeof(v_val) = 'boolean' OR jsonb_typeof(v_val) = 'number' THEN
        v_vals := v_vals || (v_val #>> '{}');
      ELSE
        v_vals := v_vals || quote_literal(v_val::text);
      END IF;
    END IF;
  END LOOP;

  IF v_cols = '' THEN
    RAISE NOTICE 'safe_insert: no matching columns for %, skipping', p_table;
    RETURN;
  END IF;

  EXECUTE format('INSERT INTO public.%I (%s) VALUES (%s) ON CONFLICT DO NOTHING',
                 p_table, v_cols, v_vals);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'safe_insert into % failed: % (continuing)', p_table, SQLERRM;
END;
$func$ LANGUAGE plpgsql;

BEGIN;

-- 1. COMPANY
SELECT pg_temp.safe_insert('companies', jsonb_build_object(
  'name', 'Sample Company TSI',
  'code', 'SAMPLE-CO',
  'is_active', true
), 'name');

-- 2. LOCATION  (handles schemas with or without 'code' column)
SELECT pg_temp.safe_insert('locations', jsonb_build_object(
  'name', 'Sample HQ',
  'code', 'SAMPLE-LOC',
  'address', '123 TSI Street, Mumbai',
  'is_active', true
), 'name');

-- 3. DEPARTMENT
SELECT pg_temp.safe_insert('departments', jsonb_build_object(
  'name', 'Sample IT Department',
  'code', 'SAMPLE-DEPT',
  'is_active', true
), 'name');

-- 4. CATEGORY
SELECT pg_temp.safe_insert('categories', jsonb_build_object(
  'name', 'Sample Laptop Category',
  'code', 'SAMPLE-CAT',
  'is_active', true
), 'name');

-- 5. VENDOR
SELECT pg_temp.safe_insert('vendors', jsonb_build_object(
  'name', 'Sample Vendor Co.',
  'contact_person', 'John Doe',
  'email', 'sample.vendor@example.com',
  'phone', '+91 9876543210',
  'address', '456 Vendor Lane, Mumbai',
  'gst_number', '27ABCDE1234F1Z5',
  'is_active', true
), 'name');

-- 6/7/8. EMPLOYEE → ASSET → LICENSE  (look up FKs defensively by name)
DO $$
DECLARE
  v_dept_id    UUID;
  v_loc_id     UUID;
  v_company_id UUID;
  v_cat_id     UUID;
  v_vendor_id  UUID;
  v_emp_id     UUID;
  v_next_bin   BIGINT;
BEGIN
  -- Look up parent IDs by NAME (works even if 'code' column is missing)
  SELECT id INTO v_dept_id    FROM public.departments WHERE name = 'Sample IT Department'   LIMIT 1;
  SELECT id INTO v_loc_id     FROM public.locations   WHERE name = 'Sample HQ'              LIMIT 1;
  SELECT id INTO v_company_id FROM public.companies   WHERE name = 'Sample Company TSI'     LIMIT 1;
  SELECT id INTO v_cat_id     FROM public.categories  WHERE name = 'Sample Laptop Category' LIMIT 1;
  SELECT id INTO v_vendor_id  FROM public.vendors     WHERE name = 'Sample Vendor Co.'      LIMIT 1;

  -- 6. EMPLOYEE
  PERFORM pg_temp.safe_insert('employees', jsonb_build_object(
    'employee_code',   'SAMPLE-EMP-001',
    'name',            'Sample Employee',
    'email',           'sample.employee@example.com',
    'phone',           '+91 9876543211',
    'department',      'Sample IT Department',
    'designation',     'Software Engineer',
    'department_id',   v_dept_id,
    'location_id',     v_loc_id,
    'company_id',      v_company_id,
    'is_active',       true,
    'employee_type',   'full_time',
    'date_of_joining', (CURRENT_DATE - INTERVAL '1 year')::text
  ), 'employee_code');

  SELECT id INTO v_emp_id FROM public.employees WHERE employee_code = 'SAMPLE-EMP-001' LIMIT 1;

  -- 7. ASSET — bin_card_no must be unique; pick a high free number
  SELECT COALESCE(MAX(bin_card_no), 0) + 1000 INTO v_next_bin FROM public.assets;
  PERFORM pg_temp.safe_insert('assets', jsonb_build_object(
    'sap_code',             'SAMPLE-ASSET-001',
    'bin_card_no',          v_next_bin,
    'name',                 'Sample Laptop',
    'brand',                'Dell',
    'model',                'Latitude 5520',
    'serial_number',        'SN-SAMPLE-001',
    'specifications',       'Intel i7 11th Gen, 16GB RAM, 512GB SSD',
    'asset_type',           'tangible',
    'asset_subtype',        'laptop',
    'is_consumable',        false,
    'purchase_date',        (CURRENT_DATE - INTERVAL '6 months')::text,
    'purchase_bill_no',     'BILL-SAMPLE-001',
    'purchase_cost',        85000,
    'vendor_id',            v_vendor_id,
    'warranty_start',       (CURRENT_DATE - INTERVAL '6 months')::text,
    'warranty_end',         (CURRENT_DATE + INTERVAL '30 months')::text,
    'status',               'available',
    'current_employee_id',  v_emp_id,
    'current_location_id',  v_loc_id,
    'company_id',           v_company_id,
    'category_id',          v_cat_id,
    'department_id',        v_dept_id,
    'notes',                'Sample asset created for demonstration. Safe to delete.',
    'is_deleted',           false
  ), 'sap_code');

  -- 8. LICENSE
  PERFORM pg_temp.safe_insert('licenses', jsonb_build_object(
    'license_type',         'Microsoft Office 365',
    'license_key',          'SAMPLE-LIC-XXXX-XXXX-XXXX',
    'product_name',         'Microsoft 365 Business',
    'email_id',             'sample.license@example.com',
    'validity_start',       (CURRENT_DATE - INTERVAL '1 month')::text,
    'validity_end',         (CURRENT_DATE + INTERVAL '11 months')::text,
    'max_users',            1,
    'current_users',        1,
    'assigned_employee_id', v_emp_id,
    'company_id',           v_company_id,
    'location_id',          v_loc_id,
    'status',               'active',
    'notes',                'Sample license created for demonstration. Safe to delete.'
  ), 'license_key');
END $$;

COMMIT;

-- ============================================================
-- VERIFY: show what was inserted (fully schema-defensive)
-- For each table, picks the first available identifier column and
-- counts how many rows match, so it never references a missing column.
-- ============================================================
DO $$
DECLARE
  v_specs JSONB := jsonb_build_array(
    jsonb_build_object('table','companies',   'where_col','name',          'where_val','Sample Company TSI'),
    jsonb_build_object('table','locations',   'where_col','name',          'where_val','Sample HQ'),
    jsonb_build_object('table','departments', 'where_col','name',          'where_val','Sample IT Department'),
    jsonb_build_object('table','categories',  'where_col','name',          'where_val','Sample Laptop Category'),
    jsonb_build_object('table','vendors',     'where_col','name',          'where_val','Sample Vendor Co.'),
    jsonb_build_object('table','employees',   'where_col','employee_code', 'where_val','SAMPLE-EMP-001'),
    jsonb_build_object('table','assets',      'where_col','sap_code',      'where_val','SAMPLE-ASSET-001'),
    jsonb_build_object('table','licenses',    'where_col','license_key',   'where_val','SAMPLE-LIC-XXXX-XXXX-XXXX')
  );
  v_spec   JSONB;
  v_table  TEXT;
  v_col    TEXT;
  v_val    TEXT;
  v_count  INT;
  v_has_col BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Sample Data Verification ===';
  FOR v_spec IN SELECT * FROM jsonb_array_elements(v_specs) LOOP
    v_table := v_spec ->> 'table';
    v_col   := v_spec ->> 'where_col';
    v_val   := v_spec ->> 'where_val';

    -- Verify the where_col exists; if not, fall back to counting all rows
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = v_table AND column_name = v_col
    ) INTO v_has_col;

    IF v_has_col THEN
      EXECUTE format('SELECT COUNT(*) FROM public.%I WHERE %I = %L', v_table, v_col, v_val)
        INTO v_count;
      RAISE NOTICE '  % : % row(s) where %=%', rpad(v_table, 12), v_count, v_col, v_val;
    ELSE
      EXECUTE format('SELECT COUNT(*) FROM public.%I', v_table) INTO v_count;
      RAISE NOTICE '  % : % total row(s)  (column "%" not found, showing total)',
        rpad(v_table, 12), v_count, v_col;
    END IF;
  END LOOP;
  RAISE NOTICE '================================';
END $$;

-- ============================================================
-- 🗑️  ADMIN CLEANUP (run later to remove all sample data)
-- ============================================================
-- DELETE FROM public.licenses    WHERE license_key   = 'SAMPLE-LIC-XXXX-XXXX-XXXX';
-- DELETE FROM public.assets      WHERE sap_code      = 'SAMPLE-ASSET-001';
-- DELETE FROM public.employees   WHERE employee_code = 'SAMPLE-EMP-001';
-- DELETE FROM public.vendors     WHERE name = 'Sample Vendor Co.';
-- DELETE FROM public.categories  WHERE name = 'Sample Laptop Category';
-- DELETE FROM public.departments WHERE name = 'Sample IT Department';
-- DELETE FROM public.locations   WHERE name = 'Sample HQ';
-- DELETE FROM public.companies   WHERE name = 'Sample Company TSI';
