-- Safe to run on every environment. The dashboard no longer depends on
-- wallet_address; wallets belong in public.wallets.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;
COMMENT ON COLUMN public.profiles.avatar_url IS
  'Public URL of the user avatar stored in the avatars bucket.';
