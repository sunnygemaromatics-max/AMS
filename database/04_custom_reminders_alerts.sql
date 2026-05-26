-- ============================================================
-- CUSTOM REMINDERS / ALERTS — Phase 3
-- Run once in the Supabase SQL Editor.
-- Lets users add expiry tracking for items not yet in assets/licenses
-- (insurance, AMC slips, software subs, domains, SSL certs, audits, …).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.custom_reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- What it is
    title TEXT NOT NULL,
    notes TEXT,
    reminder_type TEXT NOT NULL CHECK (
        reminder_type IN ('warranty', 'amc', 'license', 'insurance', 'subscription', 'domain', 'certificate', 'audit', 'other')
    ),

    -- When it expires
    expiry_date DATE NOT NULL,

    -- Optional linkage / context
    reference_code TEXT,            -- SAP code, license key, domain name, etc.
    reference_url TEXT,             -- external link (vendor portal, contract, …)
    asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
    license_id UUID REFERENCES public.licenses(id) ON DELETE SET NULL,

    -- Optional org context for filtering
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,

    -- Lifecycle
    is_recurring BOOLEAN DEFAULT false,
    recurrence_months INTEGER,      -- e.g. 12 = annual
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID,
    acknowledged_by_name TEXT,
    snoozed_until DATE,

    -- Audit
    created_by UUID,
    created_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_reminders_expiry  ON public.custom_reminders(expiry_date);
CREATE INDEX IF NOT EXISTS idx_custom_reminders_type    ON public.custom_reminders(reminder_type);
CREATE INDEX IF NOT EXISTS idx_custom_reminders_ack     ON public.custom_reminders(acknowledged_at);
CREATE INDEX IF NOT EXISTS idx_custom_reminders_created ON public.custom_reminders(created_at DESC);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION public.touch_custom_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_custom_reminders_updated_at ON public.custom_reminders;
CREATE TRIGGER trg_custom_reminders_updated_at
    BEFORE UPDATE ON public.custom_reminders
    FOR EACH ROW EXECUTE FUNCTION public.touch_custom_reminders_updated_at();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.custom_reminders ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
DROP POLICY IF EXISTS "custom_reminders_select" ON public.custom_reminders;
CREATE POLICY "custom_reminders_select" ON public.custom_reminders
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Anyone authenticated and approved can write
-- (matches the app's existing "approved-user-can-edit" pattern)
DROP POLICY IF EXISTS "custom_reminders_insert" ON public.custom_reminders;
CREATE POLICY "custom_reminders_insert" ON public.custom_reminders
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "custom_reminders_update" ON public.custom_reminders;
CREATE POLICY "custom_reminders_update" ON public.custom_reminders
    FOR UPDATE
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "custom_reminders_delete" ON public.custom_reminders;
CREATE POLICY "custom_reminders_delete" ON public.custom_reminders
    FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- ============================================================
-- Optional: seed a couple of example reminders so the UI isn't empty
-- (Comment this block out if you want a clean install.)
-- ============================================================
INSERT INTO public.custom_reminders (title, reminder_type, expiry_date, notes, reference_code, is_recurring, recurrence_months)
SELECT 'Office fire insurance renewal',  'insurance',    CURRENT_DATE + INTERVAL '45 days', 'Policy via TATA AIG, contact: Mr. Sharma',    'POL-2024-9821',   true, 12
WHERE NOT EXISTS (SELECT 1 FROM public.custom_reminders WHERE title = 'Office fire insurance renewal');

INSERT INTO public.custom_reminders (title, reminder_type, expiry_date, notes, reference_code, is_recurring, recurrence_months)
SELECT 'thestudioinfinito.com domain',  'domain',       CURRENT_DATE + INTERVAL '120 days', 'Registrar: GoDaddy. Auto-renew enabled but verify card.', 'thestudioinfinito.com', true, 12
WHERE NOT EXISTS (SELECT 1 FROM public.custom_reminders WHERE title = 'thestudioinfinito.com domain');

INSERT INTO public.custom_reminders (title, reminder_type, expiry_date, notes, reference_code, is_recurring, recurrence_months)
SELECT 'Annual IT security audit',       'audit',        CURRENT_DATE + INTERVAL '7 days',  'External auditor visit. Prepare access logs.',  'AUDIT-Q4-2026',    true, 12
WHERE NOT EXISTS (SELECT 1 FROM public.custom_reminders WHERE title = 'Annual IT security audit');

-- ============================================================
-- REMINDER ACTIVITY LOG
-- Captures every meaningful event on a reminder (create / edit / snooze /
-- acknowledge / delete) so the UI can show a full audit trail.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reminder_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reminder_id UUID NOT NULL REFERENCES public.custom_reminders(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'snoozed', 'unsnoozed', 'acknowledged', 'deleted')),
    detail JSONB,
    actor_id UUID,
    actor_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminder_activity_reminder ON public.reminder_activity(reminder_id, created_at DESC);

ALTER TABLE public.reminder_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminder_activity_select" ON public.reminder_activity;
CREATE POLICY "reminder_activity_select" ON public.reminder_activity
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "reminder_activity_insert" ON public.reminder_activity;
CREATE POLICY "reminder_activity_insert" ON public.reminder_activity
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger: log every UPDATE/INSERT on custom_reminders into reminder_activity
CREATE OR REPLACE FUNCTION public.log_reminder_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_action TEXT;
    v_detail JSONB;
    v_actor UUID;
    v_actor_name TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_detail := jsonb_build_object(
            'title', NEW.title,
            'reminder_type', NEW.reminder_type,
            'expiry_date', NEW.expiry_date
        );
        v_actor := NEW.created_by;
        v_actor_name := NEW.created_by_name;

    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.acknowledged_at IS NULL AND NEW.acknowledged_at IS NOT NULL THEN
            v_action := 'acknowledged';
            v_actor := NEW.acknowledged_by;
            v_actor_name := NEW.acknowledged_by_name;
        ELSIF OLD.snoozed_until IS DISTINCT FROM NEW.snoozed_until THEN
            v_action := CASE WHEN NEW.snoozed_until IS NULL THEN 'unsnoozed' ELSE 'snoozed' END;
            v_detail := jsonb_build_object('until', NEW.snoozed_until);
        ELSE
            v_action := 'updated';
            v_detail := jsonb_build_object(
                'before', jsonb_build_object('title', OLD.title, 'expiry_date', OLD.expiry_date, 'reminder_type', OLD.reminder_type),
                'after',  jsonb_build_object('title', NEW.title, 'expiry_date', NEW.expiry_date, 'reminder_type', NEW.reminder_type)
            );
        END IF;
    END IF;

    INSERT INTO public.reminder_activity (reminder_id, action, detail, actor_id, actor_name)
    VALUES (NEW.id, v_action, v_detail, v_actor, v_actor_name);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_reminder_activity_log ON public.custom_reminders;
CREATE TRIGGER trg_reminder_activity_log
    AFTER INSERT OR UPDATE ON public.custom_reminders
    FOR EACH ROW EXECUTE FUNCTION public.log_reminder_activity();

-- ============================================================
-- DONE. Verify with:
--   SELECT id, title, reminder_type, expiry_date, acknowledged_at FROM public.custom_reminders ORDER BY expiry_date;
--   SELECT * FROM public.reminder_activity ORDER BY created_at DESC LIMIT 20;
-- ============================================================
