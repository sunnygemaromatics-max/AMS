DROP POLICY IF EXISTS "Admins update org settings" ON public.organization_settings;
CREATE POLICY "Admins update org settings"
  ON public.organization_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));