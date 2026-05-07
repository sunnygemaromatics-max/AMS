-- ============================================================
-- DIAGNOSE: Schema-defensive single-result diagnostic
-- Run in Supabase SQL Editor; share screenshot of the result.
-- ============================================================

DO $$
DECLARE
  spec  JSONB := jsonb_build_array(
    -- table, sample_col, sample_val, filter_col, filter_val
    jsonb_build_array('companies',   'name',          'Sample Company TSI',      'is_active',  'true'),
    jsonb_build_array('locations',   'name',          'Sample HQ',               'is_active',  'true'),
    jsonb_build_array('departments', 'name',          'Sample IT Department',    'is_active',  'true'),
    jsonb_build_array('categories',  'name',          'Sample Laptop Category',  NULL,         NULL),
    jsonb_build_array('vendors',     'name',          'Sample Vendor Co.',       'is_active',  'true'),
    jsonb_build_array('employees',   'employee_code', 'SAMPLE-EMP-001',          'is_active',  'true'),
    jsonb_build_array('assets',      'sap_code',      'SAMPLE-ASSET-001',        'is_deleted', 'false'),
    jsonb_build_array('licenses',    NULL,            NULL,                      NULL,         NULL)
  );
  s            JSONB;
  v_table      TEXT;
  v_sample_col TEXT;
  v_sample_val TEXT;
  v_filter_col TEXT;
  v_filter_val TEXT;
  v_total      INT;
  v_visible    INT;
  v_sample     BOOLEAN;
  v_rls_on     BOOLEAN;
  v_policies   INT;
  v_has_filter BOOLEAN;
  v_has_sample BOOLEAN;
BEGIN
  -- Build a temp table to collect rows
  DROP TABLE IF EXISTS _diag;
  CREATE TEMP TABLE _diag (
    table_name        TEXT,
    total_rows        INT,
    rows_app_can_see  INT,
    sample_row_in_db  TEXT,
    rls_enabled       BOOLEAN,
    rls_policy_count  INT
  );

  FOR s IN SELECT * FROM jsonb_array_elements(spec) LOOP
    v_table      := s ->> 0;
    v_sample_col := s ->> 1;
    v_sample_val := s ->> 2;
    v_filter_col := s ->> 3;
    v_filter_val := s ->> 4;

    -- total
    EXECUTE format('SELECT COUNT(*) FROM public.%I', v_table) INTO v_total;

    -- visible to app (filter only if column exists)
    IF v_filter_col IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name=v_table AND column_name=v_filter_col
      ) INTO v_has_filter;
      IF v_has_filter THEN
        EXECUTE format('SELECT COUNT(*) FROM public.%I WHERE %I = %L',
                       v_table, v_filter_col, v_filter_val) INTO v_visible;
      ELSE
        v_visible := v_total;  -- no filter column means hook would error or skip filter
      END IF;
    ELSE
      v_visible := v_total;
    END IF;

    -- sample row presence (if column exists)
    IF v_sample_col IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name=v_table AND column_name=v_sample_col
      ) INTO v_has_sample;
      IF v_has_sample THEN
        EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE %I = %L)',
                       v_table, v_sample_col, v_sample_val) INTO v_sample;
      ELSE
        v_sample := NULL;
      END IF;
    ELSE
      v_sample := NULL;
    END IF;

    -- RLS info
    SELECT rowsecurity INTO v_rls_on FROM pg_tables
      WHERE schemaname='public' AND tablename=v_table;
    SELECT COUNT(*)::int INTO v_policies FROM pg_policies
      WHERE schemaname='public' AND tablename=v_table;

    INSERT INTO _diag VALUES (
      v_table, v_total, v_visible,
      CASE WHEN v_sample IS NULL THEN 'n/a'
           WHEN v_sample THEN 'YES' ELSE 'no' END,
      v_rls_on, v_policies
    );
  END LOOP;
END $$;

SELECT * FROM _diag ORDER BY table_name;
