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
