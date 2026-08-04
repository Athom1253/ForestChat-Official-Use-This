/*
# Create backgrounds storage bucket for user-uploaded background images
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('backgrounds', 'backgrounds', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "backgrounds_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'backgrounds' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "backgrounds_read_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'backgrounds');

CREATE POLICY "backgrounds_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'backgrounds' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'backgrounds' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "backgrounds_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'backgrounds' AND (storage.foldername(name))[1] = auth.uid()::text);
