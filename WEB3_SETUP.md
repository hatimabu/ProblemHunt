# Web3 Wallet Authentication & Crypto Payment System

Complete implementation of Web3 wallet sign-in (Ethereum & Solana) with Supabase integration and server-side payment verification.

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
cd problem-hunt
npm install ethers @solana/web3.js
```

### 2. Run Database Migration

Apply the SQL migration to create tables:

```sql
-- Run this in your Supabase SQL Editor
-- File: supabase/migrations/20260201_web3_wallet_payments.sql
```

Or using Supabase CLI:

```powershell
supabase db push
```

### 3. Deploy Edge Functions

```powershell
# Install Supabase CLI if not already installed
npm install --save-dev supabase


# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy Edge Functions
supabase functions deploy auth-wallet
supabase functions deploy verify-payment
```

### 4. Set Environment Variables

#### In Supabase Dashboard (Settings → Edge Functions)

```bash
# Required for both Edge Functions
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret

# Required for verify-payment function
ETH_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
# Or use Alchemy: https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY
ARBITRUM_RPC_URL=https://arbitrum-mainnet.infura.io/v3/YOUR_INFURA_KEY
SOL_RPC_URL=https://api.mainnet-beta.solana.com
# Or use a paid RPC for better reliability
```

#### In Your React App (.env.local)

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Update Platform Wallet Addresses

Edit `CryptoPayment.tsx` and replace with your actual receiving wallets:

```typescript
const PLATFORM_WALLETS = {
  ethereum: '0xYourEthereumWallet',
  polygon: '0xYourPolygonWallet',
  arbitrum: '0xYourArbitrumWallet',
  solana: 'YourSolanaWallet',
};
```

## 📁 File Structure

```
problem-hunt/
├── src/app/components/
│   ├── SignInWithWallet.tsx       # Web3 wallet sign-in UI
│   ├── LinkEmail.tsx              # Email/social linking after wallet auth
│   ├── CryptoPayment.tsx          # Payment order creation & verification
│   └── Profile.tsx                # Updated to show linked wallets
├── supabase/
│   ├── migrations/
│   │   └── 20260201_web3_wallet_payments.sql  # Database schema
│   └── functions/
│       ├── auth-wallet/
│       │   └── index.ts           # Wallet authentication Edge Function
│       └── verify-payment/
│           └── index.ts           # Payment verification Edge Function
```

## 🔐 Security Considerations

### Rate Limiting
Add rate limiting to Edge Functions to prevent abuse:

```typescript
// In Supabase Edge Functions
import { RateLimiter } from "https://deno.land/x/rate_limiter/mod.ts";

const limiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // 5 requests per window
});
```

### CAPTCHA Integration
Consider adding CAPTCHA for wallet sign-in:

```bash
npm install @hcaptcha/react-hcaptcha
```

### Allowed Redirect URLs
Configure in Supabase Dashboard → Authentication → URL Configuration:
- Add your production domain
- Add localhost for development

### Service Role Key
- **Never** expose `SUPABASE_SERVICE_ROLE_KEY` to the client
- Only use in Edge Functions (server-side)
- Rotate regularly

## 🎨 Usage Examples

### Sign In with Wallet

```tsx
import { SignInWithWallet } from './components/SignInWithWallet';

function AuthPage() {
  return (
    <SignInWithWallet
      onSuccess={(userId, walletAddress, chain) => {
        console.log('Signed in:', userId, walletAddress, chain);
        // Redirect to dashboard
      }}
      redirectTo="/dashboard"
    />
  );
}
```

### Link Email After Wallet Auth

```tsx
import { LinkEmail } from './components/LinkEmail';

function Dashboard() {
  return (
    <div>
      <h2>Complete Your Profile</h2>
      <LinkEmail
        onSuccess={() => {
          console.log('Email linked successfully');
        }}
      />
    </div>
  );
}
```

### Create Payment Order

```tsx
import { CryptoPayment } from './components/CryptoPayment';

