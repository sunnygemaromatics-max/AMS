-- ============================================================
-- APPROVE YOUR ACCOUNT — Copy-paste and run this entire script
-- ============================================================

-- Step 1: Find your user ID
SELECT id, email FROM auth.users WHERE email = 'sunny.sobhani90@gmail.com';

-- Step 2: After seeing your user ID above, replace PASTE_USER_ID_HERE below and uncomment both lines:
-- UPDATE public.profiles SET approval_status = 'approved', approved_at = now() WHERE id = 'PASTE_USER_ID_HERE';
-- INSERT INTO public.user_roles (user_id, role) VALUES ('PASTE_USER_ID_HERE', 'admin') ON CONFLICT DO NOTHING;

-- Step 3: Verify it worked (uncomment after step 2):
-- SELECT public.has_role('PASTE_USER_ID_HERE', 'admin') as has_admin, public.is_approved('PASTE_USER_ID_HERE') as is_approved;
