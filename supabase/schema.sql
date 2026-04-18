-- ProblemHunt local schema baseline
-- Generated on 2026-04-18 from the ordered migration set in supabase/migrations.
-- Remote validation was performed against the live Supabase project via direct SQL.
-- A native remote schema dump was not available here because supabase db pull/db dump required Docker on this machine.


-- >>> 20260201_web3_wallet_payments.sql

-- Migration: Web3 Wallet Authentication and Payment Verification
-- Date: 2026-02-01
-- Description: Tables for wallet linking, payment orders, and transaction verification

-- ============================================================================
-- WALLETS TABLE: Store user wallet addresses
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.wallets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chain text NOT NULL CHECK (chain IN ('ethereum', 'solana', 'polygon', 'arbitrum')),
    address text NOT NULL,
    is_primary boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Ensure unique wallet address per chain
    CONSTRAINT unique_chain_address UNIQUE (chain, address),
    
    -- Ensure address format validation
    CONSTRAINT valid_eth_address CHECK (
        (chain IN ('ethereum', 'polygon', 'arbitrum') AND address ~ '^0x[a-fA-F0-9]{40}$')
        OR (chain = 'solana' AND length(address) BETWEEN 32 AND 44)
    )
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_address ON public.wallets(address);
-- Note: idx_wallets_chain_address not needed - unique_chain_address constraint already creates index

-- Ensure only one primary wallet per user per chain
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_one_primary_per_user_chain 
    ON public.wallets(user_id, chain) 
    WHERE is_primary = true;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_wallets_updated_at ON public.wallets;
