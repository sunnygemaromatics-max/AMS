-- Organization settings (single row)
CREATE TABLE IF NOT EXISTS public.organization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name text NOT NULL DEFAULT 'My Organization',
  org_address text,
  org_phone text,
  org_email text,
  org_website text,
  logo_url text,
  primary_color text DEFAULT '#1e293b',
  pdf_footer_text text,
  email_alerts_enabled boolean NOT NULL DEFAULT false,
  email_alert_recipients text[] NOT NULL DEFAULT ARRAY[]::text[],
  email_alert_days_before integer NOT NULL DEFAULT 10,
  email_alert_time time NOT NULL DEFAULT '09:00:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved view org settings"
  ON public.organization_settings FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Admins insert org settings"
  ON public.organization_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update org settings"
  ON public.organization_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_org_settings_updated
  BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed single row if empty
INSERT INTO public.organization_settings (org_name)
SELECT 'My Organization'
WHERE NOT EXISTS (SELECT 1 FROM public.organization_settings);

-- Public branding bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Branding public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'branding');

CREATE POLICY "Admins upload branding"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update branding"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete branding"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));