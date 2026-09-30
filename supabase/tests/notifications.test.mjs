import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runOnce } from '../../services/notifications/src/worker.mjs';
const db = new PGlite(), migrations = new URL('../migrations/', import.meta.url);
const a='00000000-0000-0000-0000-000000000011', b='00000000-0000-0000-0000-000000000012', c='00000000-0000-0000-0000-000000000013';
let problem, category;
const transactionalDb={query:async(sql,params=[])=>{await db.exec('SAVEPOINT worker_statement');try{const result=await db.query(sql,params);await db.exec('RELEASE SAVEPOINT worker_statement');return result;}catch(error){await db.exec('ROLLBACK TO SAVEPOINT worker_statement; RELEASE SAVEPOINT worker_statement');throw error;}}};
const q=(sql,params=[])=>db.query(sql,params), first=async(sql,params)=>(await q(sql,params)).rows[0];
async function root(){await db.exec('RESET ROLE');}
async function actor(id){await db.exec('SET LOCAL ROLE authenticated');await q("SELECT set_config('request.jwt.claim.sub',$1,true)",[id]);}
async function worker(){await db.exec('SET LOCAL ROLE community_notification_worker');}
async function denied(sql){await db.exec('SAVEPOINT denial');try{await assert.rejects(db.exec(sql),e=>e.code==='42501');}finally{await db.exec('ROLLBACK TO SAVEPOINT denial; RELEASE SAVEPOINT denial');}}
async function follow(id=a){await actor(id);await q('INSERT INTO community_discussion_follows(problem_id) VALUES($1)',[problem]);}
async function reply(){await actor(b);return (await first("INSERT INTO community_solutions(problem_id,diagnosis,steps,reasoning,verification_method) VALUES($1,'Route failure',ARRAY['Check target'],'Wrong host','Repeat locally') RETURNING id",[problem])).id;}
async function count(){await root();return Number((await first('SELECT count(*) n FROM notifications WHERE community_event_id IS NOT NULL')).n);}
async function expire(){await root();await q("UPDATE community_notification_queue SET lease_until=clock_timestamp()-interval '1 second' WHERE status='processing'");await worker();}
function check(name,fn){return test(name,async()=>{await db.exec('BEGIN');try{await fn();}finally{await db.exec('ROLLBACK');}});}
await test('notification schema replays in a disposable database',async()=>{
 await db.exec(await readFile(new URL('bootstrap.sql',import.meta.url),'utf8'));
 for(const file of (await readdir(migrations)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(file,migrations),'utf8'));
 for(const [id,name] of [[a,'author'],[b,'replyauthor'],[c,'observer']])await q('INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,$3)',[id,`${name}@example.invalid`,JSON.stringify({username:name,user_type:'builder'})]);
 category=(await first('SELECT id FROM community_categories LIMIT 1')).id;
 problem=(await first(`INSERT INTO community_problems(author_id,category_id,title,symptom,environment,expected_behavior,actual_behavior,visibility) VALUES($1,$2,'Local case','Timeout','{"description":"local"}','Success','Timeout','public') RETURNING id`,[a,category])).id;
});
await check('following is private, opt-in, duplicate-safe and cannot forge recipients or generation',async()=>{
 await follow(); await denied(`INSERT INTO community_discussion_follows(user_id,problem_id) VALUES('${c}','${problem}')`);
 await denied(`INSERT INTO community_discussion_follows(problem_id,generation) VALUES('${problem}',gen_random_uuid())`);
 await actor(c);assert.equal((await q('SELECT * FROM community_discussion_follows')).rows.length,0);
 await reply(); await root();assert.equal((await first('SELECT count(*)::int n FROM community_notification_outbox')).n,1);
 await worker(); assert.equal(await runOnce(transactionalDb),'delivered');assert.equal(await count(),1);
 await actor(a);const n=await first('SELECT * FROM notifications');assert.equal(n.message,'New solution in a discussion you follow.');
 await q('UPDATE notifications SET is_read=true WHERE id=$1',[n.id]);
 await denied(`UPDATE notifications SET message='forged' WHERE id='${n.id}'`);
 await actor(c);assert.equal((await q('SELECT * FROM notifications')).rows.length,0);
});
await check('reply/outbox rollback together; edits and actor self-replies do not notify',async()=>{
 await follow(a);await follow(b);await db.exec('SAVEPOINT reply_tx');const sid=await reply();
 await root();assert.equal((await first('SELECT count(*)::int n FROM community_notification_outbox')).n,1);
 await db.exec('ROLLBACK TO SAVEPOINT reply_tx');await root();assert.equal((await first('SELECT count(*)::int n FROM community_notification_outbox')).n,0);
 const next=await reply();await actor(b);await q("UPDATE community_solutions SET diagnosis='Edited diagnosis' WHERE id=$1",[next]);
 await q("INSERT INTO community_comments(solution_id,body) VALUES($1,'A clarification')",[next]);
 await root();const events=(await q('SELECT * FROM community_notification_outbox')).rows;
 assert.deepEqual(events.map(e=>e.kind).sort(),['comment.created','solution.created']);assert.ok(events.every(e=>e.recipient_id===a&&e.version===1));
 assert.ok(events.every(e=>!('body' in e)&&!('message' in e)));assert.notEqual(sid,next);
});
await check('only visible public problems can be followed, while hidden follows remain removable',async()=>{
 await follow();await root();await q('UPDATE community_problems SET is_hidden=true WHERE id=$1',[problem]);
 await actor(c);await denied(`INSERT INTO community_discussion_follows(problem_id) VALUES('${problem}')`);
 await actor(a);await q('DELETE FROM community_discussion_follows WHERE problem_id=$1',[problem]);
 await root();await q("UPDATE community_problems SET is_hidden=false,visibility='draft' WHERE id=$1",[problem]);
 await actor(a);await denied(`INSERT INTO community_discussion_follows(problem_id) VALUES('${problem}')`);
 const lab=(await first("INSERT INTO community_problems(category_id,title,post_type) VALUES($1,'Local draft lab','lab') RETURNING id",[category])).id;
 await denied(`INSERT INTO community_discussion_follows(problem_id) VALUES('${lab}')`);
});
await check('crash after claim recovers lease and rejects stale workers',async()=>{
 await follow();await reply();await worker();let old;
 await assert.rejects(runOnce(transactionalDb,{afterClaim:job=>{old=job;throw new Error('simulated process loss');}}));
 assert.equal(await count(),0);await worker();assert.equal(await runOnce(transactionalDb),'idle');
 await expire();assert.equal(await runOnce(transactionalDb),'delivered');assert.equal(await count(),1);
 await worker();assert.equal((await first('SELECT community_ack_notification($1,$2) ok',[old.event_id,old.lease_id])).ok,false);
 await denied(`SELECT community_deliver_notification('${old.event_id}','${old.lease_id}')`);
});
await check('crash after side effect before acknowledgement delivers exactly one inbox row on retry',async()=>{
 await follow();await reply();await worker();
 await assert.rejects(runOnce(transactionalDb,{afterDelivery:()=>{throw new Error('simulated process loss');}}));
 assert.equal(await count(),1);await expire();assert.equal(await runOnce(transactionalDb),'delivered');assert.equal(await count(),1);
 await worker();assert.equal(await runOnce(transactionalDb),'idle');await root();assert.equal((await first("SELECT count(*)::int n FROM community_notification_queue WHERE status='done'")).n,1);
});
await check('unfollow/refollow suppresses queued old events and hides delivered inbox entries',async()=>{
 await follow();await reply();await actor(a);await q('DELETE FROM community_discussion_follows WHERE problem_id=$1',[problem]);await follow();
 await worker();assert.equal(await runOnce(transactionalDb),'suppressed');assert.equal(await count(),0);
 await reply();await worker();assert.equal(await runOnce(transactionalDb),'delivered');await actor(a);assert.equal((await q('SELECT * FROM notifications')).rows.length,1);
 await q('DELETE FROM community_discussion_follows WHERE problem_id=$1',[problem]);assert.equal((await q('SELECT * FROM notifications')).rows.length,0);
 await follow();assert.equal((await q('SELECT * FROM notifications')).rows.length,0);
});
await check('hiding before processing suppresses delivery; hiding after delivery prevents reading',async()=>{
 await follow();await reply();await root();await q('UPDATE community_problems SET is_hidden=true WHERE id=$1',[problem]);await worker();assert.equal(await runOnce(transactionalDb),'suppressed');assert.equal(await count(),0);
 await root();await q('UPDATE community_problems SET is_hidden=false WHERE id=$1',[problem]);await reply();await worker();assert.equal(await runOnce(transactionalDb),'delivered');
 await root();await q("UPDATE community_problems SET visibility='draft' WHERE id=$1",[problem]);await actor(a);assert.equal((await q('SELECT * FROM notifications')).rows.length,0);
});
await check('unsupported events back off, reach failed state and recover only through operator replay',async()=>{
 await follow();await reply();await root();await q('UPDATE community_notification_outbox SET version=999');
 for(let n=1;n<=5;n++){
  await worker();assert.equal(await runOnce(transactionalDb),n===5?'failed':'retry');await root();const job=await first('SELECT * FROM community_notification_queue');assert.equal(job.attempts,n);assert.equal(job.status,n===5?'failed':'ready');assert.equal(job.last_error,'invalid_event');
  if(n<5){await worker();assert.equal(await runOnce(transactionalDb),'idle');await root();await q("UPDATE community_notification_queue SET available_at=clock_timestamp()-interval '1 second'");}
 }
 await worker();const event=(await root(),await first('SELECT id FROM community_notification_outbox')).id;
 await worker();await denied(`SELECT community_requeue_notification('${event}')`);await root();await q('UPDATE community_notification_outbox SET version=1');
 assert.equal((await first('SELECT community_requeue_notification($1) ok',[event])).ok,true);await worker();assert.equal(await runOnce(transactionalDb),'delivered');assert.equal(await count(),1);
});
await check('browser and service roles cannot enqueue, dispatch, deliver or inspect worker payloads',async()=>{
 await follow();await reply();
 for(const role of ['anon','authenticated','service_role']){
  await db.exec(`SET LOCAL ROLE ${role}`);
  await denied('SELECT * FROM community_notification_outbox');await denied('SELECT * FROM community_notification_queue');
  await denied('SELECT community_dispatch_notifications(50)');await denied('SELECT * FROM community_claim_notification(30)');
 }
 await worker();await denied('SELECT * FROM community_problems');await denied('SELECT * FROM notifications');await denied("INSERT INTO notifications(user_id,message) VALUES('"+a+"','forged')");
});
await check('expired final attempt fails without an endless retry loop',async()=>{
 await follow();await reply();await worker();await assert.rejects(runOnce(transactionalDb,{afterClaim:()=>{throw new Error('crash');}}));
 await root();await q("UPDATE community_notification_queue SET attempts=5,lease_until=clock_timestamp()-interval '1 second'");await worker();assert.equal(await runOnce(transactionalDb),'idle');
 await root();assert.equal((await first('SELECT status FROM community_notification_queue')).status,'failed');
});
await check('operations aggregate is worker-only and tracks backlog, failed work and age without identifiers',async()=>{
 await follow(); await reply(); await worker();
 let stats=await first('SELECT * FROM community_notification_stats()');
 assert.equal(Number(stats.undispatched),1); assert.ok(stats.oldest_pending_seconds>=0);
 assert.deepEqual(Object.keys(stats).sort(),['expired_leases','failed','oldest_pending_seconds','processing','ready','undispatched']);
 await q('SELECT community_dispatch_notifications(50)');
 assert.equal(Number((await first('SELECT * FROM community_notification_stats()')).ready),1);
 await q('SELECT * FROM community_claim_notification(30)'); await expire();
 assert.equal(Number((await first('SELECT * FROM community_notification_stats()')).expired_leases),1);
 await root(); await q("UPDATE community_notification_queue SET status='failed',lease_id=NULL,lease_until=NULL");
 await worker();stats=await first('SELECT * FROM community_notification_stats()');assert.equal(Number(stats.failed),1);assert.equal(stats.oldest_pending_seconds,0);
 for(const role of ['anon','authenticated','service_role']){await root();await db.exec(`SET LOCAL ROLE ${role}`);await denied('SELECT * FROM community_notification_stats()');}
});
await db.close();

