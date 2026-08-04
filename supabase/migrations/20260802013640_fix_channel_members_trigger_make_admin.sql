/*
# Fix channel_members insert trigger, make athom1253 admin

1. The channel_members_insert_fn trigger was passing NULL for 
   is_pinned, is_archived, is_muted when the frontend doesn't send them.
   The chat_memberships table has these as NOT NULL, so the insert fails
   silently. This is why users can't send messages after creating rooms
   — they're never added as chat members.

2. Make user athom1253 an admin.
*/

-- Fix the insert trigger to use COALESCE for nullable view fields
CREATE OR REPLACE FUNCTION channel_members_insert_fn()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO chat_memberships (chat_id, user_id, role, is_pinned, is_archived, is_muted)
  VALUES (
    NEW.channel_id, 
    NEW.user_id, 
    COALESCE(NEW.role, 'member'),
    COALESCE(NEW.is_pinned, false),
    COALESCE(NEW.is_archived, false),
    COALESCE(NEW.muted, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make athom1253 admin
UPDATE app_users SET is_admin = true WHERE username = 'athom1253';
