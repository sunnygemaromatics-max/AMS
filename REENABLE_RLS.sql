-- ============================================================
-- RE-ENABLE RLS (Run this after testing)
-- Restores security after emergency disable
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Create basic policies
CREATE POLICY "Allow all" ON public.companies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.locations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.departments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.assets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.licenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.asset_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.user_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT '✅ RLS RE-ENABLED with basic policies' as status;
