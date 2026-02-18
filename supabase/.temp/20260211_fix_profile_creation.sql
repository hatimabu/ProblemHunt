-- Migration: Fix Profile Creation
-- Date: 2026-02-11
-- Description: Add trigger to auto-create profiles and backfill existing users

-- ============================================================================
-- CREATE PROFILES TABLE (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE NOT NULL,
    full_name text,
    user_type text NOT NULL CHECK (user_type IN ('builder', 'problem_poster')),
    bio text DEFAULT '',
    reputation_score integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);

-- ============================================================================
-- AUTO-CREATE PROFILE TRIGGER
-- ============================================================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract metadata from auth.users raw_user_meta_data
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    user_type,
    bio,
    reputation_score
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text from 1 for 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'builder'),
    '',
    0
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate profile creation

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- BACKFILL EXISTING USERS WITHOUT PROFILES
-- ============================================================================

-- Insert profiles for any auth users that don't have one
INSERT INTO public.profiles (id, username, full_name, user_type, bio, reputation_score)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'username', 'user_' || substring(au.id::text from 1 for 8)) as username,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  COALESCE(au.raw_user_meta_data->>'user_type', 'builder') as user_type,
  '' as bio,
  0 as reputation_score
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (username) DO NOTHING; -- Skip if username already exists

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Policy: Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING ((SELECT auth.uid()) = id);

-- Policy: Users can insert their own profile (for manual creation)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================================================
-- UPDATED AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Check how many users have profiles
DO $$
DECLARE
  total_users integer;
  total_profiles integer;
BEGIN
  SELECT COUNT(*) INTO total_users FROM auth.users;
  SELECT COUNT(*) INTO total_profiles FROM public.profiles;
  
  RAISE NOTICE 'Migration complete!';
  RAISE NOTICE 'Total auth users: %', total_users;
  RAISE NOTICE 'Total profiles: %', total_profiles;
  
  IF total_users != total_profiles THEN
    RAISE WARNING 'Profile count mismatch! Some users may have duplicate usernames.';
  END IF;
END $$;
