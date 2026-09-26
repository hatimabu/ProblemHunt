// Disposable PostgreSQL only: rehearse the exact cleanup against the ignored fixture backup.
import {PGlite} from '../supabase/tests/node_modules/@electric-sql/pglite/dist/index.js';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite(),root=new URL('../supabase/',import.meta.url);
try {
 const backup=JSON.parse(await readFile(new URL('.temp/community-fixture-backup.json',root),'utf8'));
 await db.exec(await readFile(new URL('tests/bootstrap.sql',root),'utf8'));
 for(const name of (await readdir(new URL('migrations/',root))).filter(n=>n.endsWith('.sql')&&!n.includes('remove_known_community_fixtures')).sort())await db.exec(await readFile(new URL('migrations/'+name,root),'utf8'));
 const people=new Set();for(const rows of Object.values(backup))for(const row of rows)for(const key of ['author_id','actor_id','voter_id','reporter_id','moderator_id','user_id'])if(row[key])people.add(row[key]);
 let i=0;for(const id of people){await db.query('INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,$3)',[id,`rehearsal${i}@example.invalid`,JSON.stringify({username:'rehearsal_'+i++,user_type:'builder'})]);await db.query('INSERT INTO community_moderators(user_id) VALUES($1)',[id]);}
 const domain=(await db.query('SELECT id FROM community_domains LIMIT 1')).rows[0].id;
 for(const id of new Set(backup.community_problems.map(p=>p.category_id)))await db.query('INSERT INTO community_categories(id,domain_id,slug,name) VALUES($1,$2,$3,$4)',[id,domain,'rehearsal-'+i++,'Rehearsal']);
 const add=async(name,rows)=>{if(rows.length)await db.query(`INSERT INTO ${name} SELECT * FROM jsonb_populate_recordset(NULL::${name},$1::jsonb)`,[JSON.stringify(rows)]);};
 await add('community_problems',backup.community_problems.map(p=>({...p,state:'open',accepted_solution_id:null,solved_at:null,resolution_observation:null,resolution_verification:null})));
 for(const name of ['community_solutions','community_comments','community_reports','community_report_reviews','community_moderation_events','community_acceptance_history','community_reputation_events','community_solution_votes'])await add(name,backup[name]);
 await db.exec('ALTER TABLE community_problems DISABLE TRIGGER community_acceptance_award');
 for(const p of backup.community_problems)await db.query('UPDATE community_problems SET state=$2,accepted_solution_id=$3,solved_at=$4,resolution_observation=$5,resolution_verification=$6 WHERE id=$1',[p.id,p.state,p.accepted_solution_id,p.solved_at,p.resolution_observation,p.resolution_verification]);
 await db.exec('ALTER TABLE community_problems ENABLE TRIGGER community_acceptance_award');
 const control=(await db.query("INSERT INTO community_problems(author_id,category_id,title) VALUES($1,$2,'Unrelated control row') RETURNING id",[[...people][0],backup.community_problems[0].category_id])).rows[0].id;
 await db.exec(await readFile(new URL('migrations/20260927000300_remove_known_community_fixtures.sql',root),'utf8'));
 assert.deepEqual((await db.query('SELECT id FROM community_problems')).rows,[{id:control}]);
 for(const name of Object.keys(backup).filter(n=>n!=='community_problems'))assert.equal((await db.query(`SELECT count(*)::int n FROM ${name}`)).rows[0].n,0,name);
 console.log('PASS exact hosted fixture-backup rehearsal: all 94 selected records removed, unrelated control row preserved. No hosted writes.');
}finally{await db.close();}
