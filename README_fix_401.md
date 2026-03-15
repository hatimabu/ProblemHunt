# Fixing Supabase 401 Errors (Project: ajvobbpwgopinxtbpcpu)

## Summary of Findings

- **JWKS found**: `./jwks.json` (1 key)
- **Primary strategy**: Use token introspection via `/auth/v1/user` (stable fallback when token verification fails)
- **Secondary strategy**: JWKS-based verification (ES256/RS256) using `jose` and the Supabase JWKS endpoint

## Environment Variables (must be set on server)

- `SUPABASE_URL` (default: <https://ajvobbpwgopinxtbpcpu.supabase.co>)
- `JWKS_URL` (default: <https://ajvobbpwgopinxtbpcpu.supabase.co/auth/v1/.well-known/jwks.json>)
- `ALLOWED_ISS` (default: <https://ajvobbpwgopinxtbpcpu.supabase.co/auth/v1>)
- `ALLOWED_AUD` (optional; comma-separated list of expected audiences)
- `SUPABASE_ANON_KEY` (required for introspection middleware)
- (Optional) `SERVICE_ROLE_KEY` — do NOT expose to clients; only for server-side tooling or migration.

## Files Added

- `middleware/introspectToken.js` (primary middleware)
- `middleware/verifyJwt.js` (JWKS verification middleware)
- `scripts/test-introspect.js` (connectivity/introspection check)
- `scripts/test-jwks-verify.js` (JWKS verification test)

## How to Use (Node/Express)

### 1) Introspection Middleware (recommended immediate fix)

```js
import express from 'express';
import { introspectToken } from './middleware/introspectToken.js';

const app = express();
app.use(introspectToken({ cacheTtlSeconds: 60 }));

app.get('/api/problems', (req, res) => {
  // req.user is populated if valid
  res.json({ ok: true, user: req.user });
});
```

### 2) JWKS Verification Middleware (long-term robust solution)

```js
import express from 'express';
import { verifyJwt } from './middleware/verifyJwt.js';

const app = express();
app.use(verifyJwt({
  jwksUrl: process.env.JWKS_URL,
  allowedIssuer: process.env.ALLOWED_ISS,
  allowedAud: process.env.ALLOWED_AUD?.split(','),
}));
```

## Run Tests

- Introspection connectivity (works without sample token):

  ```bash
  node scripts/test-introspect.js
  ```

- JWKS token verification (requires a token):

  ```bash
  node scripts/test-jwks-verify.js <token>
  ```

## Rotating to ES256 (Recommended)

1. Generate ES256 key pair via Supabase CLI or OpenSSL.
2. Add the new key to Supabase Auth (Dashboard > Settings > JWT > Add key).
3. Ensure new key appears in JWKS (`./jwks.json`).
4. Deploy with JWKS verification middleware.
5. Once stable, remove old key.

## Debug Commands for Future 401s

- Fetch JWKS: `curl -s https://ajvobbpwgopinxtbpcpu.supabase.co/auth/v1/.well-known/jwks.json | jq .`
- Introspection check: `node scripts/test-introspect.js`
- Verify token (if you have one): `node scripts/test-jwks-verify.js <token>`

## Notes

- Do NOT log full tokens or secrets. Only log token hashes or masked key fragments.
- If HS256 is in use and keeps failing, rotate to ES256 and use JWKS middleware.
