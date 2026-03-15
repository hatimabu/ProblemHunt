// verify-jwt.js - Verify a JWT token against Supabase JWKS endpoint
// Usage: node verify-jwt.js <jwt-token> [config.json]
// If config.json is omitted, uses default JWKS URL and issuer.
// Config JSON format: { "jwksUrl": "...", "issuer": "..." }

const { createRemoteJWKSet, jwtVerify } = require('jose');

const DEFAULT_JWKS_URL = 'https://ajvobbpwgopinxtbpcpu.supabase.co/auth/v1/.well-known/jwks.json';
const DEFAULT_ISSUER = 'https://ajvobbpwgopinxtbpcpu.supabase.co/auth/v1';

async function verifyJWT(token, configPath) {
  let jwksUrl = DEFAULT_JWKS_URL;
  let issuer = DEFAULT_ISSUER;

  if (configPath) {
    try {
      const config = require(configPath);
      jwksUrl = config.jwksUrl || jwksUrl;
      issuer = config.issuer || issuer;
    } catch (err) {
      console.error('INVALID: Failed to load config:', err.message);
      return;
    }
  }

  try {
    const JWKS = createRemoteJWKSet(new URL(jwksUrl));
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: issuer,
    });
    console.log('VERIFIED');
    console.log(JSON.stringify(payload, null, 2));
  } catch (err) {
    console.log('INVALID:', err.message);
  }
}

const [,, token, configPath] = process.argv;
if (!token) {
  console.error('Usage: node verify-jwt.js <jwt-token> [config.json]');
  process.exit(1);
}

verifyJWT(token, configPath);