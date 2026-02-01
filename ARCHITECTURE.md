# Web3 Authentication & Payment Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER BROWSER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌───────────────┐      ┌──────────────┐      ┌──────────────┐         │
│  │  MetaMask     │      │  Phantom     │      │ Other Web3   │         │
│  │  Extension    │      │  Wallet      │      │ Wallets      │         │
│  └───────┬───────┘      └──────┬───────┘      └──────┬───────┘         │
│          │                     │                      │                  │
│          └─────────────────────┴──────────────────────┘                  │
│                                 │                                         │
│                                 ▼                                         │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │              React Application (Vite)                        │        │
│  ├─────────────────────────────────────────────────────────────┤        │
│  │                                                               │        │
│  │  ┌──────────────────┐  ┌──────────────────┐                │        │
│  │  │ SignInWithWallet │  │  CryptoPayment   │                │        │
│  │  │   Component      │  │   Component      │                │        │
│  │  └────────┬─────────┘  └────────┬─────────┘                │        │
│  │           │                      │                           │        │
│  │  ┌────────▼──────────┐  ┌───────▼──────────┐               │        │
│  │  │   LinkEmail       │  │    Profile       │               │        │
│  │  │   Component       │  │   Component      │               │        │
│  │  └───────────────────┘  └──────────────────┘               │        │
│  │                                                               │        │
│  └───────────────────────────┬───────────────────────────────┘        │
│                               │                                          │
└───────────────────────────────┼─────────────────────────────────────────┘
                                │
                                │ HTTPS Requests
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        SUPABASE BACKEND                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                   Edge Functions (Deno)                            │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │                                                                     │  │
│  │  ┌─────────────────┐              ┌──────────────────┐            │  │
│  │  │  auth-wallet    │              │ verify-payment   │            │  │
│  │  ├─────────────────┤              ├──────────────────┤            │  │
│  │  │ 1. Verify sig   │              │ 1. Fetch order   │            │  │
│  │  │ 2. Create user  │              │ 2. Get RPC URL   │            │  │
│  │  │ 3. Gen JWT      │              │ 3. Fetch tx      │            │  │
│  │  │ 4. Save wallet  │              │ 4. Verify amount │            │  │
│  │  └────────┬────────┘              │ 5. Update order  │            │  │
│  │           │                        └────────┬─────────┘            │  │
│  │           │                                 │                       │  │
│  └───────────┼─────────────────────────────────┼───────────────────────┘  │
│              │                                 │                           │
│              ▼                                 ▼                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                     PostgreSQL Database                             │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │                                                                      │  │
│  │  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐     │  │
│  │  │ auth.users   │      │   wallets    │      │   orders     │     │  │
│  │  ├──────────────┤      ├──────────────┤      ├──────────────┤     │  │
│  │  │ id           │◄─────┤ user_id      │◄─────┤ user_id      │     │  │
│  │  │ email        │      │ chain        │      │ amount       │     │  │
│  │  │ metadata     │      │ address      │      │ token        │     │  │
│  │  │ created_at   │      │ is_primary   │      │ status       │     │  │
│  │  └──────────────┘      └──────────────┘      │ tx_hash      │     │  │
│  │                                               └──────────────┘     │  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────┐    │  │
│  │  │            Row Level Security (RLS) Policies                │    │  │
│  │  │  • Users can only access their own records                  │    │  │
│  │  │  • Service role bypasses RLS for admin operations          │    │  │
│  │  └────────────────────────────────────────────────────────────┘    │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                │ RPC Calls
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        BLOCKCHAIN NETWORKS                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  Ethereum    │  │   Polygon    │  │  Arbitrum    │  │  Solana    │  │
│  │   Mainnet    │  │              │  │              │  │            │  │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├────────────┤  │
│  │ via Infura/  │  │ via Infura/  │  │ via Infura/  │  │ via Public │  │
│  │ Alchemy RPC  │  │ Alchemy RPC  │  │ Alchemy RPC  │  │ RPC/Helius │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘


AUTHENTICATION FLOW
═══════════════════

1. User clicks "Sign In with Ethereum/Solana"
   │
   ▼
2. Wallet extension opens (MetaMask/Phantom)
   │
   ▼
3. User signs message (proves ownership)
   │
   ▼
4. Frontend → POST /functions/v1/auth-wallet
   │         { chain, address, signature, statement }
   ▼
5. Edge Function verifies signature
   │
   ├─ Valid? → Check if wallet exists in DB
   │           │
   │           ├─ Exists? → Get user_id
   │           │
   │           └─ New? → Create user + profile + wallet entry
   │
   └─ Invalid? → Return error
   │
   ▼
6. Generate JWT tokens (access + refresh)
   │
   ▼
7. Return tokens to frontend
   │
   ▼
8. Frontend stores session
   │
   ▼
9. Redirect to dashboard


PAYMENT VERIFICATION FLOW
══════════════════════════

1. User creates payment order
   │
   ▼
2. Order saved to DB (status: "pending")
   │
   ▼
3. User receives payment instructions:
   │ - Receiving address
   │ - Amount
   │ - Token
   │
   ▼
4. User sends crypto from their wallet
   │
   ▼
5. Transaction confirmed on blockchain
   │
   ▼
6. User submits transaction hash
   │
   ▼
