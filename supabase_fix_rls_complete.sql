-- ============================================================
-- COMPLETE RLS FIX — Run this in Supabase SQL Editor
-- Fixes "Save failed — the record could not be found" errors
-- ============================================================

-- 1. First, verify your user has correct permissions
SELECT 
  auth.uid() as current_user_id,
  (SELECT approval_status FROM public.profiles WHERE id = auth.uid()) as your_approval_status,
  (SELECT array_agg(role) FROM public.user_roles WHERE user_id = auth.uid()) as your_roles,
  public.is_approved(auth.uid()) as is_you_approved,
  public.has_role(auth.uid(), 'admin') as is_you_admin,
  public.can_write_assets(auth.uid()) as can_you_write;

-- 2. If any of the above returns false/NULL, fix your profile first
-- Uncomment and modify if needed:
-- UPDATE public.profiles SET approval_status = 'approved', approved_at = now() WHERE id = auth.uid();
-- INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin') ON CONFLICT DO NOTHING;

-- 3. Drop conflicting permissive policies and recreate restrictive ones
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'locations', 'companies', 'departments',
    'categories', 'vendors', 'licenses',
    'asset_transactions', 'import_runs', 'employees'
  ] LOOP
    -- Drop all permissive "true" policies
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can view %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can insert %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can update %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Approved users view %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "IT/Admin insert %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "IT/Admin update %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Approved view %1$s" ON public.%1$s', t);
    
    -- Create new policies with proper checks
    -- SELECT: approved users can view
    EXECUTE format('
      CREATE POLICY "Approved view %1$s" ON public.%1$s 
      FOR SELECT TO authenticated 
      USING (public.is_approved(auth.uid()))', t
    );
    
    -- INSERT: admin/it can insert (no approval check for first-user scenario)
    EXECUTE format('
      CREATE POLICY "Admin IT insert %1$s" ON public.%1$s 
      FOR INSERT TO authenticated 
      WITH CHECK (public.has_role(auth.uid(), ''admin'') OR public.has_role(auth.uid(), ''it''))', t
    );
    
    -- UPDATE: admin/it can update (no approval check for write operation itself)
    EXECUTE format('
      CREATE POLICY "Admin IT update %1$s" ON public.%1$s 
      FOR UPDATE TO authenticated 
      USING (public.has_role(auth.uid(), ''admin'') OR public.has_role(auth.uid(), ''it''))', t
    );
  END LOOP;
END $$;

-- 4. Special handling for ASSETS (also has DELETE)
DROP POLICY IF EXISTS "Authenticated users can view assets" ON public.assets;
DROP POLICY IF EXISTS "Authenticated users can insert assets" ON public.assets;
DROP POLICY IF EXISTS "Authenticated users can update assets" ON public.assets;
DROP POLICY IF EXISTS "Authenticated users can delete assets" ON public.assets;
DROP POLICY IF EXISTS "Approved users view assets" ON public.assets;
DROP POLICY IF EXISTS "IT/Admin insert assets" ON public.assets;
DROP POLICY IF EXISTS "IT/Admin update assets" ON public.assets;
DROP POLICY IF EXISTS "IT/Admin delete assets" ON public.assets;
DROP POLICY IF EXISTS "Approved view assets" ON public.assets;
DROP POLICY IF EXISTS "Admin IT insert assets" ON public.assets;
DROP POLICY IF EXISTS "Admin IT update assets" ON public.assets;
DROP POLICY IF EXISTS "Admin IT delete assets" ON public.assets;

CREATE POLICY "Approved view assets" ON public.assets
  FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "Admin IT insert assets" ON public.assets
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it'));
CREATE POLICY "Admin IT update assets" ON public.assets
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it'));
CREATE POLICY "Admin IT delete assets" ON public.assets
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it'));

-- 5. Ensure employees table has HR policy too
DROP POLICY IF EXISTS "HR IT Admin insert employees" ON public.employees;
DROP POLICY IF EXISTS "HR IT Admin update employees" ON public.employees;
DROP POLICY IF EXISTS "HR/IT/Admin insert employees" ON public.employees;
DROP POLICY IF EXISTS "HR/IT/Admin update employees" ON public.employees;

CREATE POLICY "Admin IT HR insert employees" ON public.employees 
  FOR INSERT TO authenticated 
  WITH CHECK ((public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it') OR public.has_role(auth.uid(), 'hr')));
CREATE POLICY "Admin IT HR update employees" ON public.employees 
  FOR UPDATE TO authenticated 
  USING ((public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it') OR public.has_role(auth.uid(), 'hr')));

-- 6. Fix profiles policies to ensure users can always see/update their own profile
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins insert profiles" ON public.profiles;

CREATE POLICY "Users view own or admin view all" ON public.profiles 
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own" ON public.profiles 
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Admins update any" ON public.profiles 
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert" ON public.profiles 
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR id = auth.uid());

-- 7. Ensure handle_new_user trigger properly auto-approves first user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, approval_status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email), 'pending')
  ON CONFLICT (id) DO NOTHING;

  SELECT COUNT(*) INTO v_count FROM public.profiles WHERE approval_status = 'approved';
  IF v_count = 0 THEN
    UPDATE public.profiles SET approval_status = 'approved', approved_at = now() WHERE id = NEW.id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 8. Final verification
SELECT 'RLS policies updated successfully' as status;

-- 9. Test data visibility
SELECT 
  'locations' as table_name, 
  (SELECT COUNT(*) FROM public.locations) as total_rows,
  (SELECT COUNT(*) FROM public.locations WHERE is_active = true) as active_rows
UNION ALL SELECT 'companies', (SELECT COUNT(*) FROM public.companies), (SELECT COUNT(*) FROM public.companies WHERE is_active = true)
UNION ALL SELECT 'departments', (SELECT COUNT(*) FROM public.departments), (SELECT COUNT(*) FROM public.departments WHERE is_active = true)
UNION ALL SELECT 'categories', (SELECT COUNT(*) FROM public.categories), (SELECT COUNT(*) FROM public.categories)
UNION ALL SELECT 'vendors', (SELECT COUNT(*) FROM public.vendors), (SELECT COUNT(*) FROM public.vendors WHERE is_active = true)
UNION ALL SELECT 'employees', (SELECT COUNT(*) FROM public.employees), (SELECT COUNT(*) FROM public.employees WHERE is_active = true)
UNION ALL SELECT 'assets', (SELECT COUNT(*) FROM public.assets), (SELECT COUNT(*) FROM public.assets WHERE is_deleted = false)
UNION ALL SELECT 'licenses', (SELECT COUNT(*) FROM public.licenses), (SELECT COUNT(*) FROM public.licenses);
