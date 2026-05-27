-- ----------------------------------------------------------------------------
-- Credentials vault: one table for both
--   (a) credentials linked to an asset (email account, QNAP login, router admin)
--   (b) standalone credentials with no asset (vendor portals, cloud consoles)
--
-- Access model: ONLY admin or it roles can SELECT / INSERT / UPDATE / DELETE.
-- Everyone else gets an empty result set — no password leaks via the API.
-- The UI shows a "Restricted to Admin / IT" placeholder for those users.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,                         -- e.g. "Gmail admin", "QNAP root", "Office WiFi"
    credential_type TEXT NOT NULL CHECK (
      credential_type IN (
        'email','qnap','router','firewall','switch','access_point','wifi',
        'server','database','cloud','vpn','rdp','domain','ssl','ftp','vendor_portal','other'
      )
    ),
    username TEXT,
    password TEXT,                              -- stored as-is; RLS gates SELECT to admin/it only
    url TEXT,
    notes TEXT,

    -- Optional links
    asset_id      UUID REFERENCES public.assets(id)      ON DELETE SET NULL,
    company_id    UUID REFERENCES public.companies(id)   ON DELETE SET NULL,
    location_id   UUID REFERENCES public.locations(id)   ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,

    -- Audit
    created_by UUID,
    created_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credentials_asset    ON public.credentials(asset_id);
CREATE INDEX IF NOT EXISTS idx_credentials_type     ON public.credentials(credential_type);
CREATE INDEX IF NOT EXISTS idx_credentials_company  ON public.credentials(company_id);
CREATE INDEX IF NOT EXISTS idx_credentials_created  ON public.credentials(created_at DESC);

-- updated_at maintenance
CREATE OR REPLACE FUNCTION public.touch_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_credentials_updated_at ON public.credentials;
CREATE TRIGGER trg_credentials_updated_at
  BEFORE UPDATE ON public.credentials
  FOR EACH ROW EXECUTE FUNCTION public.touch_credentials_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credentials_admin_it_select" ON public.credentials;
CREATE POLICY "credentials_admin_it_select" ON public.credentials
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'it'::public.app_role)
  );

DROP POLICY IF EXISTS "credentials_admin_it_insert" ON public.credentials;
CREATE POLICY "credentials_admin_it_insert" ON public.credentials
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'it'::public.app_role)
  );

DROP POLICY IF EXISTS "credentials_admin_it_update" ON public.credentials;
CREATE POLICY "credentials_admin_it_update" ON public.credentials
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'it'::public.app_role)
  );

DROP POLICY IF EXISTS "credentials_admin_it_delete" ON public.credentials;
CREATE POLICY "credentials_admin_it_delete" ON public.credentials
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'it'::public.app_role)
  );

-- ── Helper: count how many credentials a non-privileged user *would* see ──
-- The UI uses this to render "X credentials (Admin/IT only)" without exposing
-- any data. SECURITY DEFINER bypasses RLS for the count only.
CREATE OR REPLACE FUNCTION public.credentials_count_for_asset(p_asset_id UUID)
RETURNS INTEGER
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.credentials WHERE asset_id = p_asset_id;
$$;
