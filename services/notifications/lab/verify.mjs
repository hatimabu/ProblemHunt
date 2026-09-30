// Run inside the init container with the ordinary worker stopped. Local database only.
import pg from 'pg';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { databaseConfig } from '../src/config.mjs';
import { runOnce } from '../src/worker.mjs';
const admin=new pg.Client(await databaseConfig(process.env,true));
const workerEnv={...process.env,PGUSER:'notification_worker_login',PGPASSWORD_FILE:'/run/secrets/worker_password'};
const w1=new pg.Client(await databaseConfig(workerEnv)),w2=new pg.Client(await databaseConfig(workerEnv));
const mode=process.argv[2]||'verify';
const query=(sql,args=[])=>admin.query(sql,args), first=async(sql,args)=>(await query(sql,args)).rows[0];
async function seed(){
 const author=randomUUID(),actor=randomUUID();
 for(const [id,name] of [[author,'Lab author'],[actor,'Lab contributor']])await query('INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,$3)',[id,`${id}@example.invalid`,JSON.stringify({username:`lab_${id.slice(0,12).replaceAll('-','')}`,full_name:name,user_type:'builder'})]);
 const category=(await first('SELECT id FROM community_categories LIMIT 1')).id;
 const p=(await first(`INSERT INTO community_problems(author_id,category_id,title,symptom,environment,expected_behavior,actual_behavior,visibility,is_example) VALUES($1,$2,'Disposable notification drill','Local example','{"description":"isolated Docker lab"}','One inbox row','Pending','public',true) RETURNING id`,[author,category])).id;
 await query('INSERT INTO community_discussion_follows(user_id,problem_id) VALUES($1,$2)',[author,p]);
 const reply=async()=>{const s=(await first("INSERT INTO community_solutions(author_id,problem_id,diagnosis,steps,reasoning,verification_method) VALUES($1,$2,'Local test reply',ARRAY['Inspect'],'Learning exercise','Count durable rows') RETURNING id",[actor,p])).id;return (await first('SELECT id FROM community_notification_outbox WHERE solution_id=$1',[s])).id;};
 return {author,p,reply};
}
try{
 await Promise.all([admin.connect(),w1.connect(),w2.connect()]);
 assert.equal((await first('SELECT current_database() name')).name,'problemhunt_notification_lab');
 if(mode==='prepare-restart'){
  const f=await seed(),event=await f.reply();
  await query('CREATE TABLE IF NOT EXISTS notification_lab_probe(name text PRIMARY KEY,event_id uuid NOT NULL)');
  await query("INSERT INTO notification_lab_probe VALUES('restart',$1) ON CONFLICT(name) DO UPDATE SET event_id=excluded.event_id",[event]);
  await w1.query('SELECT community_dispatch_notifications(50)');console.log('Restart probe queued durably; restart db and worker, then run check-restart.');
 }else if(mode==='check-restart'){
  const event=(await first("SELECT event_id FROM notification_lab_probe WHERE name='restart'")).event_id;
  let count=0;for(let i=0;i<25;i++){count=(await first('SELECT count(*)::int n FROM notifications WHERE community_event_id=$1',[event])).n;if(count===1)break;await delay(1000);}
  assert.equal(count,1);assert.equal((await first('SELECT status FROM community_notification_queue WHERE event_id=$1',[event])).status,'done');
  console.log('PostgreSQL/worker restart: durable event delivered exactly once.');
 }else{
  assert.equal(mode,'verify');const f=await seed();
  for(const boundary of ['before-delivery','after-delivery']){
   const event=await f.reply();
   const result=spawnSync(process.execPath,['lab/crash.mjs',boundary],{env:workerEnv,stdio:'pipe',timeout:15000});assert.equal(result.status,23,`Child did not reach ${boundary}`);
   assert.equal((await first('SELECT count(*)::int n FROM notifications WHERE community_event_id=$1',[event])).n,boundary==='before-delivery'?0:1);
   const stale=await first('SELECT lease_id FROM community_notification_queue WHERE event_id=$1',[event]);
   await query("UPDATE community_notification_queue SET lease_until=clock_timestamp()-interval '1 second' WHERE event_id=$1",[event]);
   assert.equal(await runOnce(w1),'delivered');assert.equal((await first('SELECT count(*)::int n FROM notifications WHERE community_event_id=$1',[event])).n,1);
   assert.equal((await w2.query('SELECT community_ack_notification($1,$2) ok',[event,stale.lease_id])).rows[0].ok,false);
   console.log(`${boundary}: real child-process exit, lease recovery and deduplication passed.`);
  }
  await f.reply();await f.reply();await w1.query('SELECT community_dispatch_notifications(50)');
  // Keep the first claim transaction locked; the second worker must skip that row.
  await w1.query('BEGIN');const j1=(await w1.query('SELECT * FROM community_claim_notification(30)')).rows[0];
  const j2=(await w2.query('SELECT * FROM community_claim_notification(30)')).rows[0];assert.ok(j2);assert.notEqual(j1.event_id,j2.event_id);await w1.query('COMMIT');
  for(const [w,j] of [[w1,j1],[w2,j2]]){await w.query('SELECT community_deliver_notification($1,$2)',[j.event_id,j.lease_id]);await w.query('SELECT community_ack_notification($1,$2)',[j.event_id,j.lease_id]);}
  console.log('Two PostgreSQL connections: locked claims are skipped and do not duplicate work.');
  const hidden=await f.reply();await query('UPDATE community_problems SET is_hidden=true WHERE id=$1',[f.p]);assert.equal(await runOnce(w1),'suppressed');assert.equal((await first('SELECT count(*)::int n FROM notifications WHERE community_event_id=$1',[hidden])).n,0);
  await assert.rejects(w1.query('SELECT * FROM community_problems'),e=>e.code==='42501');await assert.rejects(w1.query('SELECT * FROM community_notification_outbox'),e=>e.code==='42501');
  console.log('Hidden-before-processing suppression and restricted worker privileges passed.');
 }
}finally{await Promise.all([admin.end(),w1.end(),w2.end()]);}
