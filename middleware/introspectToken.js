/**
 * Middleware to validate Supabase JWTs by introspecting them via /auth/v1/user.
 *
 * This is intended for server-side usage (Node/Express). It avoids relying on
 * local secret configuration and works even if HS256/secret verification is unreliable.
 *
 * Usage (Express):
 *   const { introspectToken } = require('./middleware/introspectToken');
 *   app.use(introspectToken({ cacheTtlSeconds: 60 }));
 */

import crypto from 'crypto';

const DEFAULT_SUPABASE_URL = 'https://ajvobbpwgopinxtbpcpu.supabase.co';
const DEFAULT_AUTH_USER_URL = `${DEFAULT_SUPABASE_URL}/auth/v1/user`;

// In-memory cache keyed by token hash. Cached items expire after TTL.
const cache = new Map();

function maskTokenHash(tokenHash) {
  if (!tokenHash) return '<none>';
  return tokenHash.slice(0, 8);
}

function getApiKey() {
  const keys = [
    'SUPABASE_ANON_KEY',
    'PUBLISHABLE_API_KEY',
    'ANON_KEY',
    'SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_KEY',
  ];
  for (const k of keys) {
    if (process.env[k]) return { key: process.env[k], name: k };
  }
  return null;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function introspectToken(options = {}) {
  const {
    cacheTtlSeconds = 60,
    authUserUrl = DEFAULT_AUTH_USER_URL,
    useServiceRoleKey = false,
  } = options;

  const apiKeyInfo = getApiKey();
  const apiKeyName = apiKeyInfo?.name;

  return async function introspectMiddleware(req, res, next) {
    const auth = req.headers.authorization || req.headers.Authorization;
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = auth.slice(7).trim();
    const tokenHash = hashToken(token);

    const cached = cache.get(tokenHash);
    if (cached && cached.expiresAt > Date.now()) {
      req.user = cached.user;
      return next();
    }

    const apikey = apiKeyInfo?.key;
    if (!apikey) {
      console.warn('[introspect] no API key available for /auth/v1/user call');
      return res.status(401).json({ error: 'Authentication required' });
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      apikey,
    };

    try {
      const resp = await fetch(authUserUrl, { method: 'GET', headers });
      const body = await resp.text();

      if (resp.status !== 200) {
        console.warn('[introspect] auth failure', {
          status: resp.status,
          tokenHash: maskTokenHash(tokenHash),
          apiKey: apiKeyName,
          reason: body.slice(0, 200),
        });
        return res.status(401).json({ error: 'Authentication required' });
      }

      let user;
      try {
        user = JSON.parse(body);
      } catch {
        user = { raw: body };
      }

      cache.set(tokenHash, {
        user,
        expiresAt: Date.now() + cacheTtlSeconds * 1000,
      });

      req.user = user;
      return next();
    } catch (err) {
      console.warn('[introspect] request failed', {
        error: err?.message || err,
        tokenHash: maskTokenHash(tokenHash),
      });
      return res.status(401).json({ error: 'Authentication required' });
    }
  };
}
