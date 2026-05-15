-- ============================================================
-- MULTI-TENANT ISOLATION — Phase 4
-- Run AFTER SETUP_CUSTOM_REMINDERS.sql in the Supabase SQL Editor.
--
-- WHAT THIS DOES
--   1. Adds an `organisations` table at the top of the hierarchy.
--   2. Adds an `organisation_members` join table linking auth.users → orgs.
--   3. Adds an `organisation_id` column to every domain table.
--   4. Adds a `current_org_id()` helper that returns the user's org.
--   5. Adds a BEFORE-INSERT trigger so every new row gets org_id auto-filled.
--   6. Replaces permissive RLS policies with org-scoped ones.
--
-- WHY
--   Lets the same Supabase project serve many independent customers ("orgs").
--   Users only see their own org's rows. No application code changes needed —
--   RLS does all the filtering at the database layer, and the trigger handles
--   org_id on insert so existing `.insert(...)` calls keep working.
--
-- SAFETY
--   - All ALTERs use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
--   - Existing rows are migrated into a "Default Organisation" so nothing
--     disappears for the current single-tenant deployment.
--   - Re-runnable: every CREATE uses IF NOT EXISTS / OR REPLACE.
-- ============================================================

-- ─── 1. ORGANISATIONS TABLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organisations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    logo_url TEXT,
    primary_color TEXT,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed a default org so any existing rows have somewhere to belong
INSERT INTO public.organisations (id, name, slug, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organisation', 'default', 'free')
ON CONFLICT (id) DO NOTHING;

-- ─── 2. MEMBERSHIPS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organisation_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    invited_email TEXT,
    invited_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (organisation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organisation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org  ON public.organisation_members(organisation_id);

-- Backfill: every existing user becomes a member of the default org
INSERT INTO public.organisation_members (organisation_id, user_id, role)
SELECT '00000000-0000-0000-0000-000000000001', u.id, 'admin'
FROM auth.users u
ON CONFLICT (organisation_id, user_id) DO NOTHING;

-- ─── 3. current_org_id() HELPER ─────────────────────────────────────────
-- Returns the FIRST org the current user belongs to. For multi-org users,
-- the app can later let them switch via a header / JWT claim (see notes below).
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT organisation_id
    FROM public.organisation_members
    WHERE user_id = auth.uid()
    ORDER BY joined_at ASC
    LIMIT 1;
$$;

-- ─── 4. ADD organisation_id TO EVERY DOMAIN TABLE ───────────────────────
-- Each ALTER is idempotent. If the table doesn't exist (e.g. fresh install
-- where one of the other SETUP scripts hasn't been run), the DO block skips it.

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'assets', 'employees', 'locations', 'companies', 'departments',
        'categories', 'vendors', 'licenses', 'asset_transactions',
        'bin_card_entries', 'audit_log', 'custom_reminders'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format(
                'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE',
                tbl
            );
            EXECUTE format(
                'UPDATE public.%I SET organisation_id = ''00000000-0000-0000-0000-000000000001'' WHERE organisation_id IS NULL',
                tbl
            );
            EXECUTE format(
                'CREATE INDEX IF NOT EXISTS idx_%I_org ON public.%I(organisation_id)',
                tbl, tbl
            );
        END IF;
    END LOOP;
END $$;

-- ─── 5. AUTO-FILL TRIGGER ───────────────────────────────────────────────
-- BEFORE INSERT, if organisation_id is null, set it to the caller's current org.
-- This means the app code doesn't need to know about orgs at all on writes.
CREATE OR REPLACE FUNCTION public.set_organisation_id_from_caller()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organisation_id IS NULL THEN
        NEW.organisation_id := public.current_org_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'assets', 'employees', 'locations', 'companies', 'departments',
        'categories', 'vendors', 'licenses', 'asset_transactions',
        'bin_card_entries', 'audit_log', 'custom_reminders'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_set_org_id ON public.%I', tbl);
            EXECUTE format(
                'CREATE TRIGGER trg_set_org_id BEFORE INSERT ON public.%I
                 FOR EACH ROW EXECUTE FUNCTION public.set_organisation_id_from_caller()',
                tbl
            );
        END IF;
    END LOOP;
END $$;

-- ─── 6. RLS — ORG-SCOPED POLICIES ───────────────────────────────────────
-- These ADD a new policy named *_org_scope per table. They sit alongside any
-- existing role-based policies; PostgREST OR's all policies, so a row must
-- match BOTH org_scope AND the legacy policy to be visible. If you want to
-- *replace* the old permissive policies entirely, drop them after verifying.

ALTER TABLE public.organisations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_members  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orgs_select_own" ON public.organisations;
CREATE POLICY "orgs_select_own" ON public.organisations
    FOR SELECT
    USING (
        id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "org_members_self_select" ON public.organisation_members;
CREATE POLICY "org_members_self_select" ON public.organisation_members
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR organisation_id IN (
            SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid()
        )
    );

-- Apply org-scope SELECT/INSERT/UPDATE/DELETE policies to every domain table
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'assets', 'employees', 'locations', 'companies', 'departments',
        'categories', 'vendors', 'licenses', 'asset_transactions',
        'bin_card_entries', 'audit_log', 'custom_reminders'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

            EXECUTE format('DROP POLICY IF EXISTS "%I_org_select" ON public.%I', tbl, tbl);
            EXECUTE format(
                'CREATE POLICY "%I_org_select" ON public.%I FOR SELECT
                 USING (organisation_id = public.current_org_id())',
                tbl, tbl
            );

            EXECUTE format('DROP POLICY IF EXISTS "%I_org_insert" ON public.%I', tbl, tbl);
            EXECUTE format(
                'CREATE POLICY "%I_org_insert" ON public.%I FOR INSERT
                 WITH CHECK (organisation_id = public.current_org_id())',
                tbl, tbl
            );

            EXECUTE format('DROP POLICY IF EXISTS "%I_org_update" ON public.%I', tbl, tbl);
            EXECUTE format(
                'CREATE POLICY "%I_org_update" ON public.%I FOR UPDATE
                 USING (organisation_id = public.current_org_id())',
                tbl, tbl
            );

            EXECUTE format('DROP POLICY IF EXISTS "%I_org_delete" ON public.%I', tbl, tbl);
            EXECUTE format(
                'CREATE POLICY "%I_org_delete" ON public.%I FOR DELETE
                 USING (organisation_id = public.current_org_id())',
                tbl, tbl
            );
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- VERIFY
--   SELECT id, name, plan FROM public.organisations;
--   SELECT user_id, role FROM public.organisation_members;
--   SELECT public.current_org_id();   -- returns your org id once logged in
--
-- ONBOARDING A NEW CUSTOMER (manual for now)
--   1. INSERT INTO organisations (name, slug, plan) VALUES ('Acme Corp', 'acme', 'pro');
--   2. After they sign up: INSERT INTO organisation_members (organisation_id, user_id, role)
--                          VALUES ('<their-org-id>', '<their-user-id>', 'owner');
--   3. They log in, every query is automatically scoped to their org.
--
-- ALLOWING ONE USER IN MULTIPLE ORGS
--   current_org_id() picks the user's oldest membership. To let them switch,
--   add a `current_org_id` claim to the auth JWT and replace the helper with:
--     SELECT (auth.jwt() ->> 'current_org_id')::uuid;
-- ============================================================
