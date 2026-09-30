// Local compiled UI + simulated Auth/REST. All external requests are intercepted; no hosted data or credentials.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const require = createRequire(new URL('../supabase/tests/package.json', import.meta.url));
const { chromium } = require('playwright'), { default: AxeBuilder } = require('@axe-core/playwright');
const root = fileURLToPath(new URL('../', import.meta.url)), output = fileURLToPath(new URL('../supabase/.temp/session-03/', import.meta.url));
await mkdir(output, { recursive: true });
const base = 'http://127.0.0.1:4173';
const ids = ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'];
function session(id) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const payload = Buffer.from(JSON.stringify({ sub: id, exp })).toString('base64url');
  return { access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.local-test-signature`, refresh_token: 'local-test-refresh', expires_at: exp, expires_in: 3600, token_type: 'bearer', user: { id, email: 'local@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: { username: 'Local reviewer' } } };
}
const row = { id: '10000000-0000-0000-0000-000000000001', title: 'Docker network troubleshooting', symptom: 'A local fictional case for testing saved cases and followed tags.', product: 'Docker', product_version: '', tags: ['docker'], visibility: 'public', is_hidden: false, is_example: true, state: 'open', accepted_solution_id: null, created_at: '2026-09-27T12:00:00Z' };
const server = spawn(process.execPath, ['scripts/community-preview.mjs'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let browser; const evidence = [];
try {
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Preview startup timeout')), 10000); server.stdout.once('data', () => { clearTimeout(timer); resolve(); }); server.once('exit', () => { clearTimeout(timer); reject(new Error('Preview startup failed; check port 4173')); }); });
  browser = await chromium.launch({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined });
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await context.addInitScript(value => { if (!localStorage.getItem('library-review-initialized')) { localStorage.setItem('problemhunt-auth', JSON.stringify(value)); localStorage.setItem('library-review-initialized', '1'); } }, session(ids[0]));
    const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
    const preferences = Object.fromEntries(ids.map(id => [id, { tags: new Set(), saved: new Set() }]));
    let hidden = false, failWrite = false;
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === base) return route.continue();
      if (url.hostname !== 'example.supabase.co') return route.abort();
      const headers = request.headers(); let user;
      try { user = JSON.parse(Buffer.from((headers.authorization || '').split('.')[1], 'base64url').toString()).sub; } catch {}
      const pref = preferences[user]; const method = request.method();
      const reply = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
      if (url.pathname === '/auth/v1/user') return reply(session(user).user);
      if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 });
      if (url.pathname.endsWith('/profiles')) return reply({ user_id: user, username: 'Local reviewer', user_type: 'builder', full_name: 'Local reviewer' });
      if (url.pathname.endsWith('/community_tag_follows') || url.pathname.endsWith('/community_saved_cases')) {
        if (!pref) return reply({ message: 'Sign in required' }, 401);
        const follows = url.pathname.endsWith('/community_tag_follows'), field = follows ? 'tag' : 'problem_id', values = follows ? pref.tags : pref.saved;
        if (url.searchParams.get('user_id') && url.searchParams.get('user_id') !== `eq.${user}`) return reply([]);
        if (method === 'GET') return reply([...values].map(value => ({ [field]: value })));
        if (failWrite) return reply({ message: 'Local simulated write failure' }, 500);
        if (method === 'POST') { const body = request.postDataJSON(); assert.equal(body.user_id, user); values.add(body[field]); }
        else if (method === 'DELETE') values.delete(url.searchParams.get(field)?.slice(3));
        else throw new Error(`Unexpected method: ${method}`);
        return route.fulfill({ status: 204 });
      }
      if (url.pathname.endsWith('/community_personal_feed')) {
        if (!pref) return reply({ message: 'Sign in required' }, 401);
        const { p_view } = request.postDataJSON(); return reply(!hidden && (p_view === 'saved' ? pref.saved.has(row.id) : pref.tags.has('docker')) ? [row] : []);
      }
      if (url.pathname.endsWith('/community_problems')) return reply(hidden || url.searchParams.get('state') === 'eq.solved' ? [] : [row]);
      if (url.pathname.endsWith('/community_search')) return reply(hidden ? [] : [row]);
      if (url.pathname.endsWith('/community_domains')) return reply([{ id: 'cloud', slug: 'cloud-devops', name: 'Cloud / DevOps' }]);
      if (url.pathname.endsWith('/community_categories')) return reply([]);
      return route.abort();
    });
    const scan = async label => { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); const result = await new AxeBuilder({ page }).analyze(); assert.deepEqual(result.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), [], label); evidence.push(`${width}px ${label}: axe and overflow pass`); };
    await page.goto(`${base}/?view=following`); await page.getByLabel('Tag to follow').waitFor();
    await page.getByLabel('Tag to follow').fill(' Docker '); await page.getByRole('button', { name: 'Follow tag', exact: true }).click();
    await page.getByRole('button', { name: 'Unfollow #docker' }).waitFor(); await page.locator('.hub-case').waitFor();
    await scan('following'); await page.screenshot({ path: `${output}/following-${width}.png`, fullPage: true });
    await page.reload(); await page.getByRole('button', { name: 'Unfollow #docker' }).waitFor();
    await page.getByRole('button', { name: 'Save case', exact: true }).click(); await page.getByRole('button', { name: 'Saved · remove' }).waitFor();
    await page.goto(`${base}/?view=saved`); await page.getByRole('button', { name: 'Saved · remove' }).waitFor();
    await scan('saved'); await page.screenshot({ path: `${output}/saved-${width}.png`, fullPage: true });
    hidden = true; await page.reload(); await page.getByText('No visible saved cases here yet.').waitFor(); assert.equal(await page.getByText(row.title, { exact: true }).count(), 0);
    hidden = false; await page.reload(); await page.getByRole('button', { name: 'Saved · remove' }).waitFor();
    failWrite = true; await page.getByRole('button', { name: 'Saved · remove' }).click(); await page.getByRole('alert').waitFor(); await scan('failed removal');
    failWrite = false; await page.getByRole('button', { name: 'Retry private library' }).click(); await page.getByRole('button', { name: 'Saved · remove' }).click(); await page.getByText('No visible saved cases here yet.').waitFor();
    await page.goto(`${base}/browse?tag=docker`); await page.getByRole('button', { name: 'Unfollow #docker' }).click();
    await page.getByRole('button', { name: 'Follow #docker', exact: true }).waitFor(); await page.getByRole('button', { name: 'Follow #docker', exact: true }).click(); await page.getByRole('button', { name: 'Unfollow #docker' }).waitFor();
    await page.evaluate(value => localStorage.setItem('problemhunt-auth', JSON.stringify(value)), session(ids[1]));
    await page.goto(`${base}/?view=following`); await page.getByText('No matching public cases yet.').waitFor(); assert.equal(await page.getByRole('button', { name: 'Unfollow #docker' }).count(), 0);
    await page.getByRole('button', { name: 'Sign out', exact: true }).first().click();
    await page.goto(`${base}/?view=saved`); await page.getByRole('link', { name: 'Sign in to continue' }).waitFor(); await scan('signed out');
    assert.deepEqual(errors, []); evidence.push(`${width}px: follow/unfollow, save/remove, reload persistence, hidden-content exclusion, failed write/retry, second-account isolation and sign-out passed (mocked transport)`);
    await context.close();
  }
  await writeFile(`${output}/evidence.json`, JSON.stringify(evidence, null, 2)); console.log(evidence.join('\n'));
} finally { await browser?.close(); server.kill(); }
