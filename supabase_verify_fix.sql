-- ============================================================
-- VERIFY APPROVAL STATUS — Check what's actually in the database
-- ============================================================

-- IMPORTANT: Replace with your actual user ID from auth.users
-- Or run: SELECT id, email FROM auth.users WHERE email = 'your@email.com';

-- 1. First, find your user ID by email
SELECT id, email FROM auth.users WHERE email LIKE '%sunny%' LIMIT 5;

-- 2. After getting your user_id from above, replace YOUR_USER_ID below and uncomment:
-- UPDATE public.profiles 
-- SET approval_status = 'approved', approved_at = now() 
-- WHERE id = 'YOUR_USER_ID';

-- 3. Add admin role (replace YOUR_USER_ID):
-- INSERT INTO public.user_roles (user_id, role) 
-- VALUES ('YOUR_USER_ID', 'admin') 
-- ON CONFLICT DO NOTHING;

-- 4. Check all profiles to find yours
SELECT 
  id, 
  full_name, 
  approval_status, 
  approved_at
FROM public.profiles 
LIMIT 10;

-- 5. Check all user roles
SELECT 
  user_id,
  role
FROM public.user_roles 
LIMIT 10;

-- 6. Show latest auth users
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;
