/*
# Fix messages schema, wipe all data, create master invite

1. Messages table: add reply_to, attachment_url, attachment_name, 
   attachment_size, attachment_metadata, edited_at, deleted_at columns.
2. Data wipe: delete all rows from all tables for a clean slate.
3. Master invite: create active invite code "FOREST" with max_uses=1000.
*/

-- Add missing columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_size bigint;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_metadata jsonb;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Wipe all data (order matters for FK constraints)
DELETE FROM read_receipts;
DELETE FROM message_reactions;
DELETE FROM bookmarks;
DELETE FROM polls;
DELETE FROM poll_votes;
DELETE FROM typing_indicators;
DELETE FROM missed_calls;
DELETE FROM messages;
DELETE FROM chat_memberships;
DELETE FROM chat_invites;
DELETE FROM chats;
DELETE FROM friends;
DELETE FROM blocked_users;
DELETE FROM pet_items;
DELETE FROM pet_achievements;
DELETE FROM user_pets;
DELETE FROM user_settings;
DELETE FROM sign_in_activity;
DELETE FROM admin_reports;
DELETE FROM admin_audit_log;
DELETE FROM admin_announcements;
DELETE FROM admin_notes;
DELETE FROM admin_notifications;
DELETE FROM invite_redemptions;
DELETE FROM invite_codes;
DELETE FROM master_invites;
DELETE FROM app_users;
DELETE FROM auth.users;

-- Create a master invite code for sign-ups
INSERT INTO master_invites (code, label, is_active, max_uses, use_count)
SELECT 'FOREST', 'Default invite', true, 1000, 0
WHERE NOT EXISTS (SELECT 1 FROM master_invites WHERE code = 'FOREST');