await test('durable outbox and queue survive closing and reopening the database runtime',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'problemhunt-notification-test-'));let persistent;
 try {
  persistent=new PGlite(dir);await persistent.exec(await readFile(new URL('bootstrap.sql',import.meta.url),'utf8'));
  for(const file of (await readdir(migrations)).filter(f=>f.endsWith('.sql')).sort())await persistent.exec(await readFile(new URL(file,migrations),'utf8'));
  for(const [id,name] of [[a,'restartauthor'],[b,'restartreply']])await persistent.query('INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,$3)',[id,`${name}@example.invalid`,JSON.stringify({username:name,user_type:'builder'})]);
  const cat=(await persistent.query('SELECT id FROM community_categories LIMIT 1')).rows[0].id;
  const pid=(await persistent.query(`INSERT INTO community_problems(author_id,category_id,title,symptom,environment,expected_behavior,actual_behavior,visibility) VALUES($1,$2,'Restart case','Timeout','{"description":"local"}','Success','Timeout','public') RETURNING id`,[a,cat])).rows[0].id;
  await persistent.query('INSERT INTO community_discussion_follows(user_id,problem_id) VALUES($1,$2)',[a,pid]);
  await persistent.query("INSERT INTO community_solutions(author_id,problem_id,diagnosis,steps,reasoning,verification_method) VALUES($1,$2,'Route failure',ARRAY['Inspect'],'Wrong host','Repeat')",[b,pid]);
  await persistent.exec('SET ROLE community_notification_worker');
  await assert.rejects(runOnce(persistent,{afterDelivery:()=>{throw new Error('process stopped after side effect');}}));
  await persistent.close();persistent=new PGlite(dir);
  await persistent.query("UPDATE community_notification_queue SET lease_until=clock_timestamp()-interval '1 second'");
  await persistent.exec('SET ROLE community_notification_worker');
  assert.equal(await runOnce(persistent),'delivered');
  await persistent.exec('RESET ROLE');
  assert.equal((await persistent.query('SELECT count(*)::int n FROM notifications WHERE community_event_id IS NOT NULL')).rows[0].n,1);
  assert.equal((await persistent.query("SELECT count(*)::int n FROM pg_tables WHERE tablename IN ('community_notification_outbox','community_notification_queue')")).rows[0].n,2);
 } finally {await persistent?.close();assert.equal(dirname(resolve(dir)),resolve(tmpdir()));assert.ok(basename(dir).startsWith('problemhunt-notification-test-'));await rm(dir,{recursive:true,force:true});}
});
