/*
# Add notification granularity settings and pet collectibles system

## Notification Settings
Adds granular notification control columns to `user_settings`:
- notify_messages, notify_reactions, notify_mentions, notify_friend_requests, notify_call_invites, notify_system
- notify_sound_volume (integer 0-100)

## Pet Collectibles
New `pet_collectibles` table for collectible items (beds, collars, bowls, toys, furniture, decorations).
Owner-scoped RLS.
*/

-- Add notification granularity columns to user_settings
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS notify_messages boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_reactions boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_mentions boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_friend_requests boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_call_invites boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_system boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_sound_volume integer DEFAULT 50;

-- Create pet_collectibles table
CREATE TABLE IF NOT EXISTS pet_collectibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES user_pets(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  item_id text NOT NULL,
  item_name text NOT NULL,
  rarity text NOT NULL DEFAULT 'common',
  is_equipped boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  acquired_at timestamptz DEFAULT now()
);

ALTER TABLE pet_collectibles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_pet_collectibles" ON pet_collectibles;
CREATE POLICY "select_own_pet_collectibles" ON pet_collectibles FOR SELECT
  TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "insert_own_pet_collectibles" ON pet_collectibles;
CREATE POLICY "insert_own_pet_collectibles" ON pet_collectibles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_pet_collectibles" ON pet_collectibles;
CREATE POLICY "update_own_pet_collectibles" ON pet_collectibles FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_pet_collectibles" ON pet_collectibles;
CREATE POLICY "delete_own_pet_collectibles" ON pet_collectibles FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_pet_collectibles_pet_id ON pet_collectibles(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_collectibles_owner_id ON pet_collectibles(owner_id);
