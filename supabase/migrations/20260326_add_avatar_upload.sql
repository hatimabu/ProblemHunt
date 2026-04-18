-- Migration: User Avatar Upload
-- Date: 2026-03-26
-- Description: Adds `profiles.avatar_url` and a public Supabase Storage bucket (`avatars`)
-- for user profile pictures.

-- ----------------------------------------------------------------------------
-- Profiles table: avatar_url
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.profiles.avatar_url IS
  'Public URL to the user''s uploaded profile picture (stored in Supabase Storage).';

-- ----------------------------------------------------------------------------
-- Storage bucket: avatars (public)
-- ----------------------------------------------------------------------------
-- Note: bucket_id == name in Supabase Storage by default.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Storage object policies
-- ----------------------------------------------------------------------------
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;
CREATE POLICY "Anyone can upload an avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

