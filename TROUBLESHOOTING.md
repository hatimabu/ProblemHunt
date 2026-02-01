# Troubleshooting Guide

Common issues and their solutions when working with Web3 wallet authentication and crypto payments.

## 🔴 Wallet Connection Issues

### "No wallet detected" or "window.ethereum is undefined"

**Problem**: Browser extension not detected

**Solutions**:
1. Install MetaMask: https://metamask.io/download/
2. Refresh the page after installation
3. Make sure extension is enabled
4. Try disabling other wallet extensions (conflicts)
5. Check browser console for errors

**Code to debug**:
```javascript
console.log('Ethereum:', window.ethereum);
console.log('Solana:', window.solana);
```

### Wallet opens but nothing happens after signing

**Problem**: Edge Function not responding

**Solutions**:
1. Check Edge Function is deployed:
   ```bash
   supabase functions list
   ```
2. View Edge Function logs:
   ```bash
   supabase functions logs auth-wallet
   ```
3. Verify environment variables are set
4. Check network tab in browser dev tools for 500 errors

### "User rejected the request"

**Problem**: User cancelled the signature

**Solutions**:
- This is expected behavior
- Show friendly message: "Please sign the message to continue"
- Add retry button

---

## 🔴 Authentication Issues

### User created but session not established

**Problem**: JWT token generation failed

**Solutions**:
1. Verify `JWT_SECRET` environment variable is set
2. Check it matches your Supabase project JWT secret
3. Find JWT secret: Supabase Dashboard → Settings → API → JWT Settings

**Debug**:
```javascript
// In browser console after sign-in
console.log(await supabase.auth.getSession());
```

### "Signature verification failed"

**Problem**: Invalid signature or message tampering

**Solutions**:
1. Ensure same message is used for signing and verification
2. Check wallet address matches
3. Verify ethers.js version compatibility
4. Try logging signature and message:
   ```javascript
   console.log('Message:', statement);
   console.log('Signature:', signature);
   console.log('Recovered:', ethers.verifyMessage(statement, signature));
   ```

### User exists but login fails

**Problem**: Email/wallet already linked to another account

**Solutions**:
1. Check `wallets` table for existing entries
2. Implement account merging logic if needed
3. Or prevent duplicate wallets:
   ```sql
   SELECT * FROM wallets WHERE address = 'WALLET_ADDRESS';
   ```

---

## 🔴 Database Issues

### "Table does not exist" error

**Problem**: Migration not run

**Solutions**:
1. Run migration in Supabase SQL Editor
2. Or use CLI:
   ```bash
   supabase db push
   ```
3. Verify tables exist:
   ```sql
   \dt
   ```

### "permission denied for table wallets"

**Problem**: RLS policies blocking access

**Solutions**:
1. Check RLS is enabled:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables 
   WHERE schemaname = 'public';
   ```
2. Verify user is authenticated:
   ```javascript
   const { data: { session } } = await supabase.auth.getSession();
   console.log('User ID:', session?.user?.id);
   ```
3. Check RLS policies allow access:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'wallets';
   ```

### "duplicate key value violates unique constraint"

**Problem**: Wallet already linked

**Solutions**:
1. Check if wallet already exists before inserting:
   ```javascript
   const { data: existing } = await supabase
     .from('wallets')
     .select('id')
     .eq('address', walletAddress)
     .single();
   
   if (existing) {
     console.log('Wallet already linked');
     return;
   }
   ```

---

## 🔴 Payment Verification Issues

### "Transaction not found"

**Problem**: Transaction not confirmed yet or wrong network

**Solutions**:
1. Wait for transaction confirmation (may take 30+ seconds)
2. Verify on block explorer:
   - Ethereum: https://etherscan.io/tx/TX_HASH
   - Solana: https://explorer.solana.com/tx/TX_HASH
3. Check you're on correct network (mainnet vs testnet)
4. Verify RPC URL is correct

**Debug RPC connection**:
```javascript
// In Edge Function
const response = await fetch(rpcUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_blockNumber',
    params: []
  })
});
console.log(await response.json());
```

