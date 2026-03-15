/**
 * Middleware to verify JWTs against a JWKS endpoint using jose.
 *
 * Usage (Express):
 *   import { verifyJwt } from './middleware/verifyJwt.js';
 *   app.use(verifyJwt({
 *     jwksUrl: process.env.JWKS_URL,
 *     allowedIssuer: process.env.ALLOWED_ISS,
 *     allowedAud: process.env.ALLOWED_AUD && process.env.ALLOWED_AUD.split(','),
 *   }));
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';

const DEFAULT_JWKS_URL =
  process.env.JWKS_URL ||
  'https://ajvobbpwgopinxtbpcpu.supabase.co/auth/v1/.well-known/jwks.json';
const DEFAULT_ISSUER =
  process.env.ALLOWED_ISS ||
  'https://ajvobbpwgopinxtbpcpu.supabase.co/auth/v1';

function maskTokenHash(token) {
  if (!token) return '<none>';
  const hash = crypto.subtle
    ? ''
    : token.slice(-8); // fallback for non-browser
  return hash;
}

export function verifyJwt(options = {}) {
  const jwksUrl = options.jwksUrl || DEFAULT_JWKS_URL;
  const allowedIssuer = options.allowedIssuer || DEFAULT_ISSUER;
  const allowedAud = options.allowedAud || (process.env.ALLOWED_AUD ? process.env.ALLOWED_AUD.split(',') : undefined);

  const JWKS = createRemoteJWKSet(new URL(jwksUrl));

  return async function verifyJwtMiddleware(req, res, next) {
    const auth = req.headers.authorization || req.headers.Authorization;
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = auth.slice(7).trim();
    let decodedHeader;
    try {
      decodedHeader = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString('utf8'));
    } catch {
      decodedHeader = { alg: '<invalid>', kid: '<invalid>' };
    }

    try {
      const verifyOptions = {
        issuer: allowedIssuer,
      };
      if (allowedAud) verifyOptions.audience = allowedAud;

      const { payload } = await jwtVerify(token, JWKS, verifyOptions);
      req.user = payload;
      return next();
    } catch (err) {
      console.warn('[verifyJwt] verification failed', {
        alg: decodedHeader?.alg,
        kid: decodedHeader?.kid,
        issuer: allowedIssuer,
        audience: allowedAud,
        reason: err?.message,
      });
      return res.status(401).json({ error: 'Authentication required' });
    }
  };
}
