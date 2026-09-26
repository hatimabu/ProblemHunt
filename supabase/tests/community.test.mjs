import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';

// No connection string is accepted. Every run is a brand-new in-memory database.
const db = new PGlite();
const migrations = new URL('../migrations/', import.meta.url);
const read = (url) => readFile(url, 'utf8');
const ids = {
  author: '00000000-0000-0000-0000-000000000001',
  contributor: '00000000-0000-0000-0000-000000000002',
  outsider: '00000000-0000-0000-0000-000000000003',
  moderator: '00000000-0000-0000-0000-000000000004',
  newUser: '00000000-0000-0000-0000-000000000005',
};
const q = (sql, params = []) => db.query(sql, params);
const one = async (sql, params = []) => (await q(sql, params)).rows[0];
let category, publicProblem, draftProblem, otherProblem, solution, otherSolution, comment, report;
const legacyTables = ['profiles', 'wallets', 'orders', 'payments', 'notifications',
  'tip_transactions', 'payment_intents', 'problems', 'proposals', 'upvotes', 'tips', 'job_contracts'];
async function legacySnapshot() {
  const result = {};
  for (const table of legacyTables) result[table] = (await q(`SELECT * FROM public.${table} ORDER BY id`)).rows;
  return result;
}
async function actor(who, role = 'authenticated') {
  assert.ok(['authenticated', 'anon', 'service_role'].includes(role));
  await db.exec(`SET LOCAL ROLE ${role}`);
  await q("SELECT set_config('request.jwt.claim.sub', $1, true)", [who ? ids[who] : '']);
}
async function denied(sql, code = '42501') {
  await db.exec('SAVEPOINT expected_error');
  try {
    await assert.rejects(db.exec(sql), (error) => {
      assert.equal(error.code, code, error.message);
      return true;
    });
  } finally {
    await db.exec('ROLLBACK TO SAVEPOINT expected_error; RELEASE SAVEPOINT expected_error');
  }
}
function check(name, fn) {
  return test(name, async () => {
    await db.exec('BEGIN');
    try { await fn(); } finally { await db.exec('ROLLBACK'); }
  });
}
const newSolutionSql = (problemId, authorId = ids.contributor) => `
  INSERT INTO public.community_solutions(problem_id,author_id,diagnosis,steps,reasoning,verification_method)
  VALUES ('${problemId}','${authorId}','Routing mismatch',ARRAY['Check the route'],'Route points to wrong host','Repeat the request')
  RETURNING id`;

await test('replays all historical migrations and Stage 2 without modifying legacy records', async () => {
  await db.exec(await read(new URL('bootstrap.sql', import.meta.url)));
  const files = (await readdir(migrations)).filter((f) => f.endsWith('.sql')).sort();
  const legacy = files.filter((f) => f < '20260925180000');
  for (const file of legacy) await db.exec(await read(new URL(file, migrations)));
  for (const [name, id] of Object.entries(ids)) {
    await q('INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ($1,$2,$3)',
      [id, `${name}@example.invalid`, JSON.stringify({ username: name, user_type: 'builder' })]);
  }
  await q('DELETE FROM public.profiles WHERE user_id = $1', [ids.newUser]);
  await q(`INSERT INTO public.problems(id,title,description,category,author_id)
    VALUES ('10000000-0000-0000-0000-000000000001','Legacy case','Keep this record','DevOps',$1)`, [ids.author]);
  await q(`INSERT INTO public.proposals(problem_id,title,description,builder_id)
    VALUES ('10000000-0000-0000-0000-000000000001','Legacy proposal','Keep this too',$1)`, [ids.contributor]);
  const before = await legacySnapshot();
  for (const file of files.filter((f) => !legacy.includes(f))) await db.exec(await read(new URL(file, migrations)));
  assert.deepEqual(await legacySnapshot(), before);
  assert.equal((await one('SELECT count(*)::int AS n FROM community_domains')).n, 2);
  assert.equal((await one('SELECT count(*)::int AS n FROM community_categories')).n, 6);
  console.log(`Replayed ${files.length} migrations; legacy rows unchanged`);

  category = (await one("SELECT id FROM community_categories WHERE slug = 'cloud-platforms'")).id;
  async function problem(author, visibility) {
    return (await one(`INSERT INTO community_problems(author_id,category_id,title,symptom,environment,
      expected_behavior,actual_behavior,visibility) VALUES ($1,$2,'Failed deployment','Gateway timeout',
      '{"platform":"Azure","version":"test"}','Healthy endpoint','Timeout',$3) RETURNING id`,
    [ids[author], category, visibility])).id;
  }
  publicProblem = await problem('author', 'public');
  draftProblem = await problem('author', 'draft');
  otherProblem = await problem('outsider', 'public');
  solution = (await one(newSolutionSql(publicProblem))).id;
  otherSolution = (await one(newSolutionSql(otherProblem))).id;
  comment = (await one(`INSERT INTO community_comments(solution_id,author_id,body)
    VALUES ($1,$2,'Which version did you test?') RETURNING id`, [solution, ids.author])).id;
  report = (await one(`INSERT INTO community_reports(reporter_id,solution_id,reason,details)
    VALUES ($1,$2,'Unsafe instructions','Private report details') RETURNING id`, [ids.outsider, solution])).id;
  await q('INSERT INTO community_moderators(user_id) VALUES ($1)', [ids.moderator]);
  await q(`INSERT INTO community_report_reviews(report_id,moderator_id,status,private_notes)
    VALUES ($1,$2,'reviewing','Private moderation notes')`, [report, ids.moderator]);
});

await check('all new tables enforce RLS and expose no anonymous writes or client truncation', async () => {
  const tables = (await q("SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relname LIKE 'community_%'")).rows;
  assert.ok(tables.length >= 10);
  for (const { relname, relrowsecurity } of tables) {
    assert.equal(relrowsecurity, true, relname);
    const grants = await one(`SELECT has_table_privilege('anon',$1,'INSERT,UPDATE,DELETE,TRUNCATE') AS writes,
      has_table_privilege('authenticated',$1,'TRUNCATE') AS truncate`, [`public.${relname}`]);
    assert.equal(grants.writes, false, relname);
    assert.equal(grants.truncate, false, relname);
  }
});

await check('anonymous visitors read only published problems and their solutions/comments', async () => {
  await actor(null, 'anon');
  assert.equal((await one('SELECT count(*)::int n FROM community_problems')).n, 2);
  assert.equal((await one('SELECT count(*)::int n FROM community_solutions')).n, 2);
  assert.equal((await one('SELECT count(*)::int n FROM community_comments')).n, 1);
  assert.equal((await q('SELECT id FROM community_problems WHERE id=$1', [draftProblem])).rows.length, 0);
  await denied(`INSERT INTO community_problems(category_id,title) VALUES ('${category}','Anonymous')`);
  await denied(`SELECT * FROM community_reports`);
  await denied(`SELECT community_accept_solution('${publicProblem}','${solution}','Worked','Verified')`);
});

await check('drafts are readable only by the author, including when a moderator asks', async () => {
  for (const who of ['author', 'contributor', 'outsider', 'moderator']) {
    await actor(who);
    const rows = (await q('SELECT id FROM community_problems WHERE id=$1', [draftProblem])).rows;
    assert.equal(rows.length, who === 'author' ? 1 : 0, who);
  }
});

await check('unpublishing hides child content from contributors, voters and anonymous visitors', async () => {
  await actor('outsider');
  await q('INSERT INTO community_solution_votes(solution_id) VALUES ($1)', [solution]);
  await actor('author');
  await q("UPDATE community_problems SET visibility='draft' WHERE id=$1", [publicProblem]);
  for (const who of ['contributor', 'outsider', null]) {
    await actor(who, who ? 'authenticated' : 'anon');
    assert.equal((await q('SELECT id FROM community_solutions WHERE id=$1', [solution])).rows.length, 0);
    assert.equal((await q('SELECT id FROM community_comments WHERE id=$1', [comment])).rows.length, 0);
  }
  await actor('author');
  assert.equal((await q('SELECT id FROM community_solutions WHERE id=$1', [solution])).rows.length, 1);
});

await check('authors create incomplete private drafts and edit only their own problems', async () => {
  await actor('author');
  const draft = await one(`INSERT INTO community_problems(category_id,title) VALUES ($1,'Private symptom') RETURNING *`, [category]);
  assert.equal(draft.author_id, ids.author);
  assert.equal(draft.visibility, 'draft');
  await denied(`UPDATE community_problems SET visibility='public' WHERE id='${draft.id}'`, '23514');
  assert.equal((await q("UPDATE community_problems SET title='My edit' WHERE id=$1 RETURNING id", [publicProblem])).rows.length, 1);
  assert.equal((await q("UPDATE community_problems SET title='Forged' WHERE id=$1 RETURNING id", [otherProblem])).rows.length, 0);
  await denied(`UPDATE community_problems SET author_id='${ids.outsider}' WHERE id='${publicProblem}'`);
  await denied(`INSERT INTO community_problems(author_id,category_id,title) VALUES ('${ids.outsider}','${category}','Forged')`);
  await denied(`INSERT INTO community_problems(category_id,title,state) VALUES ('${category}','Forged','solved')`);
});

await check('contributors propose to open/testing public problems, never drafts/closed/self-owned cases', async () => {
  await actor('contributor');
  assert.ok((await one(newSolutionSql(publicProblem))).id);
  await denied(newSolutionSql(draftProblem));
  await denied(newSolutionSql(publicProblem, ids.outsider));
  await actor('author');
  await denied(newSolutionSql(publicProblem, ids.author));
  await q('SELECT community_set_problem_state($1,$2)', [publicProblem, 'testing']);
  await actor('contributor');
  assert.ok((await one(newSolutionSql(publicProblem))).id);
  await actor('author');
  await q('SELECT community_set_problem_state($1,$2)', [publicProblem, 'closed']);
  await actor('contributor');
  await denied(newSolutionSql(publicProblem));
});

await check('solution authors edit only their own content and cannot move it or forge identity', async () => {
  await actor('contributor');
  assert.equal((await q("UPDATE community_solutions SET diagnosis='Corrected diagnosis' WHERE id=$1 RETURNING id", [solution])).rows.length, 1);
  await denied(`UPDATE community_solutions SET problem_id='${otherProblem}' WHERE id='${solution}'`);
  await denied(`UPDATE community_solutions SET author_id='${ids.author}' WHERE id='${solution}'`);
  await actor('author');
  assert.equal((await q("UPDATE community_solutions SET diagnosis='Hijacked' WHERE id=$1 RETURNING id", [solution])).rows.length, 0);
  await denied(`DELETE FROM community_solutions WHERE id='${solution}'`);
});

await check('clarifications and structured test results preserve authorship', async () => {
  await actor('outsider');
  const c = await one(`INSERT INTO community_comments(solution_id,body) VALUES ($1,'Clarify the environment') RETURNING id`, [solution]);
  assert.equal((await q("UPDATE community_comments SET body='Updated question' WHERE id=$1 RETURNING id", [c.id])).rows.length, 1);
  assert.equal((await q("UPDATE community_comments SET body='Hijacked' WHERE id=$1 RETURNING id", [comment])).rows.length, 0);
  await denied(`UPDATE community_comments SET solution_id='${otherSolution}' WHERE id='${c.id}'`);
  await denied(`INSERT INTO community_comments(solution_id,body,kind) VALUES ('${solution}','Tested','test_result')`, '23514');
  await actor('author');
  const result = await one(`INSERT INTO community_comments(solution_id,body,kind,attempted_test,observation,verification_method)
    VALUES ($1,'Test result','test_result','Restarted service','Health check succeeded','Repeated 3 times') RETURNING id`, [solution]);
  assert.ok(result.id);
  await q("UPDATE community_problems SET visibility='draft' WHERE id=$1", [publicProblem]);
  await actor('outsider');
  await denied(`INSERT INTO community_comments(solution_id,body) VALUES ('${solution}','Hidden parent')`);
});

await check('votes are unique, cannot target self, cannot forge voters, and can be withdrawn only by owner', async () => {
  await actor('contributor');
  await denied(`INSERT INTO community_solution_votes(solution_id) VALUES ('${solution}')`);
  await actor('outsider');
  await q('INSERT INTO community_solution_votes(solution_id) VALUES ($1)', [solution]);
  await denied(`INSERT INTO community_solution_votes(solution_id) VALUES ('${solution}')`, '23505');
  await denied(`INSERT INTO community_solution_votes(solution_id,voter_id) VALUES ('${otherSolution}','${ids.author}')`);
  await actor('author');
  assert.equal((await q('DELETE FROM community_solution_votes WHERE solution_id=$1 RETURNING solution_id', [solution])).rows.length, 0);
  await actor('outsider');
  assert.equal((await q('DELETE FROM community_solution_votes WHERE solution_id=$1 RETURNING solution_id', [solution])).rows.length, 1);
  await denied(`UPDATE community_solution_votes SET voter_id='${ids.author}'`);
});

await check('votes cannot be added to hidden or closed cases', async () => {
  await actor('author');
  await q("UPDATE community_problems SET visibility='draft' WHERE id=$1", [publicProblem]);
  await actor('outsider');
  await denied(`INSERT INTO community_solution_votes(solution_id) VALUES ('${solution}')`);
  await actor('author');
  await q("UPDATE community_problems SET visibility='public' WHERE id=$1", [publicProblem]);
  await q('SELECT community_set_problem_state($1,$2)', [publicProblem, 'closed']);
  await actor('outsider');
  await denied(`INSERT INTO community_solution_votes(solution_id) VALUES ('${solution}')`);
});

await check('only the author can transition or accept; direct status/acceptance writes are denied', async () => {
  await actor('outsider');
  await denied(`SELECT community_set_problem_state('${publicProblem}','testing')`);
  await denied(`SELECT community_accept_solution('${publicProblem}','${solution}','Worked','Repeated')`);
  await actor('contributor');
  await denied(`SELECT community_accept_solution('${publicProblem}','${solution}','Worked','Repeated')`);
  await actor('author');
  await denied(`UPDATE community_problems SET state='solved',accepted_solution_id='${solution}' WHERE id='${publicProblem}'`);
  await denied(`UPDATE community_problems SET solved_at=now() WHERE id='${publicProblem}'`);
  await denied(`SELECT community_set_problem_state('${publicProblem}','solved')`, '23514');
  await denied(`SELECT community_set_problem_state('${draftProblem}','testing')`, '23514');
  await denied(`SELECT community_accept_solution('${publicProblem}','${solution}','Worked','Repeated')`, '23514');
});

await check('author completes Testing to Solved once, with matching solution and test evidence', async () => {
  await actor('author');
  await q('SELECT community_set_problem_state($1,$2)', [publicProblem, 'testing']);
  await denied(`SELECT community_accept_solution('${publicProblem}','${otherSolution}','Worked','Repeated')`, '23514');
  await denied(`SELECT community_accept_solution('${publicProblem}','${solution}',' ','Repeated')`, '23514');
  await denied(`SELECT community_accept_solution('${publicProblem}','${solution}','Worked',NULL)`, '23514');
  const p = await one('SELECT * FROM community_accept_solution($1,$2,$3,$4)', [publicProblem, solution, 'Endpoint returned 200', 'Three independent requests']);
  assert.equal(p.state, 'solved');
  assert.equal(p.accepted_solution_id, solution);
  assert.equal(p.resolution_observation, 'Endpoint returned 200');
  assert.ok(p.solved_at);
  await denied(`SELECT community_accept_solution('${publicProblem}','${solution}','Again','Again')`, '23514');
  await denied(`SELECT community_set_problem_state('${publicProblem}','open')`, '23514');
  assert.equal((await q("UPDATE community_problems SET title='Changed evidence' WHERE id=$1 RETURNING id", [publicProblem])).rows.length, 0);
  await actor('contributor');
  assert.equal((await q("UPDATE community_solutions SET diagnosis='Changed evidence' WHERE id=$1 RETURNING id", [solution])).rows.length, 0);
  await denied(newSolutionSql(publicProblem));
  await actor(null, 'anon');
  assert.equal((await one('SELECT state FROM community_problems WHERE id=$1', [publicProblem])).state, 'solved');
});

await check('database constraints independently reject cross-problem acceptance and missing evidence', async () => {
  await denied(`UPDATE community_problems SET state='solved', accepted_solution_id='${otherSolution}',
    resolution_observation='Worked', resolution_verification='Repeated', solved_at=now() WHERE id='${publicProblem}'`, '23503');
  await denied(`UPDATE community_problems SET state='solved',accepted_solution_id='${solution}' WHERE id='${publicProblem}'`, '23514');
});

await check('reports are private to reporter/moderators; internal notes remain moderator-only', async () => {
  await actor('outsider');
  assert.equal((await q('SELECT id FROM community_reports')).rows.length, 1);
  assert.equal((await q('SELECT * FROM community_report_reviews')).rows.length, 0);
  await denied(`INSERT INTO community_report_reviews(report_id,status) VALUES ('${report}','actioned')`);
  await denied(`UPDATE community_reports SET details='Overwrite' WHERE id='${report}'`);
  await denied(`INSERT INTO community_moderators(user_id) VALUES ('${ids.outsider}')`);
  for (const who of ['author', 'contributor']) {
    await actor(who);
    assert.equal((await q('SELECT id FROM community_reports')).rows.length, 0);
    assert.equal((await q('SELECT * FROM community_report_reviews')).rows.length, 0);
  }
  await actor('moderator');
  assert.equal((await q('SELECT id FROM community_reports')).rows.length, 1);
  assert.equal((await q('SELECT * FROM community_report_reviews')).rows.length, 1);
  assert.equal((await q("UPDATE community_report_reviews SET status='dismissed' WHERE report_id=$1 RETURNING report_id", [report])).rows.length, 1);
});

await check('reports require one visible public target and cannot impersonate another reporter', async () => {
  await actor('outsider');
  await denied(`INSERT INTO community_reports(problem_id,reason) VALUES ('${draftProblem}','Guessing a draft')`);
  await denied(`INSERT INTO community_reports(problem_id,reporter_id,reason) VALUES ('${publicProblem}','${ids.author}','Forged')`);
  await denied(`INSERT INTO community_reports(problem_id,solution_id,reason) VALUES ('${publicProblem}','${solution}','Two targets')`, '23514');
  const r = await one(`INSERT INTO community_reports(comment_id,reason) VALUES ($1,'Unsafe advice') RETURNING reporter_id`, [comment]);
  assert.equal(r.reporter_id, ids.outsider);
});

await check('reputation is trusted append-only; users cannot award themselves points or alter legacy totals', async () => {
  const event = `INSERT INTO community_reputation_events(user_id,category_id,solution_id,event_key,reason,points)
    VALUES ('${ids.contributor}','${category}','${solution}','test-event','Trusted test fixture',10)`;
  await actor('contributor');
  await denied(event);
  await denied('UPDATE community_reputation_events SET points=999');
  await denied('DELETE FROM community_reputation_events');
  await denied(`UPDATE profiles SET reputation_score=999 WHERE user_id='${ids.contributor}'`);
  assert.equal((await q("UPDATE profiles SET bio='Profile edit still works' WHERE user_id=$1 RETURNING user_id", [ids.contributor])).rows.length, 1);
  await actor('newUser');
  await denied(`INSERT INTO profiles(id,user_id,username,user_type,reputation_score)
    VALUES ('${ids.newUser}','${ids.newUser}','fresh-user','builder',999)`);
  await actor(null, 'service_role');
  await db.exec(event);
  await denied(event, '23505');
  await denied('UPDATE community_reputation_events SET points=20');
  await denied('DELETE FROM community_reputation_events');
  await actor('outsider');
  assert.equal((await q('SELECT * FROM community_reputation_events')).rows.length, 0);
  await actor('contributor');
  assert.equal((await one('SELECT points FROM community_reputation_events')).points, 10);
});

await check('anonymous and unauthenticated RPC calls fail closed', async () => {
  await actor(null, 'anon');
  await denied(`SELECT community_set_problem_state('${publicProblem}','testing')`);
  await actor(null);
  await denied(`SELECT community_set_problem_state('${publicProblem}','testing')`);
  await denied(`SELECT community_accept_solution('${publicProblem}','${solution}','Worked','Repeated')`);
});

await check('structured tests and solution steps reject malformed or empty evidence', async () => {
  await actor('author');
  await denied(`UPDATE community_problems SET attempted_tests='{}' WHERE id='${publicProblem}'`, '23514');
  await denied(`UPDATE community_problems SET attempted_tests='[{"test":"Restart"}]' WHERE id='${publicProblem}'`, '23514');
  await denied(`UPDATE community_problems SET attempted_tests='[{"test":"Restart","observation":true}]' WHERE id='${publicProblem}'`, '23514');
  assert.equal((await q(`UPDATE community_problems SET attempted_tests=$1 WHERE id=$2 RETURNING id`,
    [JSON.stringify([{ test: 'Restart service', observation: 'Still fails', verification_method: 'Health probe' }]), publicProblem])).rows.length, 1);
  await actor('contributor');
  await denied(`UPDATE community_solutions SET steps=ARRAY['  '] WHERE id='${solution}'`, '23514');
  await denied(`UPDATE community_solutions SET steps=ARRAY[NULL]::text[] WHERE id='${solution}'`, '23514');
});


await check('discovery searches public symptoms, products and tags while excluding owner drafts', async () => {
  await q("UPDATE community_problems SET product='ExampleRouter',tags=ARRAY['routing'] WHERE id=$1",[publicProblem]);
  await q("UPDATE community_problems SET title='PrivateNeedle',product='HiddenDevice',tags=ARRAY['hidden-tag'] WHERE id=$1",[draftProblem]);
  await actor(null,'anon');
  for(const query of ['gateway timeout','ExampleRouter','routing']) assert.ok((await q('SELECT id FROM community_search($1)',[query])).rows.some(p=>p.id===publicProblem));
  for(const who of [null,'author']) {
    await actor(who,who ? 'authenticated' : 'anon');
    for(const query of ['PrivateNeedle','HiddenDevice','hidden-tag']) assert.equal((await q('SELECT id FROM community_search($1)',[query])).rows.length,0);
    assert.equal((await q("SELECT id FROM community_search(p_tag=>'hidden-tag')")).rows.length,0);
  }
  assert.equal((await q("SELECT id FROM community_search(p_domain=>'professional-av')")).rows.length,0);
  assert.ok((await q("SELECT id FROM community_search(p_domain=>'cloud-devops',p_category=>'cloud-platforms',p_state=>'open',p_tag=>'routing')")).rows.some(p=>p.id===publicProblem));
  assert.equal((await q("SELECT id FROM community_search(p_state=>'solved')")).rows.length,0);
  await q('SELECT community_set_problem_state($1,$2)',[publicProblem,'testing']);
  await q('SELECT community_accept_solution($1,$2,$3,$4)',[publicProblem,solution,'Recovered','Repeated test']);
  assert.equal((await q("SELECT id FROM community_search(p_state=>'solved')")).rows[0].id,publicProblem);
});
await check('vote aggregate reveals counts only and hides unpublished content even from its owner', async () => {
  await actor('outsider');
  await q('INSERT INTO community_solution_votes(solution_id) VALUES ($1)',[solution]);
  await actor(null,'anon');
  const row=(await q('SELECT * FROM community_solution_vote_counts($1)',[publicProblem])).rows[0];
  assert.deepEqual(Object.keys(row).sort(),['solution_id','upvotes']); assert.equal(Number(row.upvotes),1);
  await actor('author'); await q("UPDATE community_problems SET visibility='draft' WHERE id=$1",[publicProblem]);
  for(const who of [null,'author','outsider']) {
    await actor(who,who ? 'authenticated' : 'anon');
    assert.equal((await q('SELECT * FROM community_solution_vote_counts($1)',[publicProblem])).rows.length,0);
  }
});
await check('discovery pagination is bounded and stable', async () => {
  for(let i=0;i<25;i++) await q(`INSERT INTO community_problems(author_id,category_id,title,symptom,environment,expected_behavior,actual_behavior,visibility)
    VALUES ($1,$2,$3,'pagination-token','{"setup":"synthetic"}','working','failure','public')`,[ids.author,category,`Page fixture ${i}`]);
  await actor(null,'anon');
  const first=(await q("SELECT id FROM community_search(p_query=>'pagination-token')")).rows;
  const next=(await q("SELECT id FROM community_search(p_query=>'pagination-token',p_offset=>20)")).rows;
  assert.equal(first.length,21); assert.equal(next.length,5);
  assert.equal(new Set([...first.slice(0,20),...next].map(p=>p.id)).size,25);
  assert.deepEqual((await q("SELECT id FROM community_search(p_query=>'pagination-token')")).rows,first);
});
await check('trusted vote events compensate removal and cannot inflate by duplicate/repeated voting',async()=>{
 await actor('outsider');
 await q('INSERT INTO community_solution_votes(solution_id) VALUES($1)',[solution]);
 await denied(`INSERT INTO community_solution_votes(solution_id) VALUES('${solution}')`,'23505');
 await actor('contributor');
 assert.equal(Number((await one('SELECT sum(points) n FROM community_reputation_events')).n),2);
 await actor('outsider');await q('DELETE FROM community_solution_votes WHERE solution_id=$1',[solution]);
 await actor('contributor');assert.equal(Number((await one('SELECT sum(points) n FROM community_reputation_events')).n),0);
 await actor('outsider');await q('INSERT INTO community_solution_votes(solution_id) VALUES($1)',[solution]);
 await actor('contributor');assert.equal(Number((await one('SELECT sum(points) n FROM community_reputation_events')).n),2);
 await denied(`UPDATE community_reputation_events SET points=999`);
});
await check('acceptance reversal requires author and reason, retains evidence, reverses points once and permits retest',async()=>{
 await actor('author');await q('SELECT community_set_problem_state($1,$2)',[publicProblem,'testing']);
 await q('SELECT community_accept_solution($1,$2,$3,$4)',[publicProblem,solution,'Worked','Retested']);
 await actor('contributor');assert.equal(Number((await one('SELECT sum(points) n FROM community_reputation_events')).n),10);
 await denied(`SELECT community_reverse_acceptance('${publicProblem}','Forgery')`);
 await actor('author');await denied(`SELECT community_reverse_acceptance('${publicProblem}','')`,'23514');
 await q('SELECT community_reverse_acceptance($1,$2)',[publicProblem,'Regression after longer test']);
 assert.equal((await one('SELECT state FROM community_problems WHERE id=$1',[publicProblem])).state,'testing');
 assert.equal((await one("SELECT observation FROM community_acceptance_history WHERE action='reversed'")).observation,'Worked');
 await denied(`SELECT community_reverse_acceptance('${publicProblem}','Again')`,'23514');
 await actor('contributor');assert.equal(Number((await one('SELECT sum(points) n FROM community_reputation_events')).n),0);
 await actor('author');await q('SELECT community_accept_solution($1,$2,$3,$4)',[publicProblem,solution,'Fixed regression','Longer test']);
 await actor('contributor');assert.equal(Number((await one('SELECT sum(points) n FROM community_reputation_events')).n),10);
 await actor(null,'anon');assert.equal(Number((await one('SELECT points FROM community_reputation($1)',[ids.contributor])).points),10);
});
await check('fictional examples earn no points and hidden content contributes no public reputation',async()=>{
 await q('UPDATE community_problems SET is_example=true WHERE id=$1',[publicProblem]);
 await actor('outsider');await q('INSERT INTO community_solution_votes(solution_id) VALUES($1)',[solution]);
 await actor('author');await q('SELECT community_set_problem_state($1,$2)',[publicProblem,'testing']);
 await q('SELECT community_accept_solution($1,$2,$3,$4)',[publicProblem,solution,'Simulated','Example']);
 await actor('contributor');assert.equal((await q('SELECT * FROM community_reputation_events')).rows.length,0);
 await actor('outsider');await q('INSERT INTO community_solution_votes(solution_id) VALUES($1)',[otherSolution]);
 await q("UPDATE community_problems SET visibility='draft' WHERE id=$1",[otherProblem]);
 await actor(null,'anon');assert.equal((await q('SELECT * FROM community_reputation(NULL)')).rows.length,0);
});
await check('moderator hide/restore protects public discovery and does not expose drafts or private reviews',async()=>{
 await actor('outsider');await denied(`SELECT community_moderate_report('${report}','actioned','No authority','hide')`);
 await actor('moderator');await q('SELECT community_moderate_report($1,$2,$3,$4)',[report,'actioned','Synthetic safety review','hide']);
 await actor(null,'anon');assert.equal((await q('SELECT id FROM community_problems WHERE id=$1',[publicProblem])).rows.length,0);
 assert.equal((await q('SELECT id FROM community_solutions WHERE problem_id=$1',[publicProblem])).rows.length,0);
 assert.equal((await q('SELECT * FROM community_solution_vote_counts($1)',[publicProblem])).rows.length,0);
 assert.ok(!(await q('SELECT id FROM community_search()')).rows.some(p=>p.id===publicProblem));
 await actor('outsider');assert.equal((await q('SELECT * FROM community_report_reviews')).rows.length,0);
 await actor('moderator');assert.equal((await q('SELECT * FROM community_moderation_events')).rows.length,1);
 await q('SELECT community_moderate_report($1,$2,$3,$4)',[report,'dismissed','Restored after review','restore']);
 await actor('author');await q("UPDATE community_problems SET visibility='draft' WHERE id=$1",[publicProblem]);
 await actor('moderator');await denied(`SELECT community_moderate_report('${report}','actioned','Cannot publish draft','restore')`);
 assert.equal((await q('SELECT id FROM community_problems WHERE id=$1',[publicProblem])).rows.length,0);
});
await check('server rate limits cannot be bypassed by direct inserts or client counter edits',async()=>{
 await actor('outsider');
 for(let i=0;i<10;i++) await q('INSERT INTO community_reports(problem_id,reason) VALUES($1,$2)',[publicProblem,'Synthetic report']);
 await denied(`INSERT INTO community_reports(problem_id,reason) VALUES('${publicProblem}','One too many')`,'P0001');
 await denied('UPDATE community_write_limits SET hits=0');
});
await check('avatar storage rejects anonymous, foreign folder and active SVG uploads',async()=>{
 await db.exec('GRANT USAGE ON SCHEMA storage TO anon,authenticated; GRANT SELECT,INSERT ON storage.objects TO anon,authenticated');
 await actor(null,'anon');await denied("INSERT INTO storage.objects(bucket_id,name) VALUES('avatars','anonymous/test.png')");
 await actor('author');await q("INSERT INTO storage.objects(bucket_id,name) VALUES('avatars',$1)",[ids.author+'/test.png']);
 await denied(`INSERT INTO storage.objects(bucket_id,name) VALUES('avatars','${ids.contributor}/test.png')`);
 await denied(`INSERT INTO storage.objects(bucket_id,name) VALUES('avatars','${ids.author}/test.svg')`);
});
await check('unsafe legacy helpers deny browser abuse while preserving own-account access',async()=>{
 await actor('author');

 await denied(`SELECT increment_problem_upvotes('${publicProblem}')`);
 await denied(`SELECT get_primary_wallet('${ids.contributor}','solana')`);
 assert.equal((await q('SELECT id FROM community_problems WHERE id=$1',[publicProblem])).rows.length,1);
});
await check('community profiles are private by default, opt in to public fields, and only owners edit',async()=>{
 await actor('author');await q("INSERT INTO community_profiles(display_name,bio,expertise) VALUES('Example author','Fictional bio',ARRAY['Cloud'])");
 await denied(`INSERT INTO community_profiles(user_id) VALUES('${ids.contributor}')`);
 await denied(`UPDATE community_profiles SET user_id='${ids.outsider}'`);
 await denied(`UPDATE community_profiles SET avatar_path='${ids.contributor}/abc.webp'`,'23514');
 await actor('contributor');assert.equal((await q('SELECT * FROM community_profiles')).rows.length,0);
 assert.equal((await q("UPDATE community_profiles SET display_name='Forged' RETURNING user_id")).rows.length,0);
 await actor(null,'anon');assert.equal((await q('SELECT * FROM community_profiles')).rows.length,0);
 await actor('author');await q('UPDATE community_profiles SET is_public=true');
 await actor(null,'anon');const p=await one('SELECT * FROM community_profiles');assert.equal(p.display_name,'Example author');assert.equal(p.email,undefined);
 await denied("UPDATE community_profiles SET display_name='Forged'");
 await actor('contributor');assert.equal((await q("UPDATE community_profiles SET bio='Forged' RETURNING user_id")).rows.length,0);
 await actor('author');await q('UPDATE community_profiles SET is_public=false');
 await actor(null,'anon');assert.equal((await q('SELECT * FROM community_profiles')).rows.length,0);
});
await check('contribution lists and counts enforce draft privacy even with forged public flags',async()=>{
 await actor('author');let rows=(await q("SELECT * FROM community_contributions($1,'problems','draft',0,false)",[ids.author])).rows;
 assert.equal(rows.length,1);assert.equal(rows[0].id,draftProblem);
 assert.equal(Number((await one('SELECT * FROM community_contribution_counts($1,false)',[ids.author])).problems),2);
 assert.equal((await q("SELECT * FROM community_contributions($1,'problems','draft',0,true)",[ids.author])).rows.length,0);
 await actor('contributor');assert.equal((await q("SELECT * FROM community_contributions($1,'problems','draft',0,false)",[ids.author])).rows.length,0);
 await actor(null,'anon');assert.equal(Number((await one('SELECT * FROM community_contribution_counts($1,false)',[ids.author])).problems),1);
 await actor('author');await q('SELECT community_set_problem_state($1,$2)',[publicProblem,'testing']);await q('SELECT community_accept_solution($1,$2,$3,$4)',[publicProblem,solution,'Fictional result','Synthetic check']);
 await actor('contributor');rows=(await q("SELECT * FROM community_contributions($1,'accepted','',0,false)",[ids.contributor])).rows;assert.equal(rows.length,1);assert.equal(rows[0].id,solution);assert.equal(rows[0].accepted,true);
 await actor('moderator');await q('SELECT community_moderate_report($1,$2,$3,$4)',[report,'actioned','Synthetic hide test','hide']);
 await actor('contributor');assert.equal((await q("SELECT * FROM community_contributions($1,'accepted','',0,false)",[ids.contributor])).rows.length,0);
});
await check('private avatar storage limits read/write/delete to owner or chosen public image',async()=>{
 await db.exec('GRANT USAGE ON SCHEMA storage TO anon,authenticated; GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO anon,authenticated');
 const path=ids.author+'/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.webp';
 await actor('author');await q("INSERT INTO community_profiles(avatar_path) VALUES($1)",[path]);
 await q("INSERT INTO storage.objects(bucket_id,name) VALUES('community-avatars',$1)",[path]);
 await denied(`INSERT INTO storage.objects(bucket_id,name) VALUES('community-avatars','${ids.contributor}/abc.webp')`);
 await denied(`INSERT INTO storage.objects(bucket_id,name) VALUES('community-avatars','${ids.author}/evil.svg')`);
 await actor('contributor');assert.equal((await q("SELECT * FROM storage.objects WHERE bucket_id='community-avatars'")).rows.length,0);
 assert.equal((await q("DELETE FROM storage.objects WHERE bucket_id='community-avatars' RETURNING id")).rows.length,0);
 await actor('author');await q('UPDATE community_profiles SET is_public=true');
 await actor(null,'anon');assert.equal((await q("SELECT * FROM storage.objects WHERE bucket_id='community-avatars'")).rows.length,1);
 await denied(`INSERT INTO storage.objects(bucket_id,name) VALUES('community-avatars','${path}')`);
 await actor('contributor');assert.equal((await q("DELETE FROM storage.objects WHERE bucket_id='community-avatars' RETURNING id")).rows.length,0);
 await actor('author');assert.equal((await q("UPDATE storage.objects SET name='changed' WHERE bucket_id='community-avatars' RETURNING id")).rows.length,0);
 await q('UPDATE community_profiles SET avatar_path=null');
 await actor(null,'anon');assert.equal((await q("SELECT * FROM storage.objects WHERE bucket_id='community-avatars'")).rows.length,0);
 await actor('author');assert.equal((await q("DELETE FROM storage.objects WHERE bucket_id='community-avatars' RETURNING id")).rows.length,1);
});
await db.close();