### "Insufficient amount" error

**Problem**: Amount doesn't match or gas fees deducted

**Solutions**:
1. Our code has 1% tolerance, but check if gas was deducted from transfer amount
2. For tokens, ensure approval was given:
   ```javascript
   // Check allowance (Ethereum)
   const allowance = await tokenContract.allowance(userAddress, spenderAddress);
   ```
3. Verify amount in wei/lamports:
   ```javascript
   // 1 ETH = 1,000,000,000,000,000,000 wei
   // 1 SOL = 1,000,000,000 lamports
   ```

### "Payment sent to wrong address"

**Problem**: User sent to wrong address

**Solutions**:
1. Double-check platform wallet addresses in code
2. Verify copied correctly (no trailing spaces)
3. Show checksum addresses to users
4. Add copy button to prevent manual typing errors

### Edge Function timeout (504 Gateway Timeout)

**Problem**: RPC provider slow or down

**Solutions**:
1. Use faster RPC provider:
   - Alchemy (recommended)
   - Quicknode
   - Not free Infura tier
2. Increase timeout in Edge Function
3. Implement async verification with webhooks
4. Check RPC provider status page

**Test RPC speed**:
```bash
time curl -X POST https://mainnet.infura.io/v3/YOUR_KEY \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

---

## 🔴 Environment Variable Issues

### "Missing environment variable"

**Problem**: Env vars not set or not loaded

**Solutions**:
1. List current secrets:
   ```bash
   supabase secrets list
   ```
2. Set missing variables:
   ```bash
   supabase secrets set VAR_NAME=value
   ```
3. Redeploy Edge Function after setting secrets:
   ```bash
   supabase functions deploy function-name
   ```

### Environment variables work locally but not in production

**Problem**: Different env files

**Solutions**:
1. Local: `.env.local` file
2. Production: Set in Supabase Dashboard
3. Don't commit `.env.local` to git
4. Document required env vars in README

---

## 🔴 Network Issues

### "Wrong network" or chain mismatch

**Problem**: User on testnet but app expects mainnet

**Solutions**:
1. Detect user's network:
   ```javascript
   const chainId = await window.ethereum.request({ 
     method: 'eth_chainId' 
   });
   // 0x1 = Ethereum Mainnet
   // 0x89 = Polygon
   // 0xa4b1 = Arbitrum
   ```
2. Prompt user to switch:
   ```javascript
   await window.ethereum.request({
     method: 'wallet_switchEthereumChain',
     params: [{ chainId: '0x1' }],
   });
   ```
3. Show network indicator in UI

### RPC rate limit exceeded

**Problem**: Too many requests to RPC provider

**Solutions**:
1. Upgrade to paid plan
2. Implement request caching
3. Use multiple RPC providers with fallback
4. Add rate limiting to your Edge Functions

---

## 🔴 UI/UX Issues

### Loading spinner never stops

**Problem**: Promise never resolves/rejects

**Solutions**:
1. Add timeouts to all async calls:
   ```javascript
   const timeout = new Promise((_, reject) => 
     setTimeout(() => reject(new Error('Timeout')), 30000)
   );
   
   try {
     await Promise.race([yourAsyncCall(), timeout]);
   } catch (error) {
     console.error('Operation timed out or failed:', error);
   }
   ```
2. Always use try-catch with finally:
   ```javascript
   try {
     setLoading(true);
     await operation();
   } catch (error) {
     setError(error.message);
   } finally {
     setLoading(false); // Always runs
   }
   ```

### Error messages not user-friendly

**Problem**: Technical errors shown to users

**Solutions**:
```javascript
function getUserFriendlyError(error: any): string {
  const errorMap: Record<string, string> = {
    'User rejected': 'You cancelled the transaction',
    'insufficient funds': 'Insufficient balance in your wallet',
    'Transaction not found': 'Transaction is still pending. Please wait.',
    'Network Error': 'Unable to connect. Please check your internet.',
  };
  
  for (const [key, message] of Object.entries(errorMap)) {
    if (error.message?.includes(key)) {
      return message;
    }
  }
  
  return 'An unexpected error occurred. Please try again.';
}
```

---

## 🔴 Testing Issues

### Can't test on mainnet (too expensive)

**Problem**: Testing costs real money

**Solutions**:
1. Use testnets:
   - Ethereum: Goerli or Sepolia
   - Polygon: Mumbai
   - Solana: Devnet
2. Get free testnet tokens:
   - https://goerlifaucet.com
   - https://faucet.polygon.technology
   - https://solfaucet.com
3. Update RPC URLs to testnet:
   ```bash
   ETH_RPC_URL=https://goerli.infura.io/v3/YOUR_KEY
   ```

### Test transactions not showing up

**Problem**: Test data in different environment

**Solutions**:
1. Check correct database (local vs production)
2. Verify using same Supabase project
3. Check RLS policies allow viewing

---

## 🔴 Production Issues

### High costs for RPC calls

**Problem**: Using paid RPC at scale

**Solutions**:
1. Implement caching (Redis)
2. Use webhooks instead of polling
3. Batch requests when possible
4. Set request limits per user

### Orders stuck in "pending"

**Problem**: Users not submitting transaction hash

**Solutions**:
1. Add automated expiration:
   ```sql
   UPDATE orders 
   SET status = 'expired' 
   WHERE status = 'pending' 
   AND created_at < NOW() - INTERVAL '24 hours';
   ```
2. Send reminder emails
3. Implement webhook listeners (Alchemy Notify)

---

## 🛠️ Debugging Tools

### Check Supabase Logs
```bash
# Real-time logs
supabase functions logs auth-wallet --follow
supabase functions logs verify-payment --follow

