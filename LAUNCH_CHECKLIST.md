# Pre-Launch Checklist

Use this checklist to ensure everything is properly configured before going live.

## 📋 Database Setup

- [ ] Run SQL migration in Supabase SQL Editor
  - [ ] Tables created (`wallets`, `orders`)
  - [ ] RLS policies enabled
  - [ ] Helper functions created
- [ ] Verify tables exist
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('wallets', 'orders');
  ```
- [ ] Test RLS policies
  - [ ] Users can only see their own wallets
  - [ ] Users can only see their own orders

## 🔐 Authentication Setup

- [ ] Edge Function `auth-wallet` deployed
  ```bash
  supabase functions deploy auth-wallet
  ```
- [ ] Environment variables set for `auth-wallet`:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `JWT_SECRET`
- [ ] Test wallet sign-in on testnet
- [ ] Verify user creation in Supabase Auth dashboard

## 💰 Payment Verification Setup

- [ ] Edge Function `verify-payment` deployed
  ```bash
  supabase functions deploy verify-payment
  ```
- [ ] Environment variables set for `verify-payment`:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `ETH_RPC_URL` (get from Infura/Alchemy)
  - [ ] `POLYGON_RPC_URL`
  - [ ] `ARBITRUM_RPC_URL`
  - [ ] `SOL_RPC_URL`
- [ ] RPC provider accounts created
  - [ ] Infura or Alchemy account
  - [ ] API keys generated
  - [ ] Sufficient credits/limits
- [ ] Platform wallet addresses updated in code
  - [ ] Edit `CryptoPayment.tsx`
  - [ ] Replace `PLATFORM_WALLETS` with your addresses
  - [ ] Verify you have access to these wallets

## 🎨 Frontend Integration

- [ ] Dependencies installed
  ```bash
  npm install ethers @solana/web3.js
  ```
- [ ] Components imported where needed
  - [ ] `SignInWithWallet` in auth page
  - [ ] `LinkEmail` in profile/dashboard
  - [ ] `CryptoPayment` in payments page
  - [ ] Updated `Profile` component
- [ ] Environment variables in `.env.local`
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] Routes configured
  - [ ] Web3 auth route
  - [ ] Payment route

## 🧪 Testing (Testnet)

- [ ] Test Ethereum wallet sign-in
  - [ ] Connect MetaMask
  - [ ] Sign message
  - [ ] User created in database
  - [ ] Wallet saved to `wallets` table
- [ ] Test Solana wallet sign-in
  - [ ] Connect Phantom
  - [ ] Sign message
  - [ ] User created
  - [ ] Wallet saved
- [ ] Test email linking
  - [ ] Link email after wallet auth
  - [ ] Verify email sent
  - [ ] Email confirmed
- [ ] Test payment creation
  - [ ] Create order
  - [ ] Order appears in database
  - [ ] Payment instructions displayed
- [ ] Test payment verification
  - [ ] Send test transaction on testnet
  - [ ] Submit transaction hash
  - [ ] Order status updates to "paid"
  - [ ] Correct amount verified

## 🔒 Security Checks

- [ ] Service role key never exposed to client
- [ ] JWT secret configured properly
- [ ] RLS policies tested and working
- [ ] Rate limiting considered (optional but recommended)
- [ ] CORS configured correctly
- [ ] Error messages don't leak sensitive info

## 🚀 Production Configuration

- [ ] Switch RPC URLs to mainnet
  - [ ] ETH mainnet RPC
  - [ ] Polygon mainnet RPC
  - [ ] Arbitrum mainnet RPC
  - [ ] Solana mainnet RPC
- [ ] Use paid RPC providers (not free tier)
  - [ ] Alchemy paid plan, or
  - [ ] Infura paid plan, or
  - [ ] Quicknode
- [ ] Platform wallet addresses verified
  - [ ] You control the private keys
  - [ ] Addresses are on mainnet
  - [ ] Test send to verify
- [ ] Environment variables updated
  - [ ] Production Supabase project
  - [ ] Production RPC URLs
  - [ ] Strong JWT secret

## 📊 Monitoring & Observability

- [ ] Edge Function logs accessible
  ```bash
  supabase functions logs auth-wallet
  supabase functions logs verify-payment
  ```
- [ ] Error tracking set up (optional)
  - [ ] Sentry, or
  - [ ] LogRocket, or
  - [ ] Custom solution
- [ ] Database activity monitor enabled
- [ ] Set up alerts for:
  - [ ] Failed verifications
  - [ ] Edge Function errors
  - [ ] RPC timeouts

## 📝 Documentation

- [ ] Read [WEB3_SETUP.md](WEB3_SETUP.md)
- [ ] Read [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- [ ] Read [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- [ ] Review [INTEGRATION_EXAMPLES.tsx](INTEGRATION_EXAMPLES.tsx)
- [ ] Team trained on:
  - [ ] Wallet sign-in flow
  - [ ] Payment verification process
  - [ ] Common troubleshooting

## 🎯 User Experience

- [ ] Loading states implemented
- [ ] Error messages user-friendly
- [ ] Success confirmations shown
- [ ] Wallet installation prompts
- [ ] Network switching guidance
- [ ] Transaction explorer links work

## 🐛 Common Issues Addressed

- [ ] "No wallet detected" - Installation link provided
- [ ] "Wrong network" - Clear instructions to switch
- [ ] "Transaction failed" - Retry mechanism or guidance
- [ ] "Verification timeout" - Clear status updates

## 📱 Cross-Browser Testing

- [ ] Chrome/Brave with MetaMask
- [ ] Firefox with MetaMask
- [ ] Safari with MetaMask extension (if available)
- [ ] Mobile browsers (MetaMask mobile app)

## 💡 Optional Enhancements

- [ ] Rate limiting on Edge Functions
- [ ] Webhook integration for payments
- [ ] Email notifications
- [ ] Payment expiration logic
- [ ] Refund system
- [ ] Multi-wallet support per user
- [ ] Analytics tracking

## 🎉 Launch Day

- [ ] Announcement prepared
- [ ] Support team ready
- [ ] Monitoring dashboards open
- [ ] Rollback plan documented
- [ ] First test transaction completed successfully

## 📞 Emergency Contacts

- RPC Provider Support: ________________
- Supabase Support: https://supabase.com/support
- Internal Dev Team: ________________
- Wallet Issues: ________________

## ✅ Final Sign-Off

- [ ] Tech Lead approval
- [ ] Security review complete
- [ ] QA testing passed
- [ ] Product owner approval
- [ ] Ready to launch! 🚀

---

**Date Completed:** ________________

**Completed By:** ________________

**Launch Date:** ________________

**Notes:**
