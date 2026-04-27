CREATE TABLE public.import_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  performed_by UUID,
  performed_by_name TEXT,
  file_names TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  total_rows INT NOT NULL DEFAULT 0,
  inserted INT NOT NULL DEFAULT 0,
  skipped INT NOT NULL DEFAULT 0,
  failed INT NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.import_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved view import_runs" ON public.import_runs FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "IT/Admin insert import_runs" ON public.import_runs FOR INSERT TO authenticated WITH CHECK (public.can_write_assets(auth.uid()));

CREATE INDEX idx_import_runs_created_at ON public.import_runs(created_at DESC);