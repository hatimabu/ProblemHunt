import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { config, setupAccounts, client, signedIn, checked } from './community-test-support.mjs';

try {
  if (process.argv.includes('--setup')) await setupAccounts();
  const c = await config();
  const [authorAccount, contributorAccount] = c.accounts;
  assert.ok(authorAccount?.id && contributorAccount?.id && authorAccount.id !== contributorAccount.id);
  const author = await signedIn(c, authorAccount), contributor = await signedIn(c, contributorAccount), anon = client(c);
  const categories = checked(await author.from('community_categories').select('id').limit(1), 'Load community schema');
  assert.ok(categories.length, 'Stage 2 taxonomy must be applied');
  let p = checked(await author.from('community_problems').insert({ category_id: categories[0].id, title: `[Stage 3 API test] Gateway timeout ${Date.now()}` }).select().single(), 'Save private draft');
  assert.equal(p.visibility, 'draft');
  assert.equal(checked(await contributor.from('community_problems').select('id').eq('id', p.id), 'Contributor draft read').length, 0);
  assert.equal(checked(await anon.from('community_problems').select('id').eq('id', p.id), 'Anonymous draft read').length, 0);
  assert.equal(checked(await contributor.from('community_problems').update({ title: 'Unauthorized edit' }).eq('id', p.id).select('id'), 'Unauthorized edit').length, 0);
  console.log('PASS: real API private draft creation; contributor/anonymous invisibility; unauthorized edit rejected.');
  p = checked(await author.from('community_problems').update({ symptom: 'Gateway returns 504', environment: { platform: 'Synthetic test fixture' },
    expected_behavior: 'HTTP 200', actual_behavior: 'HTTP 504', attempted_tests: [{ test: 'Inspect routing', observation: 'Wrong backend' }], visibility: 'public' }).eq('id', p.id).select().single(), 'Publish problem');
  assert.equal(checked(await contributor.from('community_problems').select().eq('id', p.id).single(), 'Public read').visibility, 'public');
  const solution = checked(await contributor.from('community_solutions').insert({ problem_id: p.id, diagnosis: 'Backend route points to old host', steps: ['Correct route', 'Repeat request'], reasoning: 'The old host is unavailable', verification_method: 'Three HTTP requests return 200' }).select().single(), 'Propose solution');
  checked(await contributor.from('community_comments').insert({ solution_id: solution.id, body: 'Which deployment version is affected?' }).select().single(), 'Clarification');
  checked(await author.from('community_comments').insert({ solution_id: solution.id, kind: 'test_result', body: 'Author test result', attempted_test: 'Corrected route', observation: 'HTTP 200 on all requests', verification_method: 'Repeated three times' }).select().single(), 'Record test');
  checked(await author.rpc('community_set_problem_state', { p_problem_id: p.id, p_state: 'testing' }), 'Mark Testing');
  const acceptArgs = { p_problem_id: p.id, p_solution_id: solution.id, p_observation: 'HTTP 200', p_verification: 'Repeated three times' };
  const forbidden = await contributor.rpc('community_accept_solution', acceptArgs);
  assert.equal(forbidden.error?.code, '42501', 'Contributor must not accept on author behalf');
  assert.equal(checked(await author.from('community_problems').select('state').eq('id',p.id).single(), 'Check unchanged state').state, 'testing');
  checked(await author.rpc('community_accept_solution', acceptArgs), 'Accept solution');
  // Fresh authenticated client proves independently fetched, persisted state.
  const freshContributor = await signedIn(c, contributorAccount);
  for (const api of [author, freshContributor, anon]) {
    const solved = checked(await api.from('community_problems').select().eq('id',p.id).single(), 'Revisit solved case');
    assert.equal(solved.state, 'solved'); assert.equal(solved.accepted_solution_id, solution.id);
  }
  const closed = checked(await author.from('community_problems').insert({ category_id: categories[0].id, title: '[Stage 3 API test] Unresolved draft' }).select().single(), 'Create unresolved case');
  checked(await author.rpc('community_set_problem_state', { p_problem_id: closed.id, p_state: 'closed' }), 'Close unresolved');
  await writeFile(new URL('../supabase/.temp/community-api-results.json', import.meta.url), JSON.stringify({ project: c.ref, problemId: p.id, solutionId: solution.id, closedId: closed.id, verifiedAt: new Date().toISOString() }, null, 2));
  console.log('PASS: real Auth/PostgREST publish, propose, clarify, test, author-only acceptance, fresh-session solved reads, unresolved close.');
  console.log('Synthetic records retained; identifiers saved in ignored result file.');
} catch (e) { console.error(e.message); process.exitCode = 1; }
