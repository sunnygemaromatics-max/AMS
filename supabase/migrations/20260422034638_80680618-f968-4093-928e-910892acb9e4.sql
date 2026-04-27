-- Rollback support columns on import_runs
ALTER TABLE public.import_runs
  ADD COLUMN IF NOT EXISTS snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS inserted_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rolled_back_at timestamptz,
  ADD COLUMN IF NOT EXISTS rolled_back_by uuid;

-- Allow updating import_runs (to mark as rolled back). Currently no UPDATE policy exists.
CREATE POLICY "IT/Admin update import_runs"
  ON public.import_runs
  FOR UPDATE
  TO authenticated
  USING (can_write_assets(auth.uid()))
  WITH CHECK (can_write_assets(auth.uid()));

-- DELETE policies needed for rollback (hard-delete inserted rows)
CREATE POLICY "IT/Admin delete employees"
  ON public.employees
  FOR DELETE
  TO authenticated
  USING (is_approved(auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'it'::app_role)));

CREATE POLICY "IT/Admin delete assets"
  ON public.assets
  FOR DELETE
  TO authenticated
  USING (can_write_assets(auth.uid()));

CREATE POLICY "IT/Admin delete licenses"
  ON public.licenses
  FOR DELETE
  TO authenticated
  USING (can_write_assets(auth.uid()));

CREATE POLICY "IT/Admin delete asset_transactions"
  ON public.asset_transactions
  FOR DELETE
  TO authenticated
  USING (can_write_assets(auth.uid()));