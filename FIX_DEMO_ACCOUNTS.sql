-- ============================================================================
-- FIX / CREATE DEMO LOGIN ACCOUNTS  —  run this ONE block in Supabase SQL Editor
-- ============================================================================
-- Works whether or not you already created the users (Dashboard or SQL).
-- It will, for each demo account:
--   1. create the auth.users row if missing (with a known password)
--   2. force the password to the documented one (so it ALWAYS works)
--   3. fix the GoTrue "NULL token" bug that breaks SQL-made users
--   4. confirm the email (so password login is allowed)
--   5. create the auth.identities row if missing
--   6. mark the profile APPROVED (your on_auth_user_created trigger
--      creates new profiles as 'pending', which the app blocks)
--   7. assign the role
-- Idempotent + schema-defensive. Safe to re-run.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  acct        RECORD;
  v_uid       UUID;
  v_col       TEXT;
  -- GoTrue scans these into Go strings; NULL => login crashes. Force ''.
  token_cols  TEXT[] := ARRAY[
    'confirmation_token','recovery_token','email_change',
    'email_change_token_new','email_change_token_current',
    'phone_change','phone_change_token','reauthentication_token'
  ];
BEGIN
  FOR acct IN SELECT * FROM (VALUES
      ('demo.admin@tsi.demo','Demo@Admin1','Demo Admin','demoadmin','admin'),
      ('demo.it@tsi.demo',   'Demo@IT1234','Demo IT Staff','demoit','it'),
      ('demo.hr@tsi.demo',   'Demo@HR1234','Demo HR Manager','demohr','hr'),
      ('demo.view@tsi.demo', 'Demo@View123','Demo Viewer','demoview','viewer')
  ) AS v(email, pw, full_name, username, role)
  LOOP
    -- 1. find or create the auth user
    SELECT id INTO v_uid FROM auth.users WHERE email = acct.email;

    IF v_uid IS NULL THEN
      v_uid := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_uid,
        'authenticated', 'authenticated', acct.email,
        crypt(acct.pw, gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('full_name', acct.full_name, 'username', acct.username)
      );
    ELSE
      -- 2. force the documented password + (re)confirm email
      UPDATE auth.users
         SET encrypted_password = crypt(acct.pw, gen_salt('bf')),
             email_confirmed_at = COALESCE(email_confirmed_at, now()),
             updated_at = now()
       WHERE id = v_uid;
    END IF;

    -- 3. fix NULL token columns (only those that exist in this GoTrue version)
    FOREACH v_col IN ARRAY token_cols LOOP
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='auth' AND table_name='users' AND column_name=v_col) THEN
        EXECUTE format(
          'UPDATE auth.users SET %I = '''' WHERE id = $1 AND %I IS NULL', v_col, v_col
        ) USING v_uid;
      END IF;
    END LOOP;

    -- 4. ensure email is confirmed (password login requires it)
    UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, now())
     WHERE id = v_uid;

    -- 5. identity row (needed by GoTrue for email/password)
    IF NOT EXISTS (
      SELECT 1 FROM auth.identities WHERE user_id = v_uid AND provider = 'email'
    ) THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='auth' AND table_name='identities' AND column_name='provider_id') THEN
        INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id,
                                     last_sign_in_at, created_at, updated_at)
        VALUES (gen_random_uuid(), v_uid,
                jsonb_build_object('sub', v_uid::text, 'email', acct.email),
                'email', v_uid::text, now(), now(), now());
      ELSE
        INSERT INTO auth.identities (id, user_id, identity_data, provider,
                                     last_sign_in_at, created_at, updated_at)
        VALUES (gen_random_uuid(), v_uid,
                jsonb_build_object('sub', v_uid::text, 'email', acct.email),
                'email', now(), now(), now());
      END IF;
    END IF;

    -- 6. profile → APPROVED (trigger may have made it 'pending')
    INSERT INTO public.profiles (id, full_name, email, username, approval_status, approved_at)
    VALUES (v_uid, acct.full_name, acct.email, acct.username, 'approved', now())
    ON CONFLICT (id) DO UPDATE SET
      approval_status = 'approved',
      approved_at     = now(),
      full_name       = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
      email           = COALESCE(public.profiles.email, EXCLUDED.email),
      username        = COALESCE(public.profiles.username, EXCLUDED.username);

    -- 7. role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, acct.role::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE 'demo account ready: %  (role %)', acct.email, acct.role;
  END LOOP;
END $$;

-- ============================================================================
-- VERIFY — all 4 should show approved + a role + confirmed email
-- ============================================================================
SELECT u.email,
       (u.email_confirmed_at IS NOT NULL)            AS email_confirmed,
       (u.encrypted_password IS NOT NULL)            AS has_password,
       p.approval_status,
       r.role
  FROM auth.users u
  LEFT JOIN public.profiles  p ON p.id = u.id
  LEFT JOIN public.user_roles r ON r.user_id = u.id
 WHERE u.email LIKE 'demo.%@tsi.demo'
 ORDER BY u.email;

-- ============================================================================
-- LOGIN CREDENTIALS (use the EMAIL, not the username, on the login screen)
--   demo.admin@tsi.demo  /  Demo@Admin1   (admin — full access)
--   demo.it@tsi.demo     /  Demo@IT1234   (it)
--   demo.hr@tsi.demo     /  Demo@HR1234   (hr)
--   demo.view@tsi.demo   /  Demo@View123  (viewer — read only)
--
-- If login still fails AFTER this runs and VERIFY looks correct:
--   • Supabase Dashboard → Authentication → Providers → Email:
--       make sure "Confirm email" is OFF for the demo, OR the rows above
--       show email_confirmed = true (this script sets it).
--   • Authentication → URL config won't matter for password login.
--   • Hard-refresh the app (Ctrl+F5) — stale session can mask success.
-- ============================================================================