7. Frontend → POST /functions/v1/verify-payment
   │          { order_id, tx_hash }
   ▼
8. Edge Function:
   │
   ├─ Fetch order from DB
   │  └─ Get: chain, amount, token_address, receiving_address
   │
   ├─ Get appropriate RPC URL
   │  └─ ETH_RPC_URL, SOL_RPC_URL, etc.
   │
   ├─ Fetch transaction from blockchain
   │  └─ eth_getTransactionReceipt (Ethereum)
   │  └─ getTransaction (Solana)
   │
   ├─ Verify transaction:
   │  ├─ Status = success? ✓
   │  ├─ Recipient = order.receiving_address? ✓
   │  └─ Amount ≥ order.amount (with 1% tolerance)? ✓
   │
   └─ Update order in DB
      ├─ status = "paid"
      ├─ tx_hash = submitted hash
      ├─ verified_at = now()
      └─ Return success
   │
   ▼
9. Frontend shows success message
   │
   ▼
10. Order status updated in UI


SECURITY LAYERS
════════════════

┌─────────────────────────────────────────┐
│  1. Signature Verification              │
│     • Proves wallet ownership           │
│     • No password needed                │
└─────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  2. JWT Tokens                          │
│     • Secure session management         │
│     • Time-limited access               │
└─────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  3. Row Level Security (RLS)            │
│     • Users see only their data         │
│     • Database-level enforcement        │
└─────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  4. Service Role Isolation              │
│     • Never exposed to client           │
│     • Edge Functions only               │
└─────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  5. On-chain Verification               │
│     • Payment proven via blockchain     │
│     • Immutable transaction record      │
└─────────────────────────────────────────┘


DATA FLOW EXAMPLE
═════════════════

User: Alice
Wallet: 0xABC...123 (Ethereum)
Action: Sign in and make payment

Step 1: Sign In
───────────────
Browser → Wallet: "Please sign: Sign in to ProblemHunt..."
Wallet → Browser: signature = "0xDEF...456"
Browser → Supabase: POST /auth-wallet
                    { chain: "ethereum", address: "0xABC...123", 
                      signature: "0xDEF...456" }
Supabase → DB: INSERT INTO auth.users (email: "0xabc...123@wallet.local")
            INSERT INTO wallets (user_id, chain: "ethereum", 
                                address: "0xABC...123")
Supabase → Browser: { access_token: "jwt...", user_id: "uuid..." }

Step 2: Create Payment
──────────────────────
Browser → Supabase: INSERT INTO orders
                    (user_id, chain: "ethereum", amount: 0.1, 
                     token_symbol: "ETH", status: "pending")
Supabase → Browser: { order_id: "uuid...", 
                      receiving_address: "0xPLATFORM...789" }

Step 3: User Pays
─────────────────
Alice's Wallet → Ethereum Network: 
  Send 0.1 ETH to 0xPLATFORM...789
Ethereum Network: Transaction confirmed
  tx_hash: "0xTX...000"

Step 4: Verify Payment
──────────────────────
Browser → Supabase: POST /verify-payment 
                    { order_id: "uuid...", tx_hash: "0xTX...000" }
Supabase → Infura: eth_getTransactionReceipt("0xTX...000")
Infura → Supabase: { status: "0x1", to: "0xPLATFORM...789", 
                     value: "100000000000000000" } // 0.1 ETH in wei
Supabase → DB: UPDATE orders SET status = "paid", 
                                tx_hash = "0xTX...000"
Supabase → Browser: { success: true, amount_received: 0.1 }

✓ Payment Complete!
```

## Key Components

### Frontend (React + Vite)
- **SignInWithWallet.tsx**: Wallet detection and authentication
- **LinkEmail.tsx**: Email/social account linking
- **CryptoPayment.tsx**: Payment order creation and verification
- **Profile.tsx**: Display user profile and linked wallets

### Backend (Supabase)
- **Edge Functions** (Deno runtime):
  - `auth-wallet`: Handle wallet authentication
  - `verify-payment`: Verify blockchain transactions
- **PostgreSQL Database**:
  - `auth.users`: Supabase managed auth
  - `wallets`: User wallet addresses
  - `orders`: Payment orders

### External Services
- **Blockchain RPCs**: Infura, Alchemy, or public nodes
- **Wallet Providers**: MetaMask, Phantom, etc.

## Environment Variables Map

```
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (.env.local)                      │
├──────────────────────────────────────────────────────────────┤
│ VITE_SUPABASE_URL         → Public Supabase project URL      │
│ VITE_SUPABASE_ANON_KEY    → Public anon key (safe to expose) │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│               Edge Functions (Supabase Dashboard)             │
├──────────────────────────────────────────────────────────────┤
│ SUPABASE_URL              → Same as frontend                 │
│ SUPABASE_SERVICE_ROLE_KEY → Secret key (NEVER expose!)       │
│ JWT_SECRET                → For signing tokens               │
│ ETH_RPC_URL               → Ethereum node endpoint           │
│ POLYGON_RPC_URL           → Polygon node endpoint            │
│ ARBITRUM_RPC_URL          → Arbitrum node endpoint           │
│ SOL_RPC_URL               → Solana node endpoint             │
└──────────────────────────────────────────────────────────────┘
```