# Recent logs
supabase functions logs auth-wallet
```

### Test Edge Function Locally
```bash
# Start local Supabase
supabase start

# Serve function
supabase functions serve auth-wallet

# Test with curl
curl -X POST http://localhost:54321/functions/v1/auth-wallet \
  -H "Content-Type: application/json" \
  -d '{"chain":"ethereum","address":"0x...","signature":"0x...","statement":"test"}'
```

### Check Database Directly
```sql
-- View recent wallets
SELECT * FROM wallets ORDER BY created_at DESC LIMIT 10;

-- View pending orders
SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at DESC;

-- Check for duplicate wallets
SELECT address, COUNT(*) 
FROM wallets 
GROUP BY address 
HAVING COUNT(*) > 1;
```

### Browser Console Debugging
```javascript
// Check wallet availability
console.log('Ethereum:', !!window.ethereum);
console.log('Solana:', !!window.solana);

// Check current session
const session = await supabase.auth.getSession();
console.log('Session:', session);

// Check Supabase connection
const { data, error } = await supabase.from('wallets').select('count');
console.log('DB Connection:', { data, error });
```

---

## 📞 Getting Help

1. **Check Edge Function logs first** - most issues show up there
2. **Search Supabase Discord** - many common issues already solved
3. **Check blockchain explorer** - verify transaction details
4. **Review environment variables** - most deployment issues are config
5. **Test in isolation** - narrow down the problem

### Useful Links
- Supabase Discord: https://discord.supabase.com
- Ethers.js Issues: https://github.com/ethers-io/ethers.js/issues
- Solana Discord: https://discord.com/invite/solana
- MetaMask Support: https://metamask.zendesk.com

---

## 📝 Error Code Reference

| Code | Meaning | Solution |
|------|---------|----------|
| 400 | Bad Request | Check request payload |
| 401 | Unauthorized | Check auth token |
| 403 | Forbidden | Check RLS policies |
| 404 | Not Found | Check order/user exists |
| 429 | Rate Limited | Reduce request frequency |
| 500 | Server Error | Check Edge Function logs |
| 504 | Gateway Timeout | RPC provider slow |

Remember: **Check the logs first!** Most issues are logged and have clear error messages.
