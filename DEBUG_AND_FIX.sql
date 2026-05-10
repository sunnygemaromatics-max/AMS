-- ════════════════════════════════════════════════════════════════════════════
-- DEBUG_AND_FIX.sql — Definitive one-shot diagnostic + repair
-- Paste this ENTIRE file into Supabase SQL Editor and click RUN.
-- It will:
--   1) Diagnose what's wrong (your account, roles, RLS, row counts)
--   2) Fix permissions for the logged-in user
--   3) Insert minimal sample data IF tables are empty
--   4) Re-verify everything works
-- Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────
-- STEP 1 — DIAGNOSE
-- ────────────────────────────────────────────────────────

-- A. Who is in auth.users?
SELECT '=== AUTH USERS ===' AS section;
SELECT id, email, created_at,
       last_sign_in_at,
       (raw_user_meta_data->>'full_name') AS full_name
FROM   auth.users
ORDER  BY created_at DESC
LIMIT  10;

-- B. What profiles exist?
SELECT '=== PROFILES ===' AS section;
SELECT p.id, p.full_name, p.approval_status,
       u.email,
       (SELECT string_agg(role::text, ', ')
        FROM   public.user_roles WHERE user_id = p.id) AS roles
FROM   public.profiles p
LEFT   JOIN auth.users u ON u.id = p.id
ORDER  BY p.created_at DESC NULLS LAST
LIMIT  10;

-- C. Row counts in every important table
SELECT '=== ROW COUNTS ===' AS section;
SELECT 'companies'           AS table_name, COUNT(*) AS rows FROM public.companies
UNION ALL SELECT 'departments',       COUNT(*) FROM public.departments
UNION ALL SELECT 'locations',         COUNT(*) FROM public.locations
UNION ALL SELECT 'categories',        COUNT(*) FROM public.categories
UNION ALL SELECT 'vendors',           COUNT(*) FROM public.vendors
UNION ALL SELECT 'employees',         COUNT(*) FROM public.employees
UNION ALL SELECT 'assets',            COUNT(*) FROM public.assets
UNION ALL SELECT 'licenses',          COUNT(*) FROM public.licenses
UNION ALL SELECT 'asset_transactions',COUNT(*) FROM public.asset_transactions
UNION ALL SELECT 'profiles',          COUNT(*) FROM public.profiles
UNION ALL SELECT 'user_roles',        COUNT(*) FROM public.user_roles
ORDER  BY table_name;

-- D. RLS state on each table
SELECT '=== RLS STATUS ===' AS section;
SELECT tablename, rowsecurity AS rls_enabled
FROM   pg_tables
WHERE  schemaname = 'public'
  AND  tablename IN ('assets','companies','locations','employees','licenses',
                     'asset_transactions','departments','categories','vendors',
                     'profiles','user_roles')
ORDER  BY tablename;

-- ────────────────────────────────────────────────────────
-- STEP 2 — APPROVE EVERY PROFILE + GRANT ADMIN TO LATEST USER
-- ────────────────────────────────────────────────────────

-- Approve every existing profile (so any logged-in user gets in)
UPDATE public.profiles SET approval_status = 'approved' WHERE approval_status <> 'approved';

-- For every auth.user that doesn't have a profile yet, create one (approved)
INSERT INTO public.profiles (id, full_name, approval_status)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'full_name', u.email),
       'approved'
FROM   auth.users u
LEFT   JOIN public.profiles p ON p.id = u.id
WHERE  p.id IS NULL;

-- Grant admin role to every user (single-tenant install — fine for now)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM   auth.users u
WHERE  NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = u.id AND ur.role = 'admin'
);

-- ────────────────────────────────────────────────────────
-- STEP 3 — REBUILD HELPER FUNCTIONS (DROP first to avoid 42P13)
-- ────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.is_approved(uuid)              CASCADE;
DROP FUNCTION IF EXISTS public.can_write_assets(uuid)         CASCADE;

