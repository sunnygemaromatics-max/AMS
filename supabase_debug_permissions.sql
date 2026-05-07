-- ============================================================
-- DEBUG PERMISSIONS — Step-by-step diagnosis
-- ============================================================

-- 1. Check raw data in profiles table
SELECT '=== RAW PROFILES DATA ===' as section;
SELECT * FROM public.profiles WHERE id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271';

-- 2. Check raw data in user_roles table
SELECT '=== RAW USER_ROLES DATA ===' as section;
SELECT * FROM public.user_roles WHERE user_id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271';

-- 3. Test has_role function step by step
SELECT '=== TESTING has_role() ===' as section;
SELECT 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271' AND role = 'admin') as raw_check,
  public.has_role('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid, 'admin') as function_check;

-- 4. Test is_approved function step by step  
SELECT '=== TESTING is_approved() ===' as section;
SELECT 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271' AND approval_status = 'approved') as raw_check,
  public.is_approved('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid) as function_check;

-- 5. If data exists but functions return false, recreate them
DO $$
DECLARE
  v_has_data BOOLEAN;
  v_func_result BOOLEAN;
BEGIN
  -- Check if data exists
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271' AND role = 'admin') INTO v_has_data;
  SELECT public.has_role('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid, 'admin') INTO v_func_result;
  
  IF v_has_data AND NOT v_func_result THEN
    RAISE NOTICE 'Data exists but function returns false - recreating functions...';
    
    -- Drop and recreate has_role using plpgsql
    DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
    CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role public.app_role)
    RETURNS BOOLEAN
    LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
    AS $func$ BEGIN RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = p_role); END; $func$;
    
    -- Drop and recreate is_approved using plpgsql
    DROP FUNCTION IF EXISTS public.is_approved(uuid) CASCADE;
    CREATE OR REPLACE FUNCTION public.is_approved(p_user_id UUID)
    RETURNS BOOLEAN
    LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
    AS $func$ BEGIN RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND approval_status = 'approved'); END; $func$;
    
    -- Drop and recreate can_write_assets using plpgsql
    DROP FUNCTION IF EXISTS public.can_write_assets(uuid) CASCADE;
    CREATE OR REPLACE FUNCTION public.can_write_assets(p_user_id UUID)
    RETURNS BOOLEAN
    LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
    AS $func$ BEGIN RETURN public.is_approved(p_user_id) AND (public.has_role(p_user_id, 'admin') OR public.has_role(p_user_id, 'it')); END; $func$;
    
    -- Recreate the policies that were dropped
    CREATE POLICY "Approved view profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
    CREATE POLICY "Approved view user_roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
    
    RAISE NOTICE 'Functions and policies recreated!';
  END IF;
END $$;

-- 6. Final verification
SELECT '=== FINAL VERIFICATION ===' as section;
SELECT 
  public.has_role('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid, 'admin') as has_admin,
  public.is_approved('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid) as is_approved,
  public.can_write_assets('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid) as can_write;

-- 7. Force fix if needed - uncomment if all above shows false
-- UPDATE public.profiles SET approval_status = 'approved', approved_at = now() WHERE id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271';
-- DELETE FROM public.user_roles WHERE user_id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271';
-- INSERT INTO public.user_roles (user_id, role) VALUES ('ed8feb2f-7c4a-4a76-b72f-729775b45271', 'admin');
