-- ============================================================
-- VERIFY APPROVAL STATUS — Check what's actually in the database
-- ============================================================

-- 1. Show your actual user ID
SELECT auth.uid() as your_current_user_id;

-- 2. Check your profile record
SELECT 
  id, 
  full_name, 
  approval_status, 
  approved_at,
  created_at
FROM public.profiles 
WHERE id = auth.uid();

-- 3. Check your roles
SELECT 
  user_id,
  role
FROM public.user_roles 
WHERE user_id = auth.uid();

-- 4. If profile doesn't exist, create it
INSERT INTO public.profiles (id, full_name, approval_status, approved_at)
SELECT 
  auth.uid(),
  COALESCE((SELECT email FROM auth.users WHERE id = auth.uid()), 'Unknown'),
  'approved',
  now()
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid());

-- 5. Add admin role if not exists
INSERT INTO public.user_roles (user_id, role) 
VALUES (auth.uid(), 'admin') 
ON CONFLICT DO NOTHING;

-- 6. Re-verify
SELECT 
  'After fix attempt:' as check_point,
  public.has_role(auth.uid(), 'admin') as has_admin,
  public.is_approved(auth.uid()) as is_approved,
  public.can_write_assets(auth.uid()) as can_write;
