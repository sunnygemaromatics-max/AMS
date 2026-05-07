-- ============================================================
-- FIX: has_role function ambiguous column reference
-- ERROR: column reference "user_id" is ambiguous
-- ============================================================

-- Drop functions with CASCADE to remove dependent policies
DROP FUNCTION IF EXISTS public.has_role(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.can_write_assets(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_approved(uuid) CASCADE;

-- Recreate with unambiguous aliases using plpgsql for clarity
CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_roles.user_id = p_user_id 
    AND user_roles.role = p_role
  );
END;
$$;

-- Also fix can_write_assets
CREATE OR REPLACE FUNCTION public.can_write_assets(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN public.is_approved(p_user_id) AND (
    public.has_role(p_user_id, 'admin') OR public.has_role(p_user_id, 'it')
  );
END;
$$;

-- Fix is_approved too
CREATE OR REPLACE FUNCTION public.is_approved(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.id = p_user_id 
    AND profiles.approval_status = 'approved'
  );
END;
$$;

-- Recreate the policies that were dropped by CASCADE
-- Profiles policies
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins insert profiles" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Admins update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR id = auth.uid());

-- User roles policies
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Entity table policies (locations, companies, departments, categories, vendors, licenses, employees, assets)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'locations', 'companies', 'departments', 'categories', 'vendors', 
    'licenses', 'asset_transactions', 'import_runs', 'employees', 'assets'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Approved view %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admin IT insert %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admin IT update %1$s" ON public.%1$s', t);
    EXECUTE format('
      CREATE POLICY "Approved view %1$s" ON public.%1$s 
      FOR SELECT TO authenticated 
      USING (public.is_approved(auth.uid()))', t
    );
    EXECUTE format('
      CREATE POLICY "Admin IT insert %1$s" ON public.%1$s 
      FOR INSERT TO authenticated 
      WITH CHECK (public.has_role(auth.uid(), ''admin'') OR public.has_role(auth.uid(), ''it''))', t
    );
    EXECUTE format('
      CREATE POLICY "Admin IT update %1$s" ON public.%1$s 
      FOR UPDATE TO authenticated 
      USING (public.has_role(auth.uid(), ''admin'') OR public.has_role(auth.uid(), ''it''))', t
    );
  END LOOP;
END $$;

-- Employees also needs HR role
DROP POLICY IF EXISTS "Admin IT insert employees" ON public.employees;
DROP POLICY IF EXISTS "Admin IT update employees" ON public.employees;
DROP POLICY IF EXISTS "Admin IT HR insert employees" ON public.employees;
DROP POLICY IF EXISTS "Admin IT HR update employees" ON public.employees;
CREATE POLICY "Admin IT HR insert employees" ON public.employees 
  FOR INSERT TO authenticated 
  WITH CHECK ((public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it') OR public.has_role(auth.uid(), 'hr')));
CREATE POLICY "Admin IT HR update employees" ON public.employees 
  FOR UPDATE TO authenticated 
  USING ((public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it') OR public.has_role(auth.uid(), 'hr')));

-- Assets also has delete policy
DROP POLICY IF EXISTS "Admin IT delete assets" ON public.assets;
CREATE POLICY "Admin IT delete assets" ON public.assets
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it'));

-- Verify the fix
SELECT 
  'Functions and policies recreated successfully' as status,
  public.has_role(auth.uid(), 'admin') as has_admin_test,
  public.is_approved(auth.uid()) as is_approved_test,
  public.can_write_assets(auth.uid()) as can_write_test;
