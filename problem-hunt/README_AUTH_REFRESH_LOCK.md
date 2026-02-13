# Auth Refresh Lock Notes

## What changed

- Added a shared auth session module: `src/lib/auth-session.js`.
- Implemented single-flight refresh locking so only one token refresh request runs at a time.
- Other callers wait for the same in-flight refresh result instead of creating parallel refresh calls.
- Persisted new access/refresh tokens via `setSession` before continuing authenticated calls.
- Added terminal auth handling: on revoked/invalid refresh token, clear auth state and redirect to `/auth`.
- Added request-level trace logs for token and profile flows with timestamps and request IDs.
- Updated `src/lib/auth-helper.js` to use the shared auth module and retry once on 401/403 after refresh.
- Updated `src/app/contexts/AuthContext.tsx` login flow to persist session tokens before profile fetch.
- Updated profile fetch to retry once after token refresh if auth fails.

## How refresh lock works

1. `createRefreshCoordinator` keeps one in-flight refresh promise.
2. First caller starts refresh and stores the promise.
3. Concurrent callers reuse that same promise.
4. Refresh result is persisted (`setSession`) before token is returned.
5. Promise is cleared only after completion so future refreshes can run.

## Test script

Run:

```bash
node scripts/test-refresh-lock.mjs
```

The script validates:

- Concurrent refresh calls are collapsed into one refresh operation.
- Sign-in flow persistence order ensures token storage finishes before profile fetch starts.