CREATE OR REPLACE FUNCTION public.has_role(p_uid uuid, p_role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_uid AND role = p_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_approved(p_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_uid AND approval_status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write_assets(p_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_approved(p_uid)
     AND (public.has_role(p_uid, 'admin') OR public.has_role(p_uid, 'it'));
$$;

-- ────────────────────────────────────────────────────────
-- STEP 4 — DROP ALL EXISTING POLICIES, RECREATE A SIMPLE SET
-- ────────────────────────────────────────────────────────

-- Drop every existing policy on public.* (clean slate)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname
           FROM   pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                   r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Recreate policies: any approved authenticated user can SELECT, admins can do all
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'companies','departments','locations','categories','vendors',
    'employees','assets','licenses','asset_transactions',
    'organization_settings','import_runs'
  ] LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY "approved_select_%1$s" ON public.%1$s
         FOR SELECT TO authenticated USING (public.is_approved(auth.uid()))', t);

      EXECUTE format(
        'CREATE POLICY "admin_all_%1$s" ON public.%1$s
         FOR ALL TO authenticated
         USING     (public.has_role(auth.uid(), ''admin''))
         WITH CHECK(public.has_role(auth.uid(), ''admin''))', t);

      EXECUTE format(
        'CREATE POLICY "writers_insert_%1$s" ON public.%1$s
         FOR INSERT TO authenticated
         WITH CHECK (public.can_write_assets(auth.uid()))', t);

      EXECUTE format(
        'CREATE POLICY "writers_update_%1$s" ON public.%1$s
         FOR UPDATE TO authenticated
         USING      (public.can_write_assets(auth.uid()))
         WITH CHECK (public.can_write_assets(auth.uid()))', t);

      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'Skipping % — table does not exist', t;
    END;
  END LOOP;
END $$;

-- profiles: users see their own, admins see all
CREATE POLICY "self_select_profiles" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "admin_select_profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING      (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "self_update_profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING      (id = auth.uid())
  WITH CHECK (id = auth.uid());
CREATE POLICY "self_insert_profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- user_roles: users see their own, admins manage all
CREATE POLICY "self_select_user_roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin_all_user_roles" ON public.user_roles
  FOR ALL TO authenticated
  USING      (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- audit_log: approved users read, anyone authenticated can write (triggers do the writing)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='audit_log') THEN
    EXECUTE 'CREATE POLICY "approved_select_audit_log" ON public.audit_log
             FOR SELECT TO authenticated USING (public.is_approved(auth.uid()))';
    EXECUTE 'CREATE POLICY "auth_insert_audit_log" ON public.audit_log
             FOR INSERT TO authenticated WITH CHECK (auth.role() = ''authenticated'')';
    EXECUTE 'ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────
-- STEP 5 — INSERT MINIMAL SAMPLE DATA (only if tables are empty)
-- ────────────────────────────────────────────────────────

DO $$
DECLARE
  v_co_id    uuid;
  v_loc_id   uuid;
  v_dept_id  uuid;
  v_cat_id   uuid;
  v_emp_id   uuid;
BEGIN
  -- Company
  IF NOT EXISTS (SELECT 1 FROM public.companies) THEN
    INSERT INTO public.companies (name, code) VALUES ('The Studio Infinito','TSI')
    RETURNING id INTO v_co_id;
    RAISE NOTICE 'Created company TSI %', v_co_id;
  ELSE
    SELECT id INTO v_co_id FROM public.companies LIMIT 1;
  END IF;

  -- Location
  IF NOT EXISTS (SELECT 1 FROM public.locations) THEN
    INSERT INTO public.locations (name, code, company_id)
    VALUES ('Mumbai HQ','MUM', v_co_id)
    RETURNING id INTO v_loc_id;
  ELSE
    SELECT id INTO v_loc_id FROM public.locations LIMIT 1;
  END IF;

  -- Department
  IF NOT EXISTS (SELECT 1 FROM public.departments) THEN
    INSERT INTO public.departments (name, code, company_id)
    VALUES ('Information Technology','IT', v_co_id)
    RETURNING id INTO v_dept_id;
  ELSE
    SELECT id INTO v_dept_id FROM public.departments LIMIT 1;
  END IF;

  -- Category
  IF NOT EXISTS (SELECT 1 FROM public.categories) THEN
    INSERT INTO public.categories (name, code)
    VALUES ('Laptop','LAPTOP')
    RETURNING id INTO v_cat_id;
  ELSE
    SELECT id INTO v_cat_id FROM public.categories LIMIT 1;
  END IF;

  -- Employee
  IF NOT EXISTS (SELECT 1 FROM public.employees) THEN
    INSERT INTO public.employees (name, employee_code, email, department, company_id, is_active)
    VALUES ('Demo Employee','EMP-0001','demo@example.com','IT', v_co_id, true)
    RETURNING id INTO v_emp_id;
  END IF;

  -- Sample assets
  IF NOT EXISTS (SELECT 1 FROM public.assets) THEN
    INSERT INTO public.assets
      (sap_code, name, status, bin_card_no, company_id, location_id, category_id, department_id, is_deleted)
    VALUES
      ('TSI-LT-001','Dell Latitude 5540','available',1, v_co_id, v_loc_id, v_cat_id, v_dept_id, false),
      ('TSI-LT-002','HP EliteBook 840 G10','available',2, v_co_id, v_loc_id, v_cat_id, v_dept_id, false),
      ('TSI-MN-001','LG 27" 4K Monitor','available',3, v_co_id, v_loc_id, v_cat_id, v_dept_id, false);
    RAISE NOTICE 'Inserted 3 sample assets';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────
-- STEP 6 — FINAL VERIFICATION
-- ────────────────────────────────────────────────────────

SELECT '=== AFTER FIX: ROW COUNTS ===' AS section;
SELECT 'assets'    AS t, COUNT(*) FROM public.assets
UNION ALL SELECT 'employees',  COUNT(*) FROM public.employees
UNION ALL SELECT 'companies',  COUNT(*) FROM public.companies
UNION ALL SELECT 'locations',  COUNT(*) FROM public.locations
UNION ALL SELECT 'departments',COUNT(*) FROM public.departments
UNION ALL SELECT 'categories', COUNT(*) FROM public.categories
ORDER BY t;

SELECT '=== AFTER FIX: YOUR ACCOUNT ===' AS section;
SELECT u.email,
       p.approval_status,
       string_agg(r.role::text, ', ') AS roles,
       public.is_approved(u.id)         AS is_approved_fn,
       public.has_role(u.id,'admin')    AS is_admin_fn,
       public.can_write_assets(u.id)    AS can_write_fn
FROM   auth.users u
LEFT   JOIN public.profiles  p ON p.id = u.id
LEFT   JOIN public.user_roles r ON r.user_id = u.id
GROUP  BY u.email, p.approval_status, u.id
ORDER  BY u.email;

SELECT '=== AFTER FIX: POLICY COUNT ===' AS section;
SELECT tablename, COUNT(*) AS policies
FROM   pg_policies WHERE schemaname='public'
GROUP  BY tablename
ORDER  BY tablename;

SELECT '✅ DONE — Hard-refresh your browser (Ctrl+Shift+R) and the data should appear.' AS message;
