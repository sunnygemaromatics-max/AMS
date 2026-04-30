-- ============================================================
-- AUDIT TRAIL + USERNAME LOGIN MIGRATION
-- Run this ONCE in the Supabase SQL Editor.
-- Safe to re-run (idempotent).
-- ============================================================

-- ── 1. Add username + email columns to profiles ───────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username  TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email     TEXT;

CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (LOWER(username));
CREATE INDEX IF NOT EXISTS profiles_email_idx    ON public.profiles (email);

-- ── 2. Update handle_new_user to capture username + email ─────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username     TEXT;
  v_is_first     BOOLEAN;
BEGIN
  -- Derive username: prefer explicit meta, else email local-part sanitised
  v_username := LOWER(TRIM(COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'username', ''),
    REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9_]', '_', 'g')
  )));

  SELECT (COUNT(*) = 0) INTO v_is_first FROM public.profiles;

  INSERT INTO public.profiles (id, full_name, avatar_url, email, username, approval_status)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), SPLIT_PART(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    v_username,
    CASE WHEN v_is_first THEN 'approved' ELSE 'pending' END
  )
  ON CONFLICT (id) DO UPDATE SET
    email    = EXCLUDED.email,
    username = COALESCE(profiles.username, EXCLUDED.username),
    full_name= COALESCE(profiles.full_name, EXCLUDED.full_name);

  -- First user gets admin role automatically
  IF v_is_first THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 3. username lookup helper functions (used by frontend) ────────────────────
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT AS $$
  SELECT email FROM public.profiles
  WHERE LOWER(username) = LOWER(TRIM(p_username))
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.username_available(p_username TEXT)
RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE LOWER(username) = LOWER(TRIM(p_username))
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_email_by_username TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.username_available    TO anon, authenticated;

-- ── 4. audit_log table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  -- What changed
  entity_type      TEXT        NOT NULL, -- 'asset' | 'employee' | 'license' | 'asset_transaction'
  entity_id        UUID,
  entity_code      TEXT,                 -- SAP code, employee code, license key, etc.
  entity_name      TEXT,                 -- human-readable name
  action           TEXT        NOT NULL, -- 'created' | 'updated' | 'deleted' | 'deactivated' | 'allocation' | 'return' | 'transfer' | ...
  -- Who did it
  actor_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name       TEXT,
  actor_username   TEXT,
  -- Diff
  old_values       JSONB,
  new_values       JSONB,
  -- Denormalised context for fast filtering (no joins needed in reports)
  company_name     TEXT,
  department_name  TEXT,
  location_name    TEXT,
  employee_name    TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for every filter the UI will use
CREATE INDEX IF NOT EXISTS audit_entity_type_idx   ON public.audit_log (entity_type);
CREATE INDEX IF NOT EXISTS audit_action_idx         ON public.audit_log (action);
CREATE INDEX IF NOT EXISTS audit_actor_id_idx       ON public.audit_log (actor_id);
CREATE INDEX IF NOT EXISTS audit_created_at_idx     ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_company_idx        ON public.audit_log (company_name);
CREATE INDEX IF NOT EXISTS audit_dept_idx           ON public.audit_log (department_name);
CREATE INDEX IF NOT EXISTS audit_location_idx       ON public.audit_log (location_name);
CREATE INDEX IF NOT EXISTS audit_employee_idx       ON public.audit_log (employee_name);
CREATE INDEX IF NOT EXISTS audit_entity_code_idx    ON public.audit_log (entity_code);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Approved users view audit_log"  ON public.audit_log;
CREATE POLICY "Approved users view audit_log" ON public.audit_log
  FOR SELECT USING (is_approved());

