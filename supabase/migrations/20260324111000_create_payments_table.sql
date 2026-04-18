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
