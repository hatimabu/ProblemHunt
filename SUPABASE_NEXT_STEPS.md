# Supabase Next Steps After Deployment

## 1. Run These SQL Migrations

### Tips tracking table (optional — Cosmos DB is primary)
```sql
-- Track tip references in Supabase for cross-referencing
CREATE TABLE IF NOT EXISTS public.tip_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id TEXT NOT NULL,
  tipper_id UUID REFERENCES auth.users(id),
  builder_id UUID,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  tx_hash TEXT,
  chain TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tip_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own tips"
  ON public.tip_records FOR SELECT
  USING (auth.uid() = tipper_id OR auth.uid() = builder_id);

CREATE POLICY "Authenticated users can insert tips"
  ON public.tip_records FOR INSERT
  WITH CHECK (auth.uid() = tipper_id);
```

### Orders table (for CryptoPayment component)
```sql
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  wallet_address TEXT,
  chain TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  token_address TEXT,
  token_symbol TEXT NOT NULL,
  receiving_address TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own orders"
  ON public.orders FOR ALL
  USING (auth.uid() = user_id);
```

### Profiles table additions
```sql
-- Ensure reputation_score column exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```

## 2. Enable Row Level Security

Verify RLS is enabled on all tables:
```sql
-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public';
```

Key RLS policies needed:
- `profiles`: Users can read all profiles, only update their own
- `wallets`: Users can only read/write their own wallets
- `orders`: Users can only access their own orders

## 3. Set Up Realtime

Enable realtime on the problems view (for live upvote counts):
```sql
-- In Supabase dashboard: Database > Replication
-- Enable realtime for: profiles table

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
```

In frontend (where needed):
```typescript
const channel = supabase
  .channel('problem-upvotes')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'profiles'
  }, (payload) => {
    // Update reputation display
  })
  .subscribe();
```

## 4. Configure Auth

In Supabase Dashboard > Authentication > URL Configuration:
- **Site URL**: `https://problemhunt.cc`
- **Redirect URLs**:
  - `https://problemhunt.cc/auth/callback`
  - `http://localhost:5173/auth/callback` (dev)

Email templates to customize:
- Confirm signup email
- Reset password email
- Magic link email

## 5. Edge Functions to Deploy

### `verify-payment` (used by CryptoPayment component)
```bash
supabase functions deploy verify-payment
```

This function should:
1. Receive `{ order_id, tx_hash }`
2. Look up the order in the `orders` table
3. Verify the tx hash on the appropriate blockchain RPC
4. Mark order as `paid` or `failed`
5. Return `{ success: boolean, message: string }`

### Environment variables needed in Supabase:
```bash
supabase secrets set ETHERSCAN_API_KEY=your_key
supabase secrets set SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
supabase secrets set POLYGONSCAN_API_KEY=your_key
```

## 6. Storage Buckets (Optional)

For user avatar uploads:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

CREATE POLICY "Avatar images are publicly accessible."
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

CREATE POLICY "Anyone can upload an avatar."
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'avatars' );
```
