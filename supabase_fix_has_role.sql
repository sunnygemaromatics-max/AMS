-- ============================================================
-- FIX: has_role function ambiguous column reference
-- ERROR: column reference "user_id" is ambiguous
-- ============================================================

-- Drop all versions of has_role function (with different signatures)
DROP FUNCTION IF EXISTS public.has_role(uuid, text);
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

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

-- Also fix can_write_assets to use same pattern if needed
DROP FUNCTION IF EXISTS public.can_write_assets(uuid);

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

-- Fix is_approved too for consistency
DROP FUNCTION IF EXISTS public.is_approved(uuid);

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

-- Verify the fix
SELECT 
  'Functions recreated successfully' as status,
  public.has_role(auth.uid(), 'admin') as has_admin_test,
  public.is_approved(auth.uid()) as is_approved_test,
  public.can_write_assets(auth.uid()) as can_write_test;
