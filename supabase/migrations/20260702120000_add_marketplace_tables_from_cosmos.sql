-- Migration: Add marketplace tables (Problems, Proposals, Upvotes, Tips) from Cosmos DB
-- Date: 2026-07-02
-- Description: Consolidates Cosmos DB containers into Supabase Postgres.
--              Replaces the non-atomic patch_item pattern with SQL functions.

-- ─── problems ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.problems (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type                            text NOT NULL DEFAULT 'problem',
  title                           text NOT NULL,
  description                     text NOT NULL,
  requirements                    text[] NOT NULL DEFAULT '{}',
  category                        text NOT NULL,
  upvotes                         int NOT NULL DEFAULT 0,
  proposals                       int NOT NULL DEFAULT 0,
  author                          text,
  author_id                       uuid REFERENCES auth.users(id),
  deadline                        timestamptz,
  budget                          text,
  budget_sol                      numeric,
  budget_value                    numeric,
  job_type                        text,
  skills_required                 text[] NOT NULL DEFAULT '{}',
  job_status                      text,
  accepted_proposal_id            uuid,
  -- extra fields written by accept_proposal / mark_job_complete / record_payment
  accepted_builder_id             uuid,
  accepted_builder_name           text,
  accepted_builder_wallet_address text,
  completed_at                    timestamptz,
  paid_at                         timestamptz,
  payment_tx_hash                 text,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_problems_author_id
  ON public.problems(author_id);
CREATE INDEX IF NOT EXISTS idx_problems_category
  ON public.problems(category);
CREATE INDEX IF NOT EXISTS idx_problems_type
  ON public.problems(type);
CREATE INDEX IF NOT EXISTS idx_problems_created_at
  ON public.problems(created_at DESC);

ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view problems"   ON public.problems;
DROP POLICY IF EXISTS "Authors can insert problems" ON public.problems;
DROP POLICY IF EXISTS "Authors can update problems" ON public.problems;
DROP POLICY IF EXISTS "Authors can delete problems" ON public.problems;

CREATE POLICY "Anyone can view problems"
ON public.problems FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Authors can insert problems"
ON public.problems FOR INSERT
TO authenticated
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can update problems"
ON public.problems FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can delete problems"
ON public.problems FOR DELETE
TO authenticated
USING (author_id = auth.uid());

-- ─── proposals ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.proposals (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id           uuid NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  title                text NOT NULL,
  description          text NOT NULL,
  project_url          text,
  builder_id           uuid REFERENCES auth.users(id),
  builder_name         text,
  brief_solution       text,
  timeline             text,
  cost                 text,
  expertise            text[] NOT NULL DEFAULT '{}',
  status               text NOT NULL DEFAULT 'pending',
  proposed_price_sol   numeric,
  estimated_delivery   text,
  payment_tx_hash      text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposals_problem_id
  ON public.proposals(problem_id);
CREATE INDEX IF NOT EXISTS idx_proposals_builder_id
  ON public.proposals(builder_id);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at
  ON public.proposals(created_at DESC);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view proposals"    ON public.proposals;
DROP POLICY IF EXISTS "Builders can insert proposals" ON public.proposals;
DROP POLICY IF EXISTS "Builders can update proposals" ON public.proposals;

CREATE POLICY "Anyone can view proposals"
ON public.proposals FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Builders can insert proposals"
ON public.proposals FOR INSERT
TO authenticated
WITH CHECK (builder_id = auth.uid());

CREATE POLICY "Builders can update proposals"
ON public.proposals FOR UPDATE
TO authenticated
USING (builder_id = auth.uid())
WITH CHECK (builder_id = auth.uid());

-- ─── upvotes ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.upvotes (
  id         text PRIMARY KEY,           -- "{problem_id}-{user_id}"
  problem_id uuid NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (problem_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_upvotes_problem_id ON public.upvotes(problem_id);
CREATE INDEX IF NOT EXISTS idx_upvotes_user_id    ON public.upvotes(user_id);

ALTER TABLE public.upvotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own upvotes"        ON public.upvotes;
DROP POLICY IF EXISTS "Users can insert upvotes"     ON public.upvotes;
DROP POLICY IF EXISTS "Users can delete own upvotes" ON public.upvotes;

CREATE POLICY "Users see own upvotes"
ON public.upvotes FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert upvotes"
ON public.upvotes FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own upvotes"
ON public.upvotes FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ─── tips ─────────────────────────────────────────────────────────────────────
-- proposal_id uses SET NULL so that tip history survives proposal cascade-deletes.

CREATE TABLE IF NOT EXISTS public.tips (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL,
  problem_id  uuid,
  builder_id  uuid,
  tipper_id   uuid REFERENCES auth.users(id),
  amount      numeric NOT NULL,
  message     text,
  currency    text,
  chain       text,
  tx_hash     text,
  to_wallet   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tips_proposal_id ON public.tips(proposal_id);
CREATE INDEX IF NOT EXISTS idx_tips_problem_id  ON public.tips(problem_id);
CREATE INDEX IF NOT EXISTS idx_tips_builder_id  ON public.tips(builder_id);
CREATE INDEX IF NOT EXISTS idx_tips_tipper_id   ON public.tips(tipper_id);

ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Involved users can view tips" ON public.tips;
DROP POLICY IF EXISTS "Tippers can insert tips"      ON public.tips;

CREATE POLICY "Involved users can view tips"
ON public.tips FOR SELECT
TO authenticated
USING (builder_id = auth.uid() OR tipper_id = auth.uid());

CREATE POLICY "Tippers can insert tips"
ON public.tips FOR INSERT
TO authenticated
WITH CHECK (tipper_id = auth.uid());

-- ─── atomic counter functions ─────────────────────────────────────────────────
-- SECURITY DEFINER so the service-role caller bypasses any RLS on the counter update.

CREATE OR REPLACE FUNCTION increment_problem_upvotes(pid uuid)
RETURNS problems AS $$
  UPDATE problems
  SET upvotes    = upvotes + 1,
      updated_at = now()
  WHERE id = pid
  RETURNING *;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_problem_upvotes(pid uuid)
RETURNS problems AS $$
  UPDATE problems
  SET upvotes    = GREATEST(0, upvotes - 1),
      updated_at = now()
  WHERE id = pid
  RETURNING *;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_problem_proposals(pid uuid)
RETURNS problems AS $$
  UPDATE problems
  SET proposals  = proposals + 1,
      updated_at = now()
  WHERE id = pid
  RETURNING *;
$$ LANGUAGE sql SECURITY DEFINER;
