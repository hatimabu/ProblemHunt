-- Migration: Add primary Solana wallet mirror to profiles
-- Date: 2026-03-24
-- Description: Stores the user's primary payout wallet directly on the profile row.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wallet_address text;

COMMENT ON COLUMN public.profiles.wallet_address IS
  'Primary Solana wallet used for direct peer-to-peer payouts in the marketplace';
