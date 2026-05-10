-- ============================================================
-- FIND YOUR ACTUAL USER ID - Diagnostic Script
-- Run this to get your real user ID from Supabase
-- ============================================================

-- Method 1: Find by exact email
SELECT '=== METHOD 1: Exact Email Match ===' as method;
SELECT id, email, created_at, last_sign_in_at 
FROM auth.users 
WHERE email = 'sunny.sobhani90@gmail.com';

-- Method 2: Find by partial email match
SELECT '=== METHOD 2: Partial Email Match ===' as method;
SELECT id, email, created_at 
FROM auth.users 
WHERE email LIKE '%sunny%' 
   OR email LIKE '%sobhani%'
ORDER BY created_at DESC;

-- Method 3: List all users (last 10)
SELECT '=== METHOD 3: All Recent Users ===' as method;
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;

-- Method 4: Check if there are multiple accounts
SELECT '=== METHOD 4: Count of sunny accounts ===' as method;
SELECT count(*) as total_accounts 
FROM auth.users 
WHERE email LIKE '%sunny%';

-- ============================================================
-- ONCE YOU FIND YOUR REAL USER ID, REPLACE IT BELOW AND RUN
-- ============================================================

-- REPLACE THIS ID WITH YOUR ACTUAL ID FROM ABOVE:
-- 'ed8feb2f-7c4a-4a76-b72f-729775b45271'

-- Then run this to fix that specific user:
/*
DO $$
DECLARE
  v_real_user_id UUID := 'PASTE_YOUR_REAL_ID_HERE';
BEGIN
  -- Delete old profile
  DELETE FROM public.profiles WHERE id = v_real_user_id;
  
  -- Create approved profile
  INSERT INTO public.profiles (id, full_name, approval_status)
  VALUES (v_real_user_id, 'Admin User', 'approved');
  
  -- Delete old roles
  DELETE FROM public.user_roles WHERE user_id = v_real_user_id;
  
  -- Add admin role
  INSERT INTO public.user_roles (user_id, role) VALUES (v_real_user_id, 'admin');
  
  RAISE NOTICE 'Fixed user %', v_real_user_id;
END $$;
*/
