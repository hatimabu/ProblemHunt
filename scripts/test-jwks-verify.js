#!/usr/bin/env node

/**
 * Test script for JWKS-based JWT verification.
 *
 * Usage:
 *   node scripts/test-jwks-verify.js <token>
 *
 * If no token is provided, the script will skip verification.
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';

const DEFAULT_JWKS_URL =
  process.env.JWKS_URL ||
  'https://ajvobbpwgopinxtbpcpu.supabase.co/auth/v1/.well-known/jwks.json';
const DEFAULT_ISSUER =
  process.env.ALLOWED_ISS ||
  'https://ajvobbpwgopinxtbpcpu.supabase.co/auth/v1';

async function main() {
  const token = process.argv[2];
  if (!token) {
    console.log('No token supplied — JWKS verification skipped');
    process.exit(0);
  }

  const jwks = createRemoteJWKSet(new URL(DEFAULT_JWKS_URL));
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: DEFAULT_ISSUER,
      // audience is optional; if set, provide via ALLOWED_AUD
      audience: process.env.ALLOWED_AUD ? process.env.ALLOWED_AUD.split(',') : undefined,
    });
    console.log('JWKS verification OK');
    console.log(JSON.stringify(payload, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('JWKS verification FAILED —', err.message);
    process.exit(1);
  }
}

main();
