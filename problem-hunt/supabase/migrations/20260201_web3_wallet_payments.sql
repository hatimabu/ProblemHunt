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