CREATE TRIGGER update_wallets_updated_at
    BEFORE UPDATE ON public.wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ORDERS TABLE: Store payment orders and verification status
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_address text NOT NULL,
    chain text NOT NULL CHECK (chain IN ('ethereum', 'solana', 'polygon', 'arbitrum')),
    
    -- Payment details
    amount numeric(20, 8) NOT NULL CHECK (amount > 0),
    token_address text, -- NULL for native tokens (ETH, SOL), contract address for ERC20/SPL
    token_symbol text DEFAULT 'ETH', -- ETH, USDC, SOL, etc.
    
    -- Receiving details
    receiving_address text NOT NULL, -- Where payment should be sent
    memo text, -- Optional payment memo/reference
    
    -- Status tracking
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'refunded')),
    tx_hash text, -- Transaction hash after payment
    
    -- Verification metadata
    verified_at timestamptz,
    verification_attempts integer DEFAULT 0,
    last_verification_attempt timestamptz,
    
    -- Order metadata
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    expires_at timestamptz DEFAULT (now() + interval '24 hours'),
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_wallet_address ON public.orders(wallet_address);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Ensure unique transaction hash (partial unique index - only non-NULL values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_unique_tx_hash 
    ON public.orders(tx_hash) 
    WHERE tx_hash IS NOT NULL;

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Wallets Policies
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can insert own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can update own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can delete own wallets" ON public.wallets;

-- Users can view their own wallets
CREATE POLICY "Users can view own wallets"
    ON public.wallets FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own wallets
CREATE POLICY "Users can insert own wallets"
    ON public.wallets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own wallets (e.g., set primary)
CREATE POLICY "Users can update own wallets"
    ON public.wallets FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own wallets
CREATE POLICY "Users can delete own wallets"
    ON public.wallets FOR DELETE
    USING (auth.uid() = user_id);

-- Orders Policies
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own pending orders" ON public.orders;

-- Users can view their own orders
CREATE POLICY "Users can view own orders"
    ON public.orders FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own orders
CREATE POLICY "Users can insert own orders"
    ON public.orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending orders
CREATE POLICY "Users can update own pending orders"
    ON public.orders FOR UPDATE
    USING (auth.uid() = user_id AND status = 'pending')
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's primary wallet for a chain
CREATE OR REPLACE FUNCTION get_primary_wallet(p_user_id uuid, p_chain text)
RETURNS text AS $$
DECLARE
    wallet_address text;
BEGIN
    SELECT address INTO wallet_address
    FROM public.wallets
    WHERE user_id = p_user_id 
        AND chain = p_chain 
        AND is_primary = true
    LIMIT 1;
    
    -- If no primary wallet, return the first wallet for that chain
    IF wallet_address IS NULL THEN
        SELECT address INTO wallet_address
        FROM public.wallets
        WHERE user_id = p_user_id AND chain = p_chain
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;
    
    RETURN wallet_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark order as paid (called by Edge Function with service_role)
CREATE OR REPLACE FUNCTION mark_order_paid(
    p_order_id uuid,
    p_tx_hash text,
    p_verified_amount numeric
)
RETURNS boolean AS $$
DECLARE
    order_record public.orders%ROWTYPE;
    min_expected_amount numeric;
BEGIN
    -- Get the order
    SELECT * INTO order_record
    FROM public.orders
    WHERE id = p_order_id
        AND status = 'pending'
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found or already processed';
    END IF;
    
    -- Verify amount matches (with 1%% tolerance for gas/fees)
    min_expected_amount := order_record.amount * 0.99;
    IF p_verified_amount < min_expected_amount THEN
        RAISE EXCEPTION 'Verified amount % is less than required amount % (minimum %)', 
            p_verified_amount, order_record.amount, min_expected_amount;
    END IF;
    
    -- Update order
    UPDATE public.orders
    SET 
        status = 'paid',
        tx_hash = p_tx_hash,
        verified_at = now(),
        updated_at = now()
    WHERE id = p_order_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Security: Revoke public access to SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION get_primary_wallet(uuid, text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION mark_order_paid(uuid, text, numeric) FROM public, anon, authenticated;

-- Grant execute permissions
-- get_primary_wallet: Allow authenticated users to call
GRANT EXECUTE ON FUNCTION get_primary_wallet(uuid, text) TO authenticated;

-- mark_order_paid: Only callable via service_role key (Edge Functions)
-- Service role bypasses RLS and function permissions, but we grant to postgres for safety
GRANT EXECUTE ON FUNCTION mark_order_paid(uuid, text, numeric) TO postgres;

-- ============================================================================
-- INITIAL DATA / EXAMPLES
-- ============================================================================

-- Add a comment explaining the schema
COMMENT ON TABLE public.wallets IS 'Stores Web3 wallet addresses linked to user accounts';
COMMENT ON TABLE public.orders IS 'Stores cryptocurrency payment orders with verification status';
COMMENT ON COLUMN public.orders.receiving_address IS 'Platform wallet address where payment should be sent';
COMMENT ON COLUMN public.orders.token_address IS 'Smart contract address for ERC20/SPL tokens, NULL for native tokens';

-- >>> 20260211_fix_profile_creation.sql

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

-- >>> 20260220120000_stabilize_auth_rls.sql

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

-- >>> 20260324110000_add_wallet_address_to_profiles.sql

-- Migration: Add primary Solana wallet mirror to profiles
-- Date: 2026-03-24
-- Description: Stores the user's primary payout wallet directly on the profile row.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wallet_address text;

COMMENT ON COLUMN public.profiles.wallet_address IS
  'Primary Solana wallet used for direct peer-to-peer payouts in the marketplace';

-- >>> 20260324111000_create_payments_table.sql

-- Migration: Create payments table for peer-to-peer job payouts
-- Date: 2026-03-24
-- Description: Tracks completed on-chain job payments for Cosmos-backed marketplace jobs.

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_sol numeric(18, 6) NOT NULL CHECK (amount_sol > 0),
  tx_hash text NOT NULL,
  from_wallet_address text,
  to_wallet_address text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed')),
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_tx_hash_unique
  ON public.payments(tx_hash);

CREATE INDEX IF NOT EXISTS idx_payments_job_id
  ON public.payments(job_id);

CREATE INDEX IF NOT EXISTS idx_payments_from_user_id
  ON public.payments(from_user_id);

CREATE INDEX IF NOT EXISTS idx_payments_to_user_id
  ON public.payments(to_user_id);

COMMENT ON TABLE public.payments IS
  'Records completed peer-to-peer SOL job payments for marketplace jobs stored in Cosmos DB';

-- >>> 20260324112000_enable_payments_rls.sql

-- Migration: Enable RLS for payments
-- Date: 2026-03-24
-- Description: Restricts payment reads/inserts to the involved marketplace users.

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Payer can insert payment" ON public.payments;
DROP POLICY IF EXISTS "Involved users can view payment" ON public.payments;

CREATE POLICY "Payer can insert payment"
ON public.payments FOR INSERT
WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "Involved users can view payment"
ON public.payments FOR SELECT
USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- >>> 20260324113000_create_notifications_table.sql

-- Migration: Create notifications table
-- Date: 2026-03-24
-- Description: Stores in-app marketplace notifications for job lifecycle events.

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at
  ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;

CREATE POLICY "Users see own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- >>> 20260324114000_create_tip_transactions_table.sql

-- Migration: Create tip transaction receipts table
-- Date: 2026-03-24
-- Description: Persists on-chain tip hashes without changing the existing Cosmos tip flow.

CREATE TABLE IF NOT EXISTS public.tip_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL,
  problem_id uuid,
  builder_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tipper_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(20, 8) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'SOL',
  chain text NOT NULL,
  tx_hash text NOT NULL,
  to_wallet_address text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tip_transactions_tx_hash_unique
  ON public.tip_transactions(tx_hash);

CREATE INDEX IF NOT EXISTS idx_tip_transactions_proposal_id
  ON public.tip_transactions(proposal_id);

CREATE INDEX IF NOT EXISTS idx_tip_transactions_builder_id
  ON public.tip_transactions(builder_id);

CREATE INDEX IF NOT EXISTS idx_tip_transactions_tipper_id
  ON public.tip_transactions(tipper_id);

ALTER TABLE public.tip_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Involved users can view tip receipts" ON public.tip_transactions;

CREATE POLICY "Involved users can view tip receipts"
ON public.tip_transactions FOR SELECT
USING (builder_id = auth.uid() OR tipper_id = auth.uid());

COMMENT ON TABLE public.tip_transactions IS
  'Receipt table for on-chain tips while the live tip records remain in Cosmos DB';

-- >>> 20260326_add_avatar_upload.sql

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


-- >>> 20260418125832_new-migration.sql


-- >>> 20260418133000_restore_missing_marketplace_tables.sql

-- Migration: Restore marketplace tables missing from the remote schema
-- Date: 2026-04-18
-- Description: Recreates the app tables required by the current codebase if they are absent.

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at
  ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;

CREATE POLICY "Users see own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_sol numeric(18, 6) NOT NULL CHECK (amount_sol > 0),
  tx_hash text NOT NULL,
  from_wallet_address text,
  to_wallet_address text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed')),
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_tx_hash_unique
  ON public.payments(tx_hash);

CREATE INDEX IF NOT EXISTS idx_payments_job_id
  ON public.payments(job_id);

CREATE INDEX IF NOT EXISTS idx_payments_from_user_id
  ON public.payments(from_user_id);

CREATE INDEX IF NOT EXISTS idx_payments_to_user_id
  ON public.payments(to_user_id);

COMMENT ON TABLE public.payments IS
  'Records completed peer-to-peer SOL job payments for marketplace jobs stored in Cosmos DB';

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Payer can insert payment" ON public.payments;
DROP POLICY IF EXISTS "Involved users can view payment" ON public.payments;

CREATE POLICY "Payer can insert payment"
ON public.payments FOR INSERT
WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "Involved users can view payment"
ON public.payments FOR SELECT
USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.tip_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL,
  problem_id uuid,
  builder_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tipper_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(20, 8) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'SOL',
  chain text NOT NULL,
  tx_hash text NOT NULL,
  to_wallet_address text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tip_transactions_tx_hash_unique
  ON public.tip_transactions(tx_hash);

CREATE INDEX IF NOT EXISTS idx_tip_transactions_proposal_id
  ON public.tip_transactions(proposal_id);

CREATE INDEX IF NOT EXISTS idx_tip_transactions_builder_id
  ON public.tip_transactions(builder_id);

CREATE INDEX IF NOT EXISTS idx_tip_transactions_tipper_id
  ON public.tip_transactions(tipper_id);

ALTER TABLE public.tip_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Involved users can view tip receipts" ON public.tip_transactions;

CREATE POLICY "Involved users can view tip receipts"
ON public.tip_transactions FOR SELECT
USING (builder_id = auth.uid() OR tipper_id = auth.uid());

COMMENT ON TABLE public.tip_transactions IS
  'Receipt table for on-chain tips while the live tip records remain in Cosmos DB';

CREATE TABLE IF NOT EXISTS public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid,
  proposal_id uuid,
  from_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_sol numeric(18, 6) NOT NULL CHECK (amount_sol > 0),
  currency text NOT NULL DEFAULT 'SOL',
  chain text NOT NULL DEFAULT 'solana',
  from_wallet_address text,
  to_wallet_address text,
  tx_hash text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_intents_tx_hash_unique
  ON public.payment_intents(tx_hash)
  WHERE tx_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_intents_problem_id
  ON public.payment_intents(problem_id);

CREATE INDEX IF NOT EXISTS idx_payment_intents_proposal_id
  ON public.payment_intents(proposal_id);

CREATE INDEX IF NOT EXISTS idx_payment_intents_from_user_id
  ON public.payment_intents(from_user_id);

CREATE INDEX IF NOT EXISTS idx_payment_intents_to_user_id
  ON public.payment_intents(to_user_id);

CREATE INDEX IF NOT EXISTS idx_payment_intents_status
  ON public.payment_intents(status);

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Payer can insert payment intent" ON public.payment_intents;
DROP POLICY IF EXISTS "Involved users can view payment intent" ON public.payment_intents;
DROP POLICY IF EXISTS "Payer can update payment intent" ON public.payment_intents;

CREATE POLICY "Payer can insert payment intent"
ON public.payment_intents FOR INSERT
WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "Involved users can view payment intent"
ON public.payment_intents FOR SELECT
USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "Payer can update payment intent"
ON public.payment_intents FOR UPDATE
USING (from_user_id = auth.uid())
WITH CHECK (from_user_id = auth.uid());
