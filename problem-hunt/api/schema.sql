-- ProblemHunt PostgreSQL Schema (replaces Cosmos DB + Supabase)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  user_type TEXT NOT NULL DEFAULT 'builder' CHECK (user_type IN ('builder', 'problem_poster')),
  bio TEXT DEFAULT '',
  avatar_url TEXT,
  wallet_address TEXT,
  reputation_score INTEGER DEFAULT 0,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS problems (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'problem' CHECK (type IN ('problem', 'job')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements JSONB DEFAULT '[]'::jsonb,
  category TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  proposals INTEGER DEFAULT 0,
  author TEXT DEFAULT 'Anonymous User',
  author_id TEXT NOT NULL,
  deadline TEXT,
  budget TEXT,
  budget_value NUMERIC,
  budget_sol NUMERIC,
  job_type TEXT,
  skills_required JSONB DEFAULT '[]'::jsonb,
  job_status TEXT,
  accepted_proposal_id TEXT,
  accepted_builder_id TEXT,
  accepted_builder_name TEXT,
  accepted_builder_wallet_address TEXT,
  completed_at TEXT,
  paid_at TEXT,
  payment_tx_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_problems_author_id ON problems(author_id);
CREATE INDEX IF NOT EXISTS idx_problems_type ON problems(type);
CREATE INDEX IF NOT EXISTS idx_problems_category ON problems(category);
CREATE INDEX IF NOT EXISTS idx_problems_created_at ON problems(created_at DESC);

CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  problem_id TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  brief_solution TEXT,
  project_url TEXT,
  builder_id TEXT NOT NULL,
  builder_name TEXT NOT NULL,
  timeline TEXT,
  cost TEXT,
  expertise JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  proposed_price_sol NUMERIC,
  estimated_delivery TEXT,
  payment_tx_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_proposals_problem_id ON proposals(problem_id);
CREATE INDEX IF NOT EXISTS idx_proposals_builder_id ON proposals(builder_id);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at DESC);

CREATE TABLE IF NOT EXISTS upvotes (
  id TEXT PRIMARY KEY,
  problem_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_upvotes_problem_id ON upvotes(problem_id);

CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  chain TEXT NOT NULL CHECK (chain IN ('ethereum', 'solana', 'polygon', 'arbitrum')),
  address TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  amount_sol NUMERIC NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  from_wallet_address TEXT,
  to_wallet_address TEXT,
  created_at TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_payments_job_id ON payments(job_id);

CREATE TABLE IF NOT EXISTS tips (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  problem_id TEXT,
  builder_id TEXT,
  tipper_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  message TEXT,
  currency TEXT NOT NULL DEFAULT 'SOL',
  chain TEXT NOT NULL,
  tx_hash TEXT,
  to_wallet TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tips_proposal_id ON tips(proposal_id);
CREATE INDEX IF NOT EXISTS idx_tips_builder_id ON tips(builder_id);

CREATE TABLE IF NOT EXISTS tip_transactions (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  problem_id TEXT,
  builder_id TEXT,
  tipper_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SOL',
  chain TEXT NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  to_wallet_address TEXT,
  message TEXT,
  created_at TEXT NOT NULL DEFAULT ''
);
