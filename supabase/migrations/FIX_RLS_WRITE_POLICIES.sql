-- ============================================================
-- FIX: Ensure correct RLS write policies on all entity tables
-- Run this in Supabase SQL Editor if inserts/updates are failing.
-- Safe to re-run (idempotent).
--
-- NOTE: does NOT redefine helper functions (has_role, is_approved,
-- can_write_assets) — those already exist in the live DB and
-- PostgreSQL refuses to rename parameters via CREATE OR REPLACE.
-- ============================================================

-- ── Entity tables: SELECT / INSERT / UPDATE policies ─────────────────────────

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'locations', 'companies', 'departments',
    'categories', 'vendors', 'licenses',
    'asset_transactions', 'import_runs'
  ] LOOP
    -- Drop all known naming variants so we start clean
    EXECUTE format('DROP POLICY IF EXISTS "Approved view %1$s"                    ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "IT/Admin insert %1$s"                  ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "IT/Admin update %1$s"                  ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can view %1$s"     ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can insert %1$s"   ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can update %1$s"   ON public.%1$s', t);

    EXECUTE format(
      'CREATE POLICY "Approved view %1$s" ON public.%1$s
       FOR SELECT TO authenticated USING (public.is_approved(auth.uid()))',
      t
    );
    EXECUTE format(
      'CREATE POLICY "IT/Admin insert %1$s" ON public.%1$s
       FOR INSERT TO authenticated WITH CHECK (public.can_write_assets(auth.uid()))',
      t
    );
    -- WITH CHECK added to UPDATE so the new values are also validated
    EXECUTE format(
      'CREATE POLICY "IT/Admin update %1$s" ON public.%1$s
       FOR UPDATE TO authenticated
       USING     (public.can_write_assets(auth.uid()))
       WITH CHECK (public.can_write_assets(auth.uid()))',
      t
    );
  END LOOP;
END $$;

-- ── Assets (has DELETE policy too) ───────────────────────────────────────────

DROP POLICY IF EXISTS "Approved users view assets" ON public.assets;
DROP POLICY IF EXISTS "IT/Admin insert assets"     ON public.assets;
DROP POLICY IF EXISTS "IT/Admin update assets"     ON public.assets;
DROP POLICY IF EXISTS "IT/Admin delete assets"     ON public.assets;

CREATE POLICY "Approved users view assets" ON public.assets
  FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));

CREATE POLICY "IT/Admin insert assets" ON public.assets
  FOR INSERT TO authenticated WITH CHECK (public.can_write_assets(auth.uid()));

CREATE POLICY "IT/Admin update assets" ON public.assets
  FOR UPDATE TO authenticated
  USING     (public.can_write_assets(auth.uid()))
  WITH CHECK (public.can_write_assets(auth.uid()));

CREATE POLICY "IT/Admin delete assets" ON public.assets
  FOR DELETE TO authenticated USING (public.can_write_assets(auth.uid()));

-- ── Employees (HR can also write) ────────────────────────────────────────────

DROP POLICY IF EXISTS "Approved view employees"      ON public.employees;
DROP POLICY IF EXISTS "HR/IT/Admin insert employees" ON public.employees;
DROP POLICY IF EXISTS "HR/IT/Admin update employees" ON public.employees;
DROP POLICY IF EXISTS "IT/Admin delete employees"    ON public.employees;

CREATE POLICY "Approved view employees" ON public.employees
  FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));

CREATE POLICY "HR/IT/Admin insert employees" ON public.employees
  FOR INSERT TO authenticated WITH CHECK (
    public.is_approved(auth.uid()) AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'it')    OR
      public.has_role(auth.uid(), 'hr')
    )
  );

CREATE POLICY "HR/IT/Admin update employees" ON public.employees
  FOR UPDATE TO authenticated
  USING (
    public.is_approved(auth.uid()) AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'it')    OR
      public.has_role(auth.uid(), 'hr')
    )
  )
  WITH CHECK (
    public.is_approved(auth.uid()) AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'it')    OR
      public.has_role(auth.uid(), 'hr')
    )
  );

CREATE POLICY "IT/Admin delete employees" ON public.employees
  FOR DELETE TO authenticated USING (public.can_write_assets(auth.uid()));

-- ── audit_log ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Approved users view audit_log"  ON public.audit_log;
DROP POLICY IF EXISTS "Authenticated insert audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "IT/Admin insert audit_log"      ON public.audit_log;
DROP POLICY IF EXISTS "IT/Admin update audit_log"      ON public.audit_log;

-- Approved users can read the audit trail
CREATE POLICY "Approved users view audit_log" ON public.audit_log
  FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));

-- DB triggers run as SECURITY DEFINER and bypass RLS, so no INSERT policy
-- is required for them. This covers any app-level direct inserts.
CREATE POLICY "Authenticated insert audit_log" ON public.audit_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ── Verification query (run manually to confirm) ──────────────────────────────
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename IN ('companies','assets','employees','locations','departments','audit_log')
-- ORDER BY tablename, cmd, policyname;
