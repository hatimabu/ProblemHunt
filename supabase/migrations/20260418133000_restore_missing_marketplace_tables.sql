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