-- Triggers insert as SECURITY DEFINER, so no INSERT policy needed for them.
-- Allow authenticated users to insert (fallback for app-level logging).
DROP POLICY IF EXISTS "Authenticated insert audit_log" ON public.audit_log;
CREATE POLICY "Authenticated insert audit_log" ON public.audit_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ── 5. Trigger: assets ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_audit_assets()
RETURNS TRIGGER AS $$
DECLARE
  v_action         TEXT;
  v_actor_id       UUID  := auth.uid();
  v_actor_name     TEXT;
  v_actor_username TEXT;
  v_loc_name       TEXT;
  v_comp_name      TEXT;
  v_dept_name      TEXT;
  v_emp_name       TEXT;
BEGIN
  IF v_actor_id IS NOT NULL THEN
    SELECT full_name, username INTO v_actor_name, v_actor_username
    FROM public.profiles WHERE id = v_actor_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_deleted = TRUE AND NOT COALESCE(OLD.is_deleted, FALSE) THEN
      v_action := 'deleted';
    ELSE
      v_action := 'updated';
    END IF;
  END IF;

  SELECT l.name INTO v_loc_name  FROM public.locations   l WHERE l.id = COALESCE(NEW.current_location_id, OLD.current_location_id);
  SELECT c.name INTO v_comp_name FROM public.companies   c WHERE c.id = COALESCE(NEW.company_id, OLD.company_id);
  SELECT d.name INTO v_dept_name FROM public.departments d WHERE d.id = COALESCE(NEW.department_id, OLD.department_id);
  SELECT e.name INTO v_emp_name  FROM public.employees   e WHERE e.id = COALESCE(NEW.current_employee_id, OLD.current_employee_id);

  INSERT INTO public.audit_log (
    entity_type, entity_id, entity_code, entity_name, action,
    actor_id, actor_name, actor_username,
    old_values, new_values,
    company_name, department_name, location_name, employee_name
  ) VALUES (
    'asset', COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.sap_code, OLD.sap_code),
    COALESCE(NEW.name, OLD.name),
    v_action,
    v_actor_id, v_actor_name, v_actor_username,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW),
    v_comp_name, v_dept_name, v_loc_name, v_emp_name
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_assets ON public.assets;
CREATE TRIGGER trg_audit_assets
  AFTER INSERT OR UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_assets();

-- ── 6. Trigger: employees ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_audit_employees()
RETURNS TRIGGER AS $$
DECLARE
  v_action         TEXT;
  v_actor_id       UUID  := auth.uid();
  v_actor_name     TEXT;
  v_actor_username TEXT;
  v_loc_name       TEXT;
  v_comp_name      TEXT;
BEGIN
  IF v_actor_id IS NOT NULL THEN
    SELECT full_name, username INTO v_actor_name, v_actor_username
    FROM public.profiles WHERE id = v_actor_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_active = FALSE AND COALESCE(OLD.is_active, TRUE) = TRUE THEN
      v_action := 'deactivated';
    ELSE
      v_action := 'updated';
    END IF;
  END IF;

  SELECT l.name INTO v_loc_name  FROM public.locations l WHERE l.id = COALESCE(NEW.location_id, OLD.location_id);
  SELECT c.name INTO v_comp_name FROM public.companies c WHERE c.id = COALESCE(NEW.company_id, OLD.company_id);

  INSERT INTO public.audit_log (
    entity_type, entity_id, entity_code, entity_name, action,
    actor_id, actor_name, actor_username,
    old_values, new_values,
    company_name, department_name, location_name
  ) VALUES (
    'employee', COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.employee_code, OLD.employee_code),
    COALESCE(NEW.name, OLD.name),
    v_action,
    v_actor_id, v_actor_name, v_actor_username,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW),
    v_comp_name, COALESCE(NEW.department, OLD.department), v_loc_name
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_employees ON public.employees;
CREATE TRIGGER trg_audit_employees
  AFTER INSERT OR UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_employees();

-- ── 7. Trigger: licenses ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_audit_licenses()
RETURNS TRIGGER AS $$
DECLARE
  v_action         TEXT;
  v_actor_id       UUID  := auth.uid();
  v_actor_name     TEXT;
  v_actor_username TEXT;
  v_loc_name       TEXT;
  v_comp_name      TEXT;
  v_emp_name       TEXT;
