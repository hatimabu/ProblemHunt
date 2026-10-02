// Isolated Docker lab only. Stop the regular worker before running this drill.
import pg from 'pg';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { databaseConfig } from '../src/config.mjs';
import { runOnce } from '../src/worker.mjs';
import { createTelemetry } from '../src/telemetry.mjs';
const admin = new pg.Client(await databaseConfig(process.env, true));
const worker = new pg.Client(await databaseConfig({...process.env, PGUSER:'notification_worker_login', PGPASSWORD_FILE:'/run/secrets/worker_password'}));
const records = [], telemetry = createTelemetry(line => records.push(JSON.parse(line)));
const first = async (sql, args=[]) => (await admin.query(sql,args)).rows[0];
const stats = async () => (await worker.query('SELECT * FROM community_notification_stats()')).rows[0];
async function cycle() {const start=performance.now();const outcome=await runOnce(worker,{telemetry});telemetry.observe(outcome,(performance.now()-start)/1000);return outcome;}
try {
  await admin.connect(); await worker.connect();
  const baseline=await stats();
  assert.equal(Number(baseline.ready)+Number(baseline.processing)+Number(baseline.undispatched),0,'Drain prior pending lab work first');
  const author=randomUUID(), contributor=randomUUID();
  for(const id of [author,contributor])await admin.query('INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,$3)',[id,`${id}@example.invalid`,JSON.stringify({username:`obs_${id.slice(0,12).replaceAll('-','')}`,user_type:'builder'})]);
  const category=(await first('SELECT id FROM community_categories LIMIT 1')).id;
  const problem=(await first(`INSERT INTO community_problems(author_id,category_id,title,symptom,environment,expected_behavior,actual_behavior,visibility,is_example) VALUES($1,$2,'Local observability drill','Retry','{"description":"local"}','One delivery','Invalid version','public',true) RETURNING id`,[author,category])).id;
  await admin.query('INSERT INTO community_discussion_follows(user_id,problem_id) VALUES($1,$2)',[author,problem]);
  const solution=(await first("INSERT INTO community_solutions(problem_id,author_id,diagnosis,steps,reasoning,verification_method) VALUES($1,$2,'Drill',ARRAY['Observe'],'Test','Count') RETURNING id",[problem,contributor])).id;
  const event=(await first('SELECT id FROM community_notification_outbox WHERE solution_id=$1',[solution])).id;
  await admin.query('UPDATE community_notification_outbox SET version=99 WHERE id=$1',[event]);
  for(let attempt=1;attempt<=5;attempt++) {
    assert.equal(await cycle(),attempt === 5 ? 'failed' : 'retry');
    // Advance local retry availability instead of waiting; production code/backoff is unchanged.
    await admin.query("UPDATE community_notification_queue SET available_at=clock_timestamp() WHERE event_id=$1 AND status='ready'",[event]);
  }
  const failed=await stats();assert.equal(Number(failed.failed),Number(baseline.failed)+1);telemetry.snapshot(failed);
  assert.equal((await first('SELECT status FROM community_notification_queue WHERE event_id=$1',[event])).status,'failed');
  await assert.rejects(worker.query('SELECT community_requeue_notification($1)',[event]),e=>e.code==='42501');
  await admin.query('UPDATE community_notification_outbox SET version=1 WHERE id=$1',[event]);
  assert.equal((await first('SELECT community_requeue_notification($1) ok',[event])).ok,true);
  assert.equal(await cycle(),'delivered');
  telemetry.snapshot(await stats());
  assert.equal(Number((await stats()).failed),Number(baseline.failed));
  assert.equal((await first('SELECT count(*)::int n FROM notifications WHERE community_event_id=$1',[event])).n,1);
  const correlated=records.filter(r=>r.correlation_id);
  assert.equal(correlated.length,12);assert.ok(correlated.every(r=>r.correlation_id===event));
  assert.doesNotMatch(JSON.stringify(records),new RegExp(`${author}|${contributor}|${problem}|${solution}`));
  assert.match(telemetry.metrics(true),/notification_cycles_total\{outcome="retry"\} 4/);
  assert.match(telemetry.metrics(true),/notification_cycles_total\{outcome="failed"\} 1/);
  assert.match(telemetry.metrics(true),/notification_cycles_total\{outcome="delivered"\} 1/);
  assert.match(telemetry.metrics(true),/notification_cycle_duration_seconds_count 6/);
  console.log('Observed five correlated failures, failed gauge increment, denied worker replay, operator repair, gauge recovery and exactly one inbox effect.');
  console.log(telemetry.metrics(true));
} finally {await Promise.all([admin.end(),worker.end()]);}
