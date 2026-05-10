-- ════════════════════════════════════════════════════════════════════════════
-- SETUP_AUDIT_TRIGGERS.sql
--
-- Creates a single audit_trigger_fn() and attaches it as an AFTER INSERT/
-- UPDATE/DELETE trigger to every business table. From now on, every change
-- writes a row into public.audit_log automatically.
--
-- Designed to work with the audit_log shape created by SETUP_BIN_CARDS_SAFE.sql:
--    table_name, record_id, action, old_values, new_values, changed_fields,
--    user_id, user_name, user_role, ip_address, user_agent, location_id, notes
--
-- Paste the WHOLE file into Supabase SQL Editor → click RUN. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 1 — make sure the audit_log table exists (with the V2 shape)
-- (no-op if SETUP_BIN_CARDS_SAFE.sql already created it)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name      text NOT NULL,
    record_id       uuid NOT NULL,
    action          text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
    old_values      jsonb,
    new_values      jsonb,
    changed_fields  text[],
    user_id         uuid,
    user_name       text,
    user_role       text,
    ip_address      inet,
    user_agent      text,
    location_id     uuid,
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table   ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record  ON public.audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user    ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 2 — RLS so approved users can read, anyone authenticated can write
-- (writes happen via SECURITY DEFINER trigger anyway, but be explicit)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_log_select_authenticated" ON public.audit_log;
CREATE POLICY "audit_log_select_authenticated" ON public.audit_log
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "audit_log_insert_authenticated" ON public.audit_log;
CREATE POLICY "audit_log_insert_authenticated" ON public.audit_log
    FOR INSERT TO authenticated WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 3 — the trigger function
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER             -- so it can always write to audit_log
SET search_path = public
AS $$
DECLARE
    v_old           jsonb;
    v_new           jsonb;
    v_user_id       uuid;
    v_user_name     text;
    v_user_role     text;
    v_record_id     uuid;
    v_changed       text[] := ARRAY[]::text[];
    v_key           text;
    v_meaningful    int;
BEGIN
    -- Who did this? (NULL when called from the SQL editor or a service role)
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN others THEN
        v_user_id := NULL;
    END;

    IF v_user_id IS NOT NULL THEN
        SELECT COALESCE(p.full_name, u.email)
          INTO v_user_name
          FROM auth.users u
          LEFT JOIN public.profiles p ON p.id = u.id
         WHERE u.id = v_user_id;

        SELECT role::text
          INTO v_user_role
          FROM public.user_roles
         WHERE user_id = v_user_id
         ORDER BY role
         LIMIT 1;
    END IF;

    -- Build payloads + changed-fields list
    IF (TG_OP = 'DELETE') THEN
        v_old       := to_jsonb(OLD);
        v_new       := NULL;
        v_record_id := (v_old->>'id')::uuid;

    ELSIF (TG_OP = 'UPDATE') THEN
        v_old       := to_jsonb(OLD);
        v_new       := to_jsonb(NEW);
        v_record_id := (v_new->>'id')::uuid;

        FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
            IF v_old->v_key IS DISTINCT FROM v_new->v_key THEN
                v_changed := array_append(v_changed, v_key);
            END IF;
        END LOOP;

        -- If the only thing that changed is `updated_at`, skip — pure noise.
        v_meaningful := COALESCE(array_length(v_changed, 1), 0)
                      - (CASE WHEN 'updated_at' = ANY(v_changed) THEN 1 ELSE 0 END);
        IF v_meaningful <= 0 THEN
            RETURN NEW;
        END IF;

    ELSE  -- INSERT
        v_old       := NULL;
        v_new       := to_jsonb(NEW);
        v_record_id := (v_new->>'id')::uuid;
    END IF;

    INSERT INTO public.audit_log (
        table_name, record_id, action,
        old_values, new_values, changed_fields,
        user_id, user_name, user_role
    ) VALUES (
        TG_TABLE_NAME, v_record_id, TG_OP,
        v_old, v_new,
        CASE WHEN array_length(v_changed,1) > 0 THEN v_changed ELSE NULL END,
        v_user_id,
        COALESCE(v_user_name, 'System'),
        v_user_role
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 4 — attach the trigger to every business table
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'assets',
    'employees',
    'locations',
    'departments',
    'companies',
    'vendors',
    'categories',
    'licenses',
    'asset_transactions',
    'bin_card_entries',
    'profiles',
    'user_roles'
  ] LOOP
    -- skip if the table doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema='public' AND table_name=t) THEN
      RAISE NOTICE 'Skipping audit trigger on % — table does not exist', t;
      CONTINUE;
    END IF;

    -- drop any old trigger of either naming convention so we don't double-fire
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s        ON public.%1$s', t);
    EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger_%1$s ON public.%1$s', t);

    EXECUTE format(
      'CREATE TRIGGER audit_%1$s
       AFTER INSERT OR UPDATE OR DELETE ON public.%1$s
       FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn()', t);

    RAISE NOTICE '✔ audit trigger attached to %', t;
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 5 — verify
-- ────────────────────────────────────────────────────────────────────────────
SELECT '=== audit triggers installed ===' AS section;
SELECT  event_object_table AS table_name,
        trigger_name,
        string_agg(event_manipulation, ', ' ORDER BY event_manipulation) AS events
FROM    information_schema.triggers
WHERE   trigger_schema = 'public'
  AND   trigger_name LIKE 'audit_%'
GROUP   BY event_object_table, trigger_name
ORDER   BY event_object_table;

SELECT '=== current audit_log row count ===' AS section;
SELECT COUNT(*) AS rows FROM public.audit_log;

SELECT '✅ DONE. Every INSERT/UPDATE/DELETE on the listed tables will now write to audit_log.' AS message;
SELECT '➡  Try editing an asset or employee in the app — refresh the Audit Trail page to see the entry appear.' AS hint;
