import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLocalJWKSet, jwtVerify } from 'jose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPORT_PATH = path.resolve(__dirname, 'diagnosis_report.txt');
const JWKS_PATH = path.resolve(__dirname, 'jwks.json');
const JWKS_ERROR_PATH = path.resolve(__dirname, 'jwks_error.txt');
const JWT_DECODED_PATH = path.resolve(__dirname, 'jwt_decoded.json');
const AUTH_USER_RESPONSE_PATH = path.resolve(__dirname, 'auth_user_response.txt');

const DEFAULT_JWKS_URL = 'https://ajvobbpwgopinxtbpcpu.supabase.co/auth/v1/.well-known/jwks.json';
const DEFAULT_ISSUER = 'https://ajvobbpwgopinxtbpcpu.supabase.co/auth/v1';
const AUTH_USER_URL = 'https://ajvobbpwgopinxtbpcpu.supabase.co/auth/v1/user';

function safeMaskSecret(secret) {
  if (!secret) return null;
  const len = secret.length;
  if (len <= 8) return '*'.repeat(len);
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

function parseJWT(token) {
  const parts = token.split('.');
  if (parts.length < 2) throw new Error('JWT must have at least two parts');
  const [header, payload] = parts;
  const decodedHeader = JSON.parse(base64UrlDecode(header));
  const decodedPayload = JSON.parse(base64UrlDecode(payload));
  return { header: decodedHeader, payload: decodedPayload };
}

function writeFile(filePath, data) {
  fs.writeFileSync(filePath, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
}

async function fetchJWKS() {
  try {
    const resp = await fetch(DEFAULT_JWKS_URL, { method: 'GET' });
    const body = await resp.text();
    if (resp.status !== 200) {
      writeFile(JWKS_ERROR_PATH, `status: ${resp.status}\n${body}`);
      return { success: false, status: resp.status, body };
    }
    const json = JSON.parse(body);
    writeFile(JWKS_PATH, json);
    return { success: true, jwks: json };
  } catch (err) {
    writeFile(JWKS_ERROR_PATH, `fetch error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

function findSampleJWT() {
  if (process.env.SAMPLE_JWT) return process.env.SAMPLE_JWT.trim();
  const candidateFiles = ['sample_jwt.txt', 'jwt.txt', 'token.txt'];
  for (const f of candidateFiles) {
    const p = path.resolve(__dirname, f);
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf8').trim();
    }
  }
  return null;
}

function getApiKey() {
  const keys = [
    'SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_KEY',
    'PUBLISHABLE_API_KEY',
    'SUPABASE_ANON_KEY',
    'ANON_KEY',
  ];
  for (const k of keys) {
    if (process.env[k]) return { key: process.env[k], name: k };
  }
  try {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const env = fs.readFileSync(envPath, 'utf8');
      for (const line of env.split(/\r?\n/)) {
        const m = line.match(/^([^=#]+)=([\s\S]+)/);
        if (!m) continue;
        const name = m[1].trim();
        const value = m[2].trim();
        if (keys.includes(name) && value) {
          return { key: value, name };
        }
      }
    }
  } catch (err) {
    // ignore
  }
  return null;
}

async function callAuthUser(token, apiKey) {
  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      apikey: apiKey,
    };
    const resp = await fetch(AUTH_USER_URL, { method: 'GET', headers });
    const body = await resp.text();
    writeFile(AUTH_USER_RESPONSE_PATH, `status: ${resp.status}\n${body}`);
    return { status: resp.status, body };
  } catch (err) {
    writeFile(AUTH_USER_RESPONSE_PATH, `fetch error: ${err.message}`);
    return { error: err.message };
  }
}

const report = [];

report.push('=== JWKS Fetch ===');
const jwksResult = await fetchJWKS();
if (jwksResult.success) {
  const keys = Array.isArray(jwksResult.jwks.keys) ? jwksResult.jwks.keys.length : 0;
  report.push(`JWKS fetched — ${keys} key(s)`);
  report.push(`JWKS URL: ${DEFAULT_JWKS_URL}`);
} else {
  report.push('No JWKS available (fetch failed)');
  if (jwksResult.status) report.push(`status: ${jwksResult.status}`);
  if (jwksResult.body) report.push(`body: ${jwksResult.body}`);
  if (jwksResult.error) report.push(`error: ${jwksResult.error}`);
}

const sampleJwt = findSampleJWT();
if (!sampleJwt) {
  report.push('No SAMPLE_JWT found in environment or sample_jwt.txt.');
  report.push('Provide a JWT via env var SAMPLE_JWT or file sample_jwt.txt.');
  writeFile(REPORT_PATH, report.join('\n'));
  console.log('DIAGNOSIS COMPLETE — report: ./diagnosis_report.txt');
  process.exit(0);
}

report.push('');
report.push('=== JWT Decode ===');
let decoded;
try {
  decoded = parseJWT(sampleJwt);
  writeFile(JWT_DECODED_PATH, decoded);
  const { header, payload } = decoded;
  const fields = [
    `alg: ${header.alg}`,
    `kid: ${header.kid || '<none>'}`,
    `iss: ${payload.iss || '<none>'}`,
    `aud: ${Array.isArray(payload.aud) ? payload.aud.join(',') : payload.aud || '<none>'}`,
    `exp: ${payload.exp || '<none>'}`,
    `nbf: ${payload.nbf || '<none>'}`,
  ];
  report.push(...fields);
} catch (err) {
  report.push(`Failed to decode JWT: ${err.message}`);
  writeFile(REPORT_PATH, report.join('\n'));
  console.log('DIAGNOSIS COMPLETE — report: ./diagnosis_report.txt');
  process.exit(0);
}

report.push('');
report.push('=== Verification ===');
let verificationResult = { ok: false, error: 'not attempted' };

if (jwksResult.success && Array.isArray(jwksResult.jwks.keys) && jwksResult.jwks.keys.length > 0) {
  const jwks = jwksResult.jwks;
  const kid = decoded.header.kid;
  const keyMatch = jwks.keys.find((k) => k.kid === kid);
  report.push(`JWKS keys: ${jwks.keys.length}`);
  report.push(`Matching kid in JWKS: ${keyMatch ? 'yes' : 'no'}`);

  try {
    const JWKS = createLocalJWKSet(jwks);
    const verifyOptions = { issuer: DEFAULT_ISSUER };
    if (decoded.payload.aud) verifyOptions.audience = decoded.payload.aud;
    await jwtVerify(sampleJwt, JWKS, verifyOptions);
    verificationResult = { ok: true };
    report.push('Public-key verification: SUCCESS');
  } catch (err) {
    verificationResult = { ok: false, error: err.message };
    report.push(`Public-key verification failed: ${err.message}`);
  }
} else {
  report.push('No JWKS keys available; assuming HS256/shared-secret mode');
}

report.push('');
report.push('=== /auth/v1/user Validation ===');
const apiKeyData = getApiKey();
if (!apiKeyData) {
  report.push('No API key found in environment or .env (needed for /auth/v1/user call)');
} else {
  report.push(`Using API key from: ${apiKeyData.name} (masked: ${safeMaskSecret(apiKeyData.key)})`);
  const authRes = await callAuthUser(sampleJwt, apiKeyData.key);
  if (authRes.error) {
    report.push(`Auth user call error: ${authRes.error}`);
  } else {
    report.push(`Auth user response status: ${authRes.status}`);
  }
}

const defaultIssuer = DEFAULT_ISSUER;
if (decoded.payload.iss && decoded.payload.iss !== defaultIssuer) {
  report.push('Issuer mismatch:');
  report.push(`  expected: ${defaultIssuer}`);
  report.push(`  token: ${decoded.payload.iss}`);
}

report.push('');
report.push('=== Next Steps ===');
if (!jwksResult.success) {
  report.push('No JWKS available — likely HS256/shared-secret.');
  report.push('  • Ensure SUPABASE_JWT_SECRET matches the project JWT secret.');
  report.push('  • Alternatively, rotate to ES256 and update Supabase settings.');
}
if (!verificationResult.ok) {
  report.push(`Verification failed: ${verificationResult.error}`);
  report.push('  • Ensure issuer/audience match, token is not expired, and key/kid are correct.');
  report.push('  • If using HS256, ensure shared secret is correct and present.');
}

writeFile(REPORT_PATH, report.join('\n'));
console.log('DIAGNOSIS COMPLETE — report: ./diagnosis_report.txt');
