import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { config, signedIn, checked } from './community-test-support.mjs';

const require = createRequire(new URL('../supabase/tests/package.json', import.meta.url));
const { chromium } = require('playwright');
const base = process.env.COMMUNITY_TEST_BASE_URL || 'http://127.0.0.1:5173';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Browser tests require a local frontend URL.');
const resultPath = new URL('../supabase/.temp/community-browser-results.json', import.meta.url);
const screenshot = new URL('../supabase/.temp/community-mobile-solved.png', import.meta.url);
let browser;
try {
  const c = await config();
  browser = await chromium.launch({ headless: true, channel: process.env.COMMUNITY_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined) });
  const ownerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const contributorContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const owner = await ownerContext.newPage(), helper = await contributorContext.newPage();
  for (const page of [owner, helper]) {
    page.setDefaultTimeout(30000);
    page.on('pageerror', e => console.error(`Browser application error: ${e.message}`));
    // The local frontend may read only the explicitly authorized project.
    await page.route('https://*.supabase.co/**', route => {
      if (new URL(route.request().url()).origin !== c.url) return route.abort();
      return route.continue();
    });
  }
  async function login(page, account, path) {
    await page.goto(`${base}${path}`);
    await page.getByLabel('Email', { exact: true }).fill(account.email);
    await page.getByLabel('Password', { exact: true }).fill(account.password);
    await page.getByRole('button', { name: 'Login', exact: true }).click();
  }
  const title = `[Stage 3 browser test] Audio dropouts ${Date.now()}`;
  await login(owner, c.accounts[0], '/post-problem');
  await owner.waitForURL('**/post-problem');
  await owner.getByLabel('Problem title').fill(title);
  await owner.getByLabel('Category', { exact: true }).selectOption({ index: 1 });
  await owner.getByRole('button', { name: 'Save private draft' }).click();
  await owner.getByRole('heading', { name: title, exact: true }).waitFor();
  const problemUrl = owner.url();
  const problemId = problemUrl.split('/').at(-1);
  await login(helper, c.accounts[1], '/auth');
  await helper.waitForURL('**/dashboard');
  await helper.goto(problemUrl);
  await helper.getByRole('heading', { name: 'Problem unavailable' }).waitFor();
  await helper.reload();
  await helper.getByRole('heading', { name: 'Problem unavailable' }).waitFor();
  console.log('PASS browser: separate sessions; draft direct link and refresh are denied to contributor.');

  await owner.getByRole('link', { name: 'Edit problem', exact: true }).click();
  await owner.getByLabel('Symptom', { exact: true }).fill('Audio drops out every minute.');
  await owner.getByRole('button', { name: 'Save private draft' }).click();
  await owner.getByRole('heading', { name: title, exact: true }).waitFor();
  await owner.reload();
  await owner.getByText('Audio drops out every minute.', { exact: true }).waitFor();
  await owner.getByRole('link', { name: 'Edit problem', exact: true }).click();
  await owner.getByLabel('Environment and setup').fill('Synthetic AV test setup, digital mixer and two receivers.');
  await owner.getByLabel('Product or model').fill('Test mixer');
  await owner.getByLabel('Version', { exact: true }).fill('1.0');
  await owner.getByLabel('Expected result').fill('Continuous audio');
  await owner.getByLabel('Actual result').fill('Intermittent silence');
  await owner.getByRole('button', { name: 'Add attempted test' }).click();
  await owner.getByLabel('Test 1', { exact: true }).fill('Checked cables');
  await owner.getByLabel('Observation 1', { exact: true }).fill('Cables are secure');
  await owner.getByRole('button', { name: 'Publish problem', exact: true }).click();
  await owner.getByRole('heading', { name: title, exact: true }).waitFor();
  await helper.goto(problemUrl);
  await helper.getByRole('heading', { name: title, exact: true }).waitFor();
  const diagnosis = 'Clock mismatch between digital devices';
  await helper.getByLabel('Diagnosis').fill(diagnosis);
  await helper.getByLabel('Steps (one per line)').fill('Set one clock source\nConfirm receiver sync');
  await helper.getByLabel('Why this should work').fill('Unsynchronized digital clocks can cause dropouts.');
  await helper.getByLabel('How to verify the solution').fill('Monitor uninterrupted audio for ten minutes.');
  await helper.getByRole('button', { name: 'Submit solution', exact: true }).click();
  await helper.getByRole('heading', { name: diagnosis, exact: true }).waitFor();
  await helper.getByLabel('Ask or answer a clarification').fill('Are both receivers synchronized to the same source?');
  await helper.getByRole('button', { name: 'Add clarification' }).click();
  await helper.getByText('Are both receivers synchronized to the same source?', { exact: true }).waitFor();
  await owner.getByRole('button', { name: 'Refresh discussion' }).click();
  await owner.getByRole('heading', { name: diagnosis, exact: true }).waitFor();
  await owner.getByLabel('What did you test?').fill('Set both receivers to the mixer clock');
  await owner.getByLabel('What did you observe?').fill('No dropouts during the test');
  await owner.getByLabel('How did you verify the result?').fill('Monitored audio for ten minutes');
  await owner.getByRole('button', { name: 'Save test result' }).click();
  await owner.getByText('Test result saved.', { exact: true }).waitFor();
  await owner.getByRole('button', { name: 'Mark as Testing' }).click();
  await owner.getByRole('button', { name: 'Accept solution and mark Solved' }).waitFor();
  await helper.reload();
  await helper.getByRole('heading', { name: diagnosis, exact: true }).waitFor();
  assert.equal(await helper.getByRole('button', { name: 'Accept solution and mark Solved' }).count(), 0);
  const api = await signedIn(c, c.accounts[1]);
  const solution = checked(await api.from('community_solutions').select('id').eq('problem_id',problemId).single(), 'Browser test solution lookup');
  const forbidden = await api.rpc('community_accept_solution', { p_problem_id: problemId, p_solution_id: solution.id, p_observation: 'Forged', p_verification: 'Forged' });
  assert.equal(forbidden.error?.code, '42501');
  await owner.getByRole('button', { name: 'Accept solution and mark Solved' }).click();
  await owner.getByRole('region', { name: 'Confirmed fix' }).waitFor();
  await owner.reload();
  await owner.getByRole('region', { name: 'Confirmed fix' }).waitFor();
  assert.ok(await owner.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Phone layout must not scroll horizontally');
  await owner.screenshot({ path: fileURLToPath(screenshot), fullPage: true });
  await helper.goto(problemUrl);
  await helper.getByRole('region', { name: 'Confirmed fix' }).waitFor();
  await helper.reload();
  await helper.getByRole('region', { name: 'Confirmed fix' }).waitFor();
  const visitorContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const visitor = await visitorContext.newPage();
  await visitor.goto(problemUrl);
  await visitor.getByRole('region', { name: 'Confirmed fix' }).waitFor();
  console.log('PASS browser: publish, propose, clarify, record tests, Testing, author-only acceptance, solved direct links and refresh for both accounts and visitor; 390px layout.');

  await owner.goto(`${base}/post-problem`);
  await owner.getByLabel('Problem title').fill('[Stage 3 browser test] Unresolved case');
  await owner.getByLabel('Category', { exact: true }).selectOption({ index: 1 });
  await owner.getByRole('button', { name: 'Save private draft' }).click();
  await owner.getByRole('button', { name: 'Close unresolved problem' }).click();
  await owner.getByRole('button', { name: 'Confirm close', exact: true }).click();
  await owner.getByText('This discussion is closed without a confirmed fix.', { exact: true }).waitFor();
  await owner.reload();
  await owner.getByText('This discussion is closed without a confirmed fix.', { exact: true }).waitFor();
  console.log('PASS browser: author closes unresolved case; closed state survives refresh.');
  await writeFile(resultPath, JSON.stringify({ project: c.ref, problemId, problemUrl, closedUrl: owner.url(), verifiedAt: new Date().toISOString(), viewport: '390x844' }, null, 2));
} catch (e) { console.error(e.message); process.exitCode = 1; }
finally { await browser?.close(); }
