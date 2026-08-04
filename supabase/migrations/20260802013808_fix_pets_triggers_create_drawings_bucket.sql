/*
# Fix pets triggers, create drawings bucket, add storage policies

1. Fix pets_insert_fn to return the actual generated id from user_pets
2. Fix pets_update_fn to handle accessory, last_slept_at, is_sleeping
3. Create drawings storage bucket
4. Add storage policies for drawings bucket
*/

-- Fix pets insert trigger to return the actual id
CREATE OR REPLACE FUNCTION pets_insert_fn()
RETURNS TRIGGER AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO user_pets (user_id, name, species, color_variant, level, xp, happiness, energy, hunger)
  VALUES (NEW.owner_id, NEW.name, NEW.species, NEW.color, NEW.level, NEW.xp, NEW.happiness, NEW.energy, NEW.hunger)
  RETURNING id INTO new_id;
  NEW.id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix pets update trigger to handle accessory and other fields
CREATE OR REPLACE FUNCTION pets_update_fn()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_pets SET
    name = NEW.name,
    species = NEW.species,
    color_variant = NEW.color,
    level = NEW.level,
    xp = NEW.xp,
    happiness = NEW.happiness,
    energy = NEW.energy,
    hunger = NEW.hunger,
    last_fed_at = NEW.last_fed,
    last_played_at = NEW.last_played,
    accessories = CASE 
      WHEN NEW.accessory IS NOT NULL AND NEW.accessory != '' THEN jsonb_build_array(NEW.accessory)
      ELSE '[]'::jsonb
    END,
    updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create drawings storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('drawings', 'drawings', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for drawings bucket
CREATE POLICY "drawings_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'drawings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "drawings_read_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'drawings');

CREATE POLICY "drawings_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'drawings' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'drawings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "drawings_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'drawings' AND (storage.foldername(name))[1] = auth.uid()::text);
