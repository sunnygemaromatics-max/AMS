-- ============================================================
-- COMPLETE ONE-SHOT FIX — Introspects schema, then fixes everything
-- ============================================================

-- STEP 1: Discover actual schema (no assumptions)
DO $$
DECLARE
  v_user_id UUID := 'ed8feb2f-7c4a-4a76-b72f-729775b45271';
  v_profiles_cols TEXT[];
  v_user_roles_cols TEXT[];
  v_insert_cols TEXT;
  v_values TEXT;
  v_update_set TEXT;
BEGIN
  -- Get actual columns in profiles
  SELECT array_agg(column_name) INTO v_profiles_cols
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'profiles';
  
  -- Get actual columns in user_roles  
  SELECT array_agg(column_name) INTO v_user_roles_cols
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'user_roles';
  
  RAISE NOTICE 'Profiles columns: %', v_profiles_cols;
  RAISE NOTICE 'User_roles columns: %', v_user_roles_cols;
  
  -- Build dynamic INSERT for profiles with only existing columns
  v_insert_cols := 'id';
  v_values := quote_literal(v_user_id);
  v_update_set := '';
  
  IF 'full_name' = ANY(v_profiles_cols) THEN
    v_insert_cols := v_insert_cols || ', full_name';
    v_values := v_values || ', ' || quote_literal('sunny.sobhani90@gmail.com');
  END IF;
  
  IF 'approval_status' = ANY(v_profiles_cols) THEN
    v_insert_cols := v_insert_cols || ', approval_status';
    v_values := v_values || ', ' || quote_literal('approved');
    v_update_set := v_update_set || 'approval_status = ' || quote_literal('approved') || ', ';
  END IF;
  
  IF 'approved_at' = ANY(v_profiles_cols) THEN
    v_insert_cols := v_insert_cols || ', approved_at';
    v_values := v_values || ', now()';
    v_update_set := v_update_set || 'approved_at = now(), ';
  END IF;
  
  IF 'created_at' = ANY(v_profiles_cols) THEN
    v_insert_cols := v_insert_cols || ', created_at';
    v_values := v_values || ', now()';
  END IF;
  
  -- Remove trailing comma from update_set
  IF length(v_update_set) > 0 THEN
    v_update_set := left(v_update_set, length(v_update_set) - 2);
  ELSE
    v_update_set := 'id = id'; -- dummy update
  END IF;
  
  -- Execute dynamic profiles upsert
  EXECUTE format(
    'INSERT INTO public.profiles (%s) VALUES (%s) ON CONFLICT (id) DO UPDATE SET %s',
    v_insert_cols, v_values, v_update_set
  );
  
  RAISE NOTICE 'Profiles upsert executed with columns: %', v_insert_cols;
  
  -- Build dynamic INSERT for user_roles
  v_insert_cols := 'user_id, role';
  v_values := quote_literal(v_user_id) || ', ' || quote_literal('admin');
  
  IF 'id' = ANY(v_user_roles_cols) THEN
    v_insert_cols := 'id, ' || v_insert_cols;
    v_values := 'gen_random_uuid(), ' || v_values;
  END IF;
  
  -- Execute dynamic user_roles insert
  EXECUTE format(
    'INSERT INTO public.user_roles (%s) VALUES (%s) ON CONFLICT DO NOTHING',
    v_insert_cols, v_values
  );
  
  RAISE NOTICE 'User_roles insert executed';
  
END $$;

-- STEP 2: Verify the fix worked
SELECT 
  '=== VERIFICATION ===' as step;

SELECT 
  (SELECT approval_status FROM public.profiles WHERE id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271') as your_approval_status,
  (SELECT count(*) FROM public.user_roles WHERE user_id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271') as your_role_count,
  (SELECT role FROM public.user_roles WHERE user_id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271' LIMIT 1) as your_role;

-- STEP 3: Test the security functions
SELECT 
  '=== SECURITY CHECK ===' as step,
  public.has_role('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid, 'admin') as has_admin,
  public.is_approved('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid) as is_approved,
  public.can_write_assets('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid) as can_write;

-- STEP 4: If still false, the functions are broken - recreate them
DO $$
BEGIN
  IF NOT public.has_role('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid, 'admin') THEN
    RAISE NOTICE 'has_role returned false - recreating functions...';
    
    -- Recreate has_role with explicit table references
    CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role public.app_role)
    RETURNS BOOLEAN
    LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
    AS $func$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p_user_id AND ur.role = p_role
      );
    END;
    $func$;
    
    -- Recreate is_approved
    CREATE OR REPLACE FUNCTION public.is_approved(p_user_id UUID)
    RETURNS BOOLEAN
    LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
    AS $func$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = p_user_id AND p.approval_status = 'approved'
      );
    END;
    $func$;
    
    -- Recreate can_write_assets
    CREATE OR REPLACE FUNCTION public.can_write_assets(p_user_id UUID)
    RETURNS BOOLEAN
    LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
    AS $func$
    BEGIN
      RETURN public.is_approved(p_user_id) AND (
        public.has_role(p_user_id, 'admin') OR public.has_role(p_user_id, 'it')
      );
    END;
    $func$;
    
    RAISE NOTICE 'Functions recreated. Run verification again.';
  END IF;
END $$;

-- STEP 5: Final verification
SELECT 
  '=== FINAL STATUS ===' as step,
  public.has_role('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid, 'admin') as has_admin_final,
  public.is_approved('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid) as is_approved_final,
  public.can_write_assets('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid) as can_write_final;