function PaymentPage() {
  return <CryptoPayment />;
}
```

## 🔧 API Reference

### Edge Function: `auth-wallet`

**Endpoint:** `POST /functions/v1/auth-wallet`

**Request Body:**
```json
{
  "chain": "ethereum" | "solana" | "polygon" | "arbitrum",
  "address": "0x..." | "wallet_address",
  "signature": "0x...",
  "statement": "Sign in message"
}
```

**Response:**
```json
{
  "access_token": "jwt_token",
  "refresh_token": "jwt_token",
  "user_id": "uuid",
  "wallet_address": "0x...",
  "chain": "ethereum"
}
```

### Edge Function: `verify-payment`

**Endpoint:** `POST /functions/v1/verify-payment`

**Request Body:**
```json
{
  "order_id": "uuid",
  "tx_hash": "0x..." | "signature"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "amount_received": 1.5
}
```

## 📊 Database Schema

### `wallets` Table
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `chain` (text: ethereum, solana, polygon, arbitrum)
- `address` (text, unique per chain)
- `is_primary` (boolean)
- `created_at` (timestamp)

### `orders` Table
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `wallet_address` (text)
- `chain` (text)
- `amount` (numeric)
- `token_address` (text, nullable)
- `token_symbol` (text)
- `receiving_address` (text)
- `status` (text: pending, paid, failed, expired)
- `tx_hash` (text, nullable)
- `verified_at` (timestamp, nullable)
- `created_at` (timestamp)
- `expires_at` (timestamp)

## 🧪 Testing

### Test Wallet Sign-In (Development)

1. **Install MetaMask** or **Phantom Wallet**
2. Switch to **test network** (Goerli, Mumbai, etc.)
3. Sign the message when prompted
4. Check Supabase dashboard for new user entry

### Test Payment Verification

1. Create a payment order
2. Send test tokens to the displayed address
3. Copy transaction hash
4. Paste in "Submit Transaction Hash" field
5. Click "Verify"
6. Order status should update to "paid"

### Use Test RPCs for Development

```bash
# Ethereum Goerli (testnet)
ETH_RPC_URL=https://goerli.infura.io/v3/YOUR_KEY

# Polygon Mumbai (testnet)
POLYGON_RPC_URL=https://polygon-mumbai.infura.io/v3/YOUR_KEY

# Solana Devnet
SOL_RPC_URL=https://api.devnet.solana.com
```

## 🐛 Troubleshooting

### "No wallet detected"
- Ensure MetaMask/Phantom is installed
- Reload the page after installation
- Check browser console for errors

### "Transaction verification failed"
- Verify RPC URL is correct
- Check transaction is confirmed on-chain
- Ensure correct network (mainnet vs testnet)
- Review Edge Function logs in Supabase

### "User creation failed"
- Check service role key is correct
- Verify database migrations ran successfully
- Review RLS policies in Supabase

### Edge Function Timeout
- Payment verification can take 30-60 seconds for large blocks
- Consider implementing webhook for async verification
- Use faster RPC providers (Alchemy, Quicknode)

## 📈 Next Steps

### Recommended Enhancements

1. **Webhook Integration**
   - Add webhook listeners for automatic payment detection
   - Use services like Alchemy Notify or Helius

2. **Multi-Wallet Support**
   - Allow users to link multiple wallets per chain
   - Wallet switching interface

3. **Token Allowance Checking**
   - Check user balance before creating order
   - Validate token approvals for ERC20/SPL

4. **Payment Expiration**
   - Automated cleanup of expired orders
   - Email notifications for pending payments

5. **Refund System**
   - Admin interface for processing refunds
   - Automated refund detection

## 📝 Notes

- **Mainnet vs Testnet:** Always test on testnets first
- **Gas Fees:** Users pay gas fees for transactions
- **Transaction Finality:** Wait for sufficient confirmations (12+ blocks for Ethereum)
- **RPC Costs:** Free RPCs have rate limits; consider paid plans for production

## 🔗 Useful Links

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Solana Web3.js Docs](https://solana-labs.github.io/solana-web3.js/)
- [EIP-191 Message Signing](https://eips.ethereum.org/EIPS/eip-191)

## 📄 License

MIT License - feel free to use in your projects!
