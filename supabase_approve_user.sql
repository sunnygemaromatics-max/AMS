-- ============================================================
-- APPROVE CURRENT USER — Run this to grant admin + approval
-- ============================================================

-- Step 1: Approve your profile
UPDATE public.profiles 
SET approval_status = 'approved', approved_at = now() 
WHERE id = auth.uid();

-- Step 2: Add admin role
INSERT INTO public.user_roles (user_id, role) 
VALUES (auth.uid(), 'admin') 
ON CONFLICT DO NOTHING;

-- Step 3: Verify it worked
SELECT 
  'Your account is now approved and has admin role' as status,
  public.has_role(auth.uid(), 'admin') as has_admin,
  public.is_approved(auth.uid()) as is_approved,
  public.can_write_assets(auth.uid()) as can_write;
