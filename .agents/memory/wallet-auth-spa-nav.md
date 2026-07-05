---
name: Wallet auth SPA navigation
description: How wallet-based sign-in must integrate with AuthContext and routing to avoid losing SPA state
---

Wallet sign-in flows (Solana/Ethereum) must call a dedicated `loginWithToken(token, user)` method on the auth context instead of writing directly to localStorage, and must navigate with react-router's `navigate()` instead of `window.location.href`.

**Why:** Writing tokens straight to localStorage bypasses React auth state, so the UI doesn't reflect the logged-in user until a hard refresh. `window.location.href` also causes a full page reload, discarding SPA state/context — which conflicts with the product requirement that navigation never lose page context.

**How to apply:** Any new auth method (wallet, OAuth, magic link, etc.) added to this app should thread through the same `loginWithToken`-style context method and use client-side `navigate()`, never manual storage writes or hard redirects.
