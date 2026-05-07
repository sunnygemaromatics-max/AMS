-- ============================================================
-- COMPLETE APPROVAL FIX — Run this entire script
-- ============================================================

-- 1. Find your user ID (should show: ed8feb2f-7c4a-4a76-b72f-729775b45271)
SELECT id, email FROM auth.users WHERE email LIKE '%sunny%';

-- 2. If profile doesn't exist, create it with correct UUID
INSERT INTO public.profiles (id, full_name, approval_status, approved_at, created_at)
VALUES (
  'ed8feb2f-7c4a-4a76-b72f-729775b45271', 
  'sunny.sobhani90@gmail.com', 
  'approved', 
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE 
SET approval_status = 'approved', approved_at = now();

-- 3. Add admin role
INSERT INTO public.user_roles (user_id, role) 
VALUES ('ed8feb2f-7c4a-4a76-b72f-729775b45271', 'admin') 
ON CONFLICT DO NOTHING;

-- 4. Verify everything
SELECT 
  'Your account is now approved' as status,
  (SELECT approval_status FROM public.profiles WHERE id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271') as profile_status,
  (SELECT role FROM public.user_roles WHERE user_id = 'ed8feb2f-7c4a-4a76-b72f-729775b45271' LIMIT 1) as your_role,
  public.has_role('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid, 'admin') as has_admin_role,
  public.is_approved('ed8feb2f-7c4a-4a76-b72f-729775b45271'::uuid) as is_approved_status;
