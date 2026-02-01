# Quick Reference: Deployment Commands

## Prerequisites

```powershell
# Install Supabase CLI globally
npm install -g supabase

# Verify installation
supabase --version
```

## Initial Setup

### 1. Login to Supabase

```powershell
supabase login
```

### 2. Link Your Project

```powershell
cd problem-hunt
supabase link --project-ref YOUR_PROJECT_REF
```

To find your project ref:
- Go to Supabase Dashboard
- Settings → General → Reference ID

### 3. Apply Database Migration

**Option A: Using Supabase SQL Editor**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20260201_web3_wallet_payments.sql`
3. Paste and run

**Option B: Using CLI**
```powershell
supabase db push
```

## Deploy Edge Functions

### Deploy Both Functions

```powershell
# From problem-hunt directory
supabase functions deploy auth-wallet
supabase functions deploy verify-payment
```

### Deploy Individual Function

```powershell
supabase functions deploy auth-wallet
# or
supabase functions deploy verify-payment
```

### View Function Logs

```powershell
# Real-time logs
supabase functions logs auth-wallet --follow
supabase functions logs verify-payment --follow

# Recent logs
supabase functions logs auth-wallet
```

## Set Environment Variables

### Via Dashboard (Recommended)

1. Go to Supabase Dashboard → Edge Functions
2. Click on function name
3. Go to "Settings" tab
4. Add environment variables

### Via CLI

```powershell
# Set for specific function
supabase secrets set ETH_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY --project-ref YOUR_PROJECT_REF

# Set multiple secrets
supabase secrets set SUPABASE_URL=https://your-project.supabase.co SUPABASE_SERVICE_ROLE_KEY=your-key
```

### List Current Secrets

```powershell
supabase secrets list
```

## Required Environment Variables

Create a `.env` file for reference (DO NOT commit):

```bash
# For Edge Functions (set in Supabase Dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # From Supabase Settings → API
JWT_SECRET=your-jwt-secret             # Same as JWT secret in Supabase settings

# RPC URLs for blockchain verification
ETH_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY
ARBITRUM_RPC_URL=https://arbitrum-mainnet.infura.io/v3/YOUR_INFURA_KEY
SOL_RPC_URL=https://api.mainnet-beta.solana.com

# For React App (.env.local)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...  # From Supabase Settings → API
```

## Get RPC URLs

### Infura (Ethereum, Polygon, Arbitrum)
1. Sign up at https://infura.io
2. Create new project
3. Copy endpoint URLs

### Alchemy (Alternative)
1. Sign up at https://alchemy.com
2. Create app for each network
3. Copy HTTPS endpoint

### Solana
- Free: `https://api.mainnet-beta.solana.com`
- Paid (better): Helius, QuickNode, Alchemy

## Test Edge Functions Locally

```powershell
# Start local Supabase
supabase start

# Serve Edge Functions locally
supabase functions serve auth-wallet --env-file .env.local
supabase functions serve verify-payment --env-file .env.local

# Test with curl
curl -X POST http://localhost:54321/functions/v1/auth-wallet \
  -H "Content-Type: application/json" \
  -d '{
    "chain": "ethereum",
    "address": "0x...",
    "signature": "0x...",
    "statement": "Test message"
  }'
```

## Update Platform Wallet Addresses

Edit `problem-hunt/src/app/components/CryptoPayment.tsx`:

```typescript
const PLATFORM_WALLETS = {
  ethereum: '0xYOUR_ETH_WALLET',      // Replace
  polygon: '0xYOUR_POLYGON_WALLET',   // Replace
  arbitrum: '0xYOUR_ARBITRUM_WALLET', // Replace
  solana: 'YOUR_SOLANA_WALLET',       // Replace
};
```

## Enable Row Level Security (RLS)

Already configured in migration! But to verify:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('wallets', 'orders');

-- Should return:
-- wallets   | t
-- orders    | t
```

## Common Issues

### Function deployment fails

```powershell
# Check you're in the right directory
cd problem-hunt

# Verify function structure
ls supabase/functions/auth-wallet/index.ts
ls supabase/functions/verify-payment/index.ts

# Re-link project
supabase link --project-ref YOUR_PROJECT_REF
```

### Environment variables not working

```powershell
# List current secrets
supabase secrets list

# Delete and re-add
supabase secrets unset ETH_RPC_URL
supabase secrets set ETH_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
```

### Database migration fails

```powershell
# Reset local database (CAUTION: destroys data)
supabase db reset

# Or apply manually in SQL Editor
```

## Verify Installation

### 1. Check Tables Exist

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('wallets', 'orders');
```

### 2. Test Edge Function

In Supabase Dashboard → Edge Functions → Select function → "Invoke"

### 3. Test in App

1. Start your app: `npm run dev`
2. Open browser console
3. Try wallet sign-in
4. Check for any errors

## Production Checklist

- [ ] Database migration applied
- [ ] Edge Functions deployed
- [ ] Environment variables set
- [ ] Platform wallet addresses updated
- [ ] RPC URLs configured (use paid RPCs)
- [ ] Test on testnet first
- [ ] RLS policies verified
- [ ] Rate limiting configured
- [ ] Error monitoring set up (Sentry, etc.)

## Useful Commands

```powershell
# Check Supabase status
supabase status

# View all projects
supabase projects list

# Generate TypeScript types from database
supabase gen types typescript --project-id YOUR_PROJECT_REF > types/supabase.ts

# Stop local Supabase
supabase stop
```

## Support

- Supabase Discord: https://discord.supabase.com
- Edge Functions Docs: https://supabase.com/docs/guides/functions
- GitHub Issues: Create an issue in your repo
