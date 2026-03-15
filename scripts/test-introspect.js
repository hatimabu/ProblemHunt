#!/usr/bin/env node

/**
 * Test script for introspection middleware / Supabase /auth/v1/user.
 *
 * Usage:
 *   node scripts/test-introspect.js [<token>]
 *
 * If <token> is not provided, it will attempt a connectivity check to /auth/v1/user
 * using the available anon key (or other configured API key).
 */

import fs from 'fs';
import path from 'path';

const DEFAULT_URL = 'https://ajvobbpwgopinxtbpcpu.supabase.co/auth/v1/user';

function getApiKey() {
  const keys = [
    'SUPABASE_ANON_KEY',
    'VITE_SUPABASE_ANON_KEY',
    'PUBLISHABLE_API_KEY',
    'ANON_KEY',
    'SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_KEY',
  ];
  for (const k of keys) {
    if (process.env[k]) return { name: k, key: process.env[k] };
  }
  const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'problem-hunt', '.env'),
  ];
  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;
    const env = fs.readFileSync(envPath, 'utf8');
    for (const line of env.split(/\r?\n/)) {
      const m = line.match(/^([^=#]+)=([\s\S]+)/);
      if (!m) continue;
      const name = m[1].trim();
      const value = m[2].trim();
      if (keys.includes(name) && value) return { name, key: value };
    }
  }
  return null;
}

function safeMask(str) {
  if (!str) return '<none>';
  if (str.length <= 8) return '*'.repeat(str.length);
  return `${str.slice(0, 4)}...${str.slice(-4)}`;
}

async function main() {
  const token = process.argv[2];
  const apiKeyInfo = getApiKey();
  if (!apiKeyInfo) {
    console.error('No API key found (SUPABASE_ANON_KEY or similar).');
    process.exit(2);
  }

  const headers = {
    apikey: apiKeyInfo.key,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  console.log(`Using API key ${apiKeyInfo.name} (${safeMask(apiKeyInfo.key)})`);

  try {
    const res = await fetch(DEFAULT_URL, { method: 'GET', headers });
    const body = await res.text();
    const bodySnippet = body.slice(0, 1000);
    if (res.status === 200) {
      console.log('AUTH OK');
      process.exit(0);
    }

    // When no token is provided, 401 is expected (requires Bearer token)
    if (!token && res.status === 401 && body.includes('requires a valid Bearer token')) {
      console.log('AUTH OK (endpoint reachable; bearer token required)');
      process.exit(0);
    }

    console.error('AUTH FAIL —', res.status, bodySnippet);
    process.exit(1);
  } catch (err) {
    console.error('AUTH FAIL —', err.message);
    process.exit(1);
  }
}

main();
