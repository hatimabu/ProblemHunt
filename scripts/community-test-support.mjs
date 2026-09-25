import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';

const require = createRequire(new URL('../problem-hunt/package.json', import.meta.url));
export const { createClient } = require('@supabase/supabase-js');
export const localFile = new URL('../supabase/.temp/community-test-accounts.json', import.meta.url);
export const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
export function checked(result, operation) {
  if (result.error) throw new Error(`${operation}: ${result.error.code || result.error.status || 'request failed'} ${result.error.message}`);
  return result.data;
}
export async function config() {
  const c = await readJson(localFile);
  const allowed = process.argv[process.argv.indexOf('--allow-project') + 1];
  if (!process.argv.includes('--allow-project') || allowed !== c.ref) throw new Error('Pass --allow-project <explicitly authorized ref> to enable hosted test writes.');
  if (c.url !== `https://${c.ref}.supabase.co`) throw new Error('Project reference/URL mismatch.');
  return c;
}
export function client(c) { return createClient(c.url, c.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }); }
export async function signedIn(c, account) {
  const api = client(c);
  checked(await api.auth.signInWithPassword({ email: account.email, password: account.password }), 'Test account sign-in');
  return api;
}
export async function setupAccounts() {
  const ref = (await readFile(new URL('../supabase/.temp/project-ref', import.meta.url), 'utf8')).trim();
  const allowed = process.argv[process.argv.indexOf('--allow-project') + 1];
  if (!process.argv.includes('--allow-project') || allowed !== ref) throw new Error('Explicit --allow-project required; no accounts created.');
  try { await readFile(localFile); console.log('Reusing existing ignored test account configuration.'); return; } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const keys = await readJson(new URL('../supabase/.temp/community-test-keys.json', import.meta.url));
  const anonKey = keys.find(k => k.name === 'anon')?.api_key;
  const adminKey = keys.find(k => k.name === 'service_role')?.api_key;
  if (!anonKey || !adminKey) throw new Error('Expected anon and service-role keys in ignored CLI output.');
  const c = { ref, url: `https://${ref}.supabase.co`, anonKey, accounts: [] };
  const admin = createClient(c.url, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const run = Date.now().toString(36);
  for (const label of ['author', 'contributor']) {
    const email = `problemhunt-stage3-${label}-${run}@example.invalid`;
    const password = randomBytes(24).toString('base64url');
    const data = checked(await admin.auth.admin.createUser({ email, password, email_confirm: true,
      user_metadata: { username: `stage3_${label}_${run}`, full_name: `Community test ${label}`, user_type: 'builder' } }), 'Create synthetic test account');
    c.accounts.push({ label, id: data.user.id, email, password });
    // Preserve created credentials even if creation of a subsequent account fails.
    await writeFile(localFile, JSON.stringify(c, null, 2));
  }
  console.log('Two confirmed synthetic accounts created; credentials saved only in ignored local file.');
}
