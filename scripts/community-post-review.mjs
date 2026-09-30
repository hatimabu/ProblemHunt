// Compiled UI with intercepted Auth/REST. No hosted credentials or requests.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const require = createRequire(new URL('../supabase/tests/package.json', import.meta.url));
const { chromium } = require('playwright'), { default: AxeBuilder } = require('@axe-core/playwright');
const root = fileURLToPath(new URL('../', import.meta.url)), output = fileURLToPath(new URL('../supabase/.temp/session-04/', import.meta.url));
await mkdir(output, { recursive: true });
const base = 'http://127.0.0.1:4173', userId = '00000000-0000-0000-0000-000000000001';
const exp = Math.floor(Date.now() / 1000) + 3600;
const session = { access_token: `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: userId, exp })).toString('base64url')}.local-test-signature`, refresh_token: 'local-test-refresh', expires_at: exp, expires_in: 3600, token_type: 'bearer', user: { id: userId, email: 'local@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: { username: 'Local reviewer' } } };
const server = spawn(process.execPath, ['scripts/community-preview.mjs'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let browser; const evidence = [];
try {
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Preview startup timeout')), 10000); server.stdout.once('data', () => { clearTimeout(timer); resolve(); }); server.once('exit', () => { clearTimeout(timer); reject(new Error('Preview failed; check port 4173')); }); });
  browser = await chromium.launch({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined });
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await context.addInitScript(value => localStorage.setItem('problemhunt-auth', JSON.stringify(value)), session);
    const page = await context.newPage(), errors = [], rows = [];
    page.on('pageerror', e => errors.push(e.message));
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      if (url.origin === base) return route.continue();
      if (url.hostname !== 'example.supabase.co') return route.abort();
      const reply = value => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) });
      if (url.pathname === '/auth/v1/user') return reply(session.user);
      if (url.pathname.endsWith('/profiles')) return reply({ user_id: userId, username: 'Local reviewer', user_type: 'builder', full_name: 'Local reviewer' });
      if (url.pathname.endsWith('/community_domains')) return reply([{ id: 'cloud', slug: 'cloud-devops', name: 'Cloud / DevOps' }]);
      if (url.pathname.endsWith('/community_categories')) return reply([{ id: 'cloud-category', domain_id: 'cloud', slug: 'cloud-platforms', name: 'Cloud platforms' }]);
      if (url.pathname.endsWith('/community_search')) { const body = req.postDataJSON(); return reply(rows.filter(p => p.visibility === 'public' && (!body.p_post_type || p.post_type === body.p_post_type))); }
      if (url.pathname.endsWith('/community_problems')) {
        const id = url.searchParams.get('id')?.slice(3);
        if (req.method() === 'POST') {
          const body = req.postDataJSON(); assert.ok(['lab', 'incident'].includes(body.post_type));
          const row = { ...body, id: `10000000-0000-0000-0000-${String(rows.length + 1).padStart(12, '0')}`, author_id: userId, state: 'open', accepted_solution_id: null, resolution_observation: null, resolution_verification: null, solved_at: null, is_example: true, is_hidden: false, created_at: '2026-09-28T12:00:00Z', updated_at: '2026-09-28T12:00:00Z' };
          rows.push(row); return reply(row);
        }
        if (req.method() === 'PATCH') { const body = req.postDataJSON(); assert.equal(body.post_type, undefined); const row = rows.find(p => p.id === id); Object.assign(row, body); return reply(row); }
        if (id) return reply(rows.find(p => p.id === id) || null);
        return reply(url.searchParams.get('state') === 'eq.solved' ? [] : rows.filter(p => p.visibility === 'public'));
      }
      if (['community_tag_follows', 'community_saved_cases', 'community_profiles'].some(name => url.pathname.endsWith(`/${name}`))) return reply([]);
      throw new Error(`Unexpected mocked request: ${req.method()} ${url.pathname}`);
    });
    const scan = async label => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, label);
      const result = await new AxeBuilder({ page }).analyze();
      assert.deepEqual(result.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), [], label);
      evidence.push(`${width}px ${label}: axe and overflow pass`);
    };
    for (const type of ['lab', 'incident']) {
      await page.goto(`${base}/post-problem`);
      await page.getByLabel('Content type').selectOption(type);
      await page.getByLabel('Post title', { exact: true }).fill(`Local ${type} evidence`);
      await page.getByLabel('Category', { exact: true }).selectOption('cloud-category');
      for (const label of [type === 'lab' ? 'Lab objective' : 'Impact and symptoms', 'Environment and setup', 'Expected result', 'Actual result']) await page.getByLabel(label, { exact: true }).fill('Local fictional scenario for layout verification.');
      await page.getByRole('button', { name: 'Publish write-up', exact: true }).click();
      await page.getByRole('alert').waitFor(); assert.equal(rows.length, type === 'lab' ? 0 : 1);
      await page.getByRole('button', { name: 'Add step', exact: true }).click();
      await page.getByLabel('Step 1', { exact: true }).fill('Inspect the configuration.');
      await page.getByLabel('Observation 1', { exact: true }).fill('A required value was absent.');
      await page.getByLabel('Verification evidence and limitations', { exact: true }).fill('Illustrative local evidence only; no hosted result claimed.');
      await page.getByLabel('Lessons learned', { exact: true }).fill('Validate required inputs before deployment.');
      await scan(`${type} editor`);
      await page.screenshot({ path: `${output}/${type}-editor-${width}.png`, fullPage: true });
      await page.getByRole('button', { name: 'Save private draft', exact: true }).click();
      await page.getByText('Only you can see this private draft.', { exact: false }).waitFor();
      await page.getByRole('link', { name: 'Edit write-up', exact: true }).click();
      assert.equal(await page.getByLabel('Content type').isDisabled(), true);
      assert.equal(await page.getByLabel('Lessons learned').inputValue(), 'Validate required inputs before deployment.');
      await page.getByRole('button', { name: 'Publish write-up', exact: true }).click();
      await page.getByRole('heading', { name: 'Lessons learned', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Mark as Testing', exact: true }).count(), 0);
      assert.equal(await page.getByRole('heading', { name: 'Confirmed fix', exact: true }).count(), 0);
      await scan(`${type} publication`);
      await page.screenshot({ path: `${output}/${type}-${width}.png`, fullPage: true });
      await page.reload(); await page.getByRole('heading', { name: 'Lessons learned', exact: true }).waitFor();
    }
    await page.goto(`${base}/browse?type=lab`); await page.getByRole('link', { name: 'Local lab evidence', exact: true }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'Local incident evidence', exact: true }).count(), 0);
    await page.getByLabel('Content type').selectOption('incident');
    await page.getByRole('link', { name: 'Local incident evidence', exact: true }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'Local lab evidence', exact: true }).count(), 0);
    await scan('typed browse'); await page.screenshot({ path: `${output}/browse-${width}.png`, fullPage: true });
    assert.deepEqual(errors, []); evidence.push(`${width}px: draft/edit/publish/reload for both types, validation recovery and filtered browse passed (mocked transport)`);
    await context.close();
  }
  await writeFile(`${output}/evidence.json`, JSON.stringify(evidence, null, 2)); console.log(evidence.join('\n'));
} finally { await browser?.close(); server.kill(); }