BEGIN
  IF v_actor_id IS NOT NULL THEN
    SELECT full_name, username INTO v_actor_name, v_actor_username
    FROM public.profiles WHERE id = v_actor_id;
  END IF;

  IF    TG_OP = 'INSERT' THEN v_action := 'created';
  ELSIF TG_OP = 'UPDATE' THEN v_action := 'updated';
  ELSIF TG_OP = 'DELETE' THEN v_action := 'deleted';
  END IF;

  SELECT l.name INTO v_loc_name  FROM public.locations l WHERE l.id = COALESCE(NEW.location_id, OLD.location_id);
  SELECT c.name INTO v_comp_name FROM public.companies c WHERE c.id = COALESCE(NEW.company_id, OLD.company_id);
  SELECT e.name INTO v_emp_name  FROM public.employees e WHERE e.id = COALESCE(NEW.assigned_employee_id, OLD.assigned_employee_id);

  INSERT INTO public.audit_log (
    entity_type, entity_id, entity_code, entity_name, action,
    actor_id, actor_name, actor_username,
    old_values, new_values,
    company_name, location_name, employee_name
  ) VALUES (
    'license', COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.license_key, OLD.license_key),
    COALESCE(NEW.product_name, NEW.license_type, OLD.product_name, OLD.license_type),
    v_action,
    v_actor_id, v_actor_name, v_actor_username,
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    v_comp_name, v_loc_name, v_emp_name
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_licenses ON public.licenses;
CREATE TRIGGER trg_audit_licenses
  AFTER INSERT OR UPDATE OR DELETE ON public.licenses
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_licenses();

-- ── 8. Trigger: asset_transactions (allocations, returns, transfers) ──────────
CREATE OR REPLACE FUNCTION public.trg_audit_transactions()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id       UUID  := auth.uid();
  v_actor_name     TEXT;
  v_actor_username TEXT;
  v_asset_code     TEXT;
  v_asset_name     TEXT;
  v_comp_name      TEXT;
  v_dept_name      TEXT;
  v_emp_name       TEXT;
  v_loc_name       TEXT;
BEGIN
  IF v_actor_id IS NOT NULL THEN
    SELECT full_name, username INTO v_actor_name, v_actor_username
    FROM public.profiles WHERE id = v_actor_id;
  END IF;

  SELECT a.sap_code, a.name, co.name, d.name
  INTO   v_asset_code, v_asset_name, v_comp_name, v_dept_name
  FROM   public.assets a
  LEFT JOIN public.companies   co ON co.id = a.company_id
  LEFT JOIN public.departments d  ON d.id  = a.department_id
  WHERE  a.id = NEW.asset_id;

  SELECT e.name INTO v_emp_name FROM public.employees e
  WHERE e.id = COALESCE(NEW.to_employee_id, NEW.from_employee_id);

  SELECT l.name INTO v_loc_name FROM public.locations l
  WHERE l.id = COALESCE(NEW.to_location_id, NEW.from_location_id);

  INSERT INTO public.audit_log (
    entity_type, entity_id, entity_code, entity_name, action,
    actor_id, actor_name, actor_username,
    new_values,
    company_name, department_name, location_name, employee_name, notes
  ) VALUES (
    'asset_transaction', NEW.id, v_asset_code, v_asset_name,
    NEW.transaction_type,
    v_actor_id, v_actor_name, v_actor_username,
    to_jsonb(NEW),
    v_comp_name, v_dept_name, v_loc_name, v_emp_name, NEW.notes
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_transactions ON public.asset_transactions;
CREATE TRIGGER trg_audit_transactions
  AFTER INSERT ON public.asset_transactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_transactions();

-- ── 9. Enable Realtime for audit_log ─────────────────────────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_log;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
