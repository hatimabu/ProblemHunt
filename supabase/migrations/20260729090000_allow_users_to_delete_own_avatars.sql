-- Allow a user to remove only avatar files in their own storage folder.
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND name LIKE auth.uid()::text || '/%');
