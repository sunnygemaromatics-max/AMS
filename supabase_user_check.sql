-- ============================================================
-- USER PERMISSIONS CHECK — Run this to diagnose your account
-- ============================================================
-- This shows exactly what permissions your current account has

SELECT 
  '=== YOUR ACCOUNT STATUS ===' as section;

SELECT 
  auth.uid() as your_user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as your_email,
  (SELECT full_name FROM public.profiles WHERE id = auth.uid()) as your_name,
  (SELECT approval_status FROM public.profiles WHERE id = auth.uid()) as your_approval_status,
  (SELECT approved_at FROM public.profiles WHERE id = auth.uid()) as you_were_approved_at,
  public.is_approved(auth.uid()) as is_approved_boolean;

SELECT 
  '=== YOUR ROLES ===' as section;

SELECT 
  role
FROM public.user_roles 
WHERE user_id = auth.uid();

SELECT 
  public.has_role(auth.uid(), 'admin') as has_admin_role,
  public.has_role(auth.uid(), 'it') as has_it_role,
  public.has_role(auth.uid(), 'hr') as has_hr_role,
  public.has_role(auth.uid(), 'viewer') as has_viewer_role;

SELECT 
  '=== YOUR PERMISSIONS ===' as section;

SELECT 
  public.is_approved(auth.uid()) as can_view_data,
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'it')) as can_insert_update,
  public.can_write_assets(auth.uid()) as can_write_assets;

SELECT 
  '=== DATA VISIBILITY (what you can see) ===' as section;

SELECT 
  'companies' as table_name,
  (SELECT COUNT(*) FROM public.companies) as total_rows;

SELECT 
  'locations' as table_name,
  (SELECT COUNT(*) FROM public.locations) as total_rows;

SELECT 
  'departments' as table_name,
  (SELECT COUNT(*) FROM public.departments) as total_rows;

SELECT 
  'employees' as table_name,
  (SELECT COUNT(*) FROM public.employees) as total_rows;

SELECT 
  'assets' as table_name,
  (SELECT COUNT(*) FROM public.assets) as total_rows;

SELECT 
  '=== RLS POLICIES ON LOCATIONS ===' as section;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check
FROM pg_policies 
WHERE tablename = 'locations' AND schemaname = 'public';

SELECT 
  '=== FIX INSTRUCTIONS ===' as section;

-- If any of the above shows you're NOT approved or DON'T have admin/IT role,
-- run these commands to fix (as an admin or via Supabase dashboard):

-- To approve yourself:
-- UPDATE public.profiles SET approval_status = 'approved', approved_at = now() WHERE id = auth.uid();

-- To add admin role:
-- INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin') ON CONFLICT DO NOTHING;

-- To add IT role:
-- INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'it') ON CONFLICT DO NOTHING;

SELECT 
  'If approval_status is NOT "approved" → Run: UPDATE public.profiles SET approval_status = ''approved'', approved_at = now() WHERE id = ''YOUR_USER_ID'';' as fix_1,
  'If no admin/it role → Run: INSERT INTO public.user_roles (user_id, role) VALUES (''YOUR_USER_ID'', ''admin'');' as fix_2;
