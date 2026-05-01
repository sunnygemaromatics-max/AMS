-- ============================================================
-- FIX: Ensure correct RLS write policies on all entity tables
-- Run this in Supabase SQL Editor if inserts/updates are failing.
-- Safe to re-run (idempotent).
-- ============================================================

-- ── Verify/re-create the core helper functions ────────────────────────────────

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND approval_status = 'approved')
$$;

CREATE OR REPLACE FUNCTION public.can_write_assets(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_approved(_user_id) AND (
    public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'it')
  )
$$;

-- ── Re-create write policies for all entity tables ────────────────────────────

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'locations', 'companies', 'departments',
    'categories', 'vendors', 'licenses',
    'asset_transactions', 'import_runs'
  ] LOOP
    -- Drop any old variants (both naming conventions)
    EXECUTE format('DROP POLICY IF EXISTS "Approved view %1$s"       ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "IT/Admin insert %1$s"     ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "IT/Admin update %1$s"     ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can view %1$s"   ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can insert %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can update %1$s" ON public.%1$s', t);

    -- Re-create clean policies
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
    EXECUTE format(
      'CREATE POLICY "IT/Admin update %1$s" ON public.%1$s
       FOR UPDATE TO authenticated USING (public.can_write_assets(auth.uid()))
       WITH CHECK (public.can_write_assets(auth.uid()))',
      t
    );
  END LOOP;
END $$;

-- ── Assets table (separate because it has extra policies) ─────────────────────
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
  USING (public.can_write_assets(auth.uid()))
  WITH CHECK (public.can_write_assets(auth.uid()));
CREATE POLICY "IT/Admin delete assets" ON public.assets
  FOR DELETE TO authenticated USING (public.can_write_assets(auth.uid()));

-- ── audit_log: triggers insert as SECURITY DEFINER; approved users can read ──
DROP POLICY IF EXISTS "Approved users view audit_log"   ON public.audit_log;
DROP POLICY IF EXISTS "Authenticated insert audit_log"  ON public.audit_log;
DROP POLICY IF EXISTS "IT/Admin insert audit_log"       ON public.audit_log;
DROP POLICY IF EXISTS "IT/Admin update audit_log"       ON public.audit_log;

CREATE POLICY "Approved users view audit_log" ON public.audit_log
  FOR SELECT USING (public.is_approved(auth.uid()));

-- Triggers fire as SECURITY DEFINER so no INSERT policy is needed for them.
-- This policy is a fallback for any direct inserts from app code.
CREATE POLICY "Authenticated insert audit_log" ON public.audit_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ── Verify: show all policies on the key tables ───────────────────────────────
-- Run this SELECT manually to confirm everything is in place:
--
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('companies','assets','employees','audit_log')
-- ORDER BY tablename, cmd;
