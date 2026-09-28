// Compiled local preview only. All non-local requests are intercepted; no credentials or hosted writes.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const require = createRequire(new URL('../supabase/tests/package.json', import.meta.url));
const { chromium } = require('playwright'), { default: AxeBuilder } = require('@axe-core/playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const output = fileURLToPath(new URL('../supabase/.temp/session-02/', import.meta.url));
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['scripts/community-preview.mjs'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
const evidence = [];
const rows = [
  { id: '10000000-0000-0000-0000-000000000001', title: 'NGINX returns 502 after moving the API into Docker', symptom: 'The container is healthy, but requests through the reverse proxy fail. Which network boundary should I check first?', product: 'Docker / NGINX', tags: ['docker', 'networking'], state: 'open' },
  { id: '10000000-0000-0000-0000-000000000002', title: 'A deployment succeeds, but the new assets never appear', symptom: 'Comparing the build output with the deployed artifact revealed a stale upload directory.', product: 'Azure / GitHub Actions', tags: ['azure', 'ci-cd'], state: 'solved', accepted_solution_id: 'solution', resolution_observation: 'Pointing the upload step to the current build directory resolved the stale release.' },
  { id: '10000000-0000-0000-0000-000000000003', title: 'Tracking intermittent clicks in a digital audio network', symptom: 'We are testing clock settings and checking the switch configuration before changing any hardware.', product: 'Professional AV', tags: ['audio', 'networking'], state: 'testing' },
].map(r => ({ category_id: 'cloud', author_id: 'author', product_version: '', is_example: true, is_hidden: false, visibility: 'public', created_at: '2026-09-27T12:00:00Z', solved_at: '2026-09-27T13:00:00Z', ...r }));
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Preview startup timeout')), 10000);
    server.stdout.once('data', () => { clearTimeout(timer); resolve(); });
    server.once('exit', () => { clearTimeout(timer); reject(new Error('Preview could not start; port 4173 may be in use.')); });
  });
  browser = await chromium.launch({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined });
  for (const width of [1440, 390, 820, 1024]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    let mode = 'populated';
    await context.route('**/*', async route => {
      const u = new URL(route.request().url());
      if (u.origin === 'http://127.0.0.1:4173') return route.continue();
      if (u.hostname !== 'example.supabase.co') return route.abort();
      const fulfill = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (u.pathname.includes('community_problems')) {
        if (mode === 'error') return fulfill({ message: 'Local simulated failure' }, 500);
        const filtered = mode === 'empty' ? [] : u.searchParams.has('answers') ? rows.filter(r => r.state === 'open') : u.searchParams.get('state') === 'eq.solved' ? rows.filter(r => r.state === 'solved') : rows;
        return fulfill(filtered);
      }
      if (u.pathname.endsWith('/community_search')) return fulfill(mode === 'empty' ? [] : rows);
      if (u.pathname.endsWith('/community_domains')) return fulfill([{ id: 'cloud', slug: 'cloud-devops', name: 'Cloud / DevOps' }, { id: 'av', slug: 'professional-av', name: 'Professional AV' }]);
      if (u.pathname.endsWith('/community_categories')) return fulfill([{ id: 'cloud', domain_id: 'cloud', slug: 'cloud-platforms', name: 'Cloud platforms' }]);
      return route.abort();
    });
    const check = async label => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width} ${label}: horizontal overflow`);
      const a11y = await new AxeBuilder({ page }).analyze();
      assert.deepEqual(a11y.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), [], `${width} ${label}: accessibility`);
      evidence.push(`${width}px ${label}: no overflow; axe passed`);
    };
    await page.goto('http://127.0.0.1:4173/'); await page.locator('.hub-case').first().waitFor();
    await check('populated home');
    await page.screenshot({ path: `${output}/home-${width}.png`, fullPage: true });
    if (width < 900) {
      assert.equal(await page.locator('.hub-menu').evaluate(e => e.open), false);
      await page.locator('.hub-menu summary').click(); await page.getByRole('link', { name: 'Cloud & DevOps', exact: true }).waitFor({ state: 'visible' });
      await page.locator('.hub-menu summary').click();
    }
    const views = page.getByRole('navigation', { name: 'Feed views' });
    await views.getByRole('link', { name: 'Unanswered', exact: true }).click(); await page.waitForURL('**/?view=unanswered');
    await page.waitForFunction(() => document.querySelectorAll('.hub-case').length === 1);
    await page.reload(); await page.locator('.hub-case').first().waitFor();
    await views.getByRole('link', { name: 'Latest', exact: true }).focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await views.getByRole('link', { name: 'Unanswered', exact: true }).evaluate(e => e === document.activeElement), true);
    await page.getByLabel('Search symptoms, products or tags').fill('network'); await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.waitForURL('**/browse?q=network'); await page.getByText('Page 1 · 3 results').waitFor(); await check('browse');
    await page.getByRole('navigation', { name: 'Knowledge domains' }).getByRole('link', { name: 'Professional AV', exact: true }).click();
    await page.waitForURL('**/domains/professional-av?q=network'); await page.getByText('Page 1 · 3 results').waitFor();
    await page.goBack(); await page.waitForURL('**/browse?q=network');
    mode = 'empty'; await page.goto('http://127.0.0.1:4173/'); await page.getByText('Make room for the first conversation.').waitFor(); await check('empty home');
    if (width === 1440 || width === 390) await page.screenshot({ path: `${output}/empty-${width}.png`, fullPage: true });
    mode = 'error'; await page.reload(); await page.getByRole('alert').waitFor(); await check('error home');
    mode = 'populated'; await page.getByRole('button', { name: 'Try again', exact: true }).click(); await page.locator('.hub-case').first().waitFor();
    assert.deepEqual(errors, []); evidence.push(`${width}px: view reload, keyboard tabs, search/domain/back navigation, error retry passed`);
    await context.close();
  }
  await writeFile(`${output}/evidence.json`, JSON.stringify(evidence, null, 2)); console.log(evidence.join('\n'));
} finally { await browser?.close(); server.kill(); }
