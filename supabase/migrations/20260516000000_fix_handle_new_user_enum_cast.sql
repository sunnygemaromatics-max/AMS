-- ----------------------------------------------------------------------------
-- Fix handle_new_user(): explicit casts for approval_status / app_role enums.
--
-- The previous version inserted a CASE of text literals into
-- profiles.approval_status (enum approval_status). Postgres does not
-- implicitly cast text -> enum, so the trigger threw 42804 on every new
-- auth.users insert -- silently breaking user signup.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $fn$
DECLARE
  v_username TEXT;
  v_is_first BOOLEAN;
BEGIN
  v_username := LOWER(TRIM(COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'username', ''),
    REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9_]', '_', 'g')
  )));

  SELECT (COUNT(*) = 0) INTO v_is_first FROM public.profiles;

  INSERT INTO public.profiles (id, full_name, avatar_url, email, username, approval_status)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), SPLIT_PART(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    v_username,
    (CASE WHEN v_is_first THEN 'approved' ELSE 'pending' END)::public.approval_status
  )
  ON CONFLICT (id) DO UPDATE SET
    email    = EXCLUDED.email,
    username = COALESCE(public.profiles.username, EXCLUDED.username),
    full_name= COALESCE(public.profiles.full_name, EXCLUDED.full_name);

  IF v_is_first THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
