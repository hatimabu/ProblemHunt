-- Migration: Stabilize Auth/Profile RLS
-- Date: 2026-02-20
-- Description: Ensure consistent user_id mapping and required RLS policies.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_id uuid;

UPDATE public.profiles
SET user_id = id
WHERE user_id IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN user_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_user_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_id_unique ON public.profiles(user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    user_id,
    username,
    full_name,
    user_type,
    bio,
    reputation_score
  )
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text from 1 for 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'builder'),
    '',
    0
  )
  ON CONFLICT (id) DO UPDATE
  SET user_id = EXCLUDED.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow user to select their own row" ON public.profiles;
DROP POLICY IF EXISTS "Allow user to insert their own row" ON public.profiles;
DROP POLICY IF EXISTS "Allow user to update their own row" ON public.profiles;

CREATE POLICY "Allow user to select their own row"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Allow user to insert their own row"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow user to update their own row"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can insert own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can update own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Allow user to select their own row" ON public.wallets;
DROP POLICY IF EXISTS "Allow user to insert their own row" ON public.wallets;
DROP POLICY IF EXISTS "Allow user to update their own row" ON public.wallets;

CREATE POLICY "Allow user to select their own row"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Allow user to insert their own row"
  ON public.wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow user to update their own row"
  ON public.wallets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own pending orders" ON public.orders;
DROP POLICY IF EXISTS "Allow user to select their own row" ON public.orders;
DROP POLICY IF EXISTS "Allow user to insert their own row" ON public.orders;
DROP POLICY IF EXISTS "Allow user to update their own row" ON public.orders;

CREATE POLICY "Allow user to select their own row"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Allow user to insert their own row"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow user to update their own row"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
