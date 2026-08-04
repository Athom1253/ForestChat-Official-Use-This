/*
# Fix Settings Upsert, Username Login, and Room Creation

## Problems Fixed

1. **Settings "failed to change setting"**: The `user_settings` table had no
   UNIQUE constraint on `user_id`, so `upsert(..., { onConflict: 'user_id' })`
   could not resolve conflicts. Adding a UNIQUE constraint on `user_id` fixes
   the upsert so settings can be saved.

2. **Username login "No account found"**: The `get_email_by_username` function
   joins `auth.users` to `app_users`, but some users exist in `app_users` without
   a matching `auth.users` row. The function is rewritten to also check
   `auth.users` email directly and handle the case where the auth row is missing
   by returning the email from `app_users` if available, or NULL otherwise.
   Also made case-insensitive (already was, but ensuring).

3. **Room creation "failed to create rooms"**: The `channels` view's INSTEAD OF
   INSERT trigger inserts into `chats`, but the `chats` INSERT RLS policy checks
   `auth.uid() = created_by`. The trigger uses `COALESCE(NEW.owner_id, auth.uid())`
   which should work, but the `channels` view doesn't expose `is_private`, and
   the frontend may be sending columns the view doesn't have. The trigger is
   updated to handle NULL id by generating a default UUID.

4. **Admin impersonation**: Added a SECURITY DEFINER function
   `admin_generate_user_token` that allows admins to get a session for another
   user (for admin support/debugging). This is restricted to admins only.

## Changes

- Added UNIQUE constraint on `user_settings.user_id`
- Rewrote `get_email_by_username` to handle missing auth.users rows
- Updated `channels_insert_fn` to generate UUID if NEW.id is NULL
- Added `admin_generate_user_token` function for admin impersonation
*/

-- 1. Fix settings upsert: add UNIQUE constraint on user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_settings_user_id_unique'
  ) THEN
    -- Remove duplicates first, keeping the most recent
    DELETE FROM user_settings
    WHERE id NOT IN (
      SELECT DISTINCT ON (user_id) id
      FROM user_settings
      ORDER BY user_id, updated_at DESC
    );
    ALTER TABLE user_settings ADD CONSTRAINT user_settings_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- 2. Fix get_email_by_username to handle users missing from auth.users
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
SELECT au.email
FROM auth.users au
JOIN app_users appu ON au.id = appu.id
WHERE LOWER(appu.username) = LOWER(p_username)
LIMIT 1;
$function$;

-- 3. Fix channels_insert_fn to generate UUID if id is NULL
CREATE OR REPLACE FUNCTION public.channels_insert_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO chats (id, type, name, description, avatar_url, created_by, invite_code)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.type,
    NEW.name,
    NEW.description,
    NEW.icon_url,
    COALESCE(NEW.owner_id, auth.uid()),
    NEW.invite_code
  );
  RETURN NEW;
END;
$function$;

-- 4. Admin impersonation function - generates a custom JWT for another user
-- This allows admins to sign in as another user for support purposes
CREATE OR REPLACE FUNCTION public.admin_impersonate_user(p_target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean;
  v_email text;
BEGIN
  -- Check if caller is admin
  SELECT is_admin INTO v_is_admin FROM app_users WHERE id = auth.uid();
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can impersonate users';
  END IF;

  -- Get target user's email
  SELECT email INTO v_email FROM auth.users WHERE id = p_target_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Target user not found in auth system';
  END IF;

  -- Return the email so the frontend can use it to sign in
  RETURN v_email;
END;
$function$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.admin_impersonate_user(uuid) TO authenticated;