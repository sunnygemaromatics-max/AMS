-- ----------------------------------------------------------------------------
-- Custom field definitions: admin-managed extensible schema.
-- Admins define extra fields (label, type, optional dropdown options, optional
-- subtype scope). The app form renders them dynamically when adding/editing
-- the relevant entity. Values are stored in a JSONB column on the entity row.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('asset','employee','license','credential')),
    field_key   TEXT NOT NULL,                  -- snake_case key in the JSONB
    field_label TEXT NOT NULL,                  -- shown in the form
    field_type  TEXT NOT NULL CHECK (
      field_type IN ('text','textarea','number','date','boolean','dropdown','url','email')
    ),
    options JSONB,                              -- for dropdown: ["A","B","C"]
    applies_to_subtypes TEXT[],                 -- NULL = all subtypes of the entity
    placeholder TEXT,
    help_text   TEXT,
    is_required BOOLEAN DEFAULT false,
    is_active   BOOLEAN DEFAULT true,
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (entity_type, field_key)
);

CREATE INDEX IF NOT EXISTS idx_cfd_entity   ON public.custom_field_definitions(entity_type, sort_order);
CREATE INDEX IF NOT EXISTS idx_cfd_active   ON public.custom_field_definitions(is_active);

CREATE OR REPLACE FUNCTION public.touch_cfd_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cfd_updated_at ON public.custom_field_definitions;
CREATE TRIGGER trg_cfd_updated_at
  BEFORE UPDATE ON public.custom_field_definitions
  FOR EACH ROW EXECUTE FUNCTION public.touch_cfd_updated_at();

-- ── Add JSONB value columns to the entities that support custom fields ─────
ALTER TABLE public.assets    ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.licenses  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- GIN indexes so we can later filter / search inside custom field values
CREATE INDEX IF NOT EXISTS idx_assets_custom_fields    ON public.assets    USING GIN (custom_fields);
CREATE INDEX IF NOT EXISTS idx_employees_custom_fields ON public.employees USING GIN (custom_fields);
CREATE INDEX IF NOT EXISTS idx_licenses_custom_fields  ON public.licenses  USING GIN (custom_fields);

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

-- Any signed-in user can READ definitions (the form needs them).
DROP POLICY IF EXISTS "cfd_select_all" ON public.custom_field_definitions;
CREATE POLICY "cfd_select_all" ON public.custom_field_definitions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admin can manage definitions.
DROP POLICY IF EXISTS "cfd_admin_insert" ON public.custom_field_definitions;
CREATE POLICY "cfd_admin_insert" ON public.custom_field_definitions
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "cfd_admin_update" ON public.custom_field_definitions;
CREATE POLICY "cfd_admin_update" ON public.custom_field_definitions
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "cfd_admin_delete" ON public.custom_field_definitions;
CREATE POLICY "cfd_admin_delete" ON public.custom_field_definitions
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));
