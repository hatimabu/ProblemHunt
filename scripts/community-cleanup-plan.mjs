// Read-only hosted inventory; produces exact reviewed IDs, an ignored backup and SQL.
import {writeFile,readFile} from 'node:fs/promises';
import {config,readJson,createClient,checked} from './community-test-support.mjs';
try {await readFile(new URL('../supabase/migrations/20260927000300_remove_known_community_fixtures.sql',import.meta.url));throw new Error('Cleanup migration already exists. Never regenerate or overwrite reviewed/applied history.');}catch(e){if(e.code!=='ENOENT')throw e;}
const c=await config({readOnly:true}),keys=await readJson(new URL('../supabase/.temp/community-test-keys.json',import.meta.url));
const admin=createClient(c.url,keys.find(k=>k.name==='service_role').api_key,{auth:{persistSession:false}});
const names=['community_problems','community_solutions','community_comments','community_solution_votes','community_reports','community_report_reviews','community_moderation_events','community_acceptance_history','community_reputation_events'];
const all={};for(const name of names)all[name]=checked(await admin.from(name).select('*').limit(10000),'Inventory '+name);
const selected=all.community_problems.filter(p=>p.author_id===c.accounts[0].id&&p.is_example&&(/^(\[Example\]|\[Stage 3 |\[Pilot test\])/.test(p.title)||p.title==='Fictional automated reputation scoring fixture'));
const ids=xs=>new Set(xs.map(x=>x.id)),ps=ids(selected),ss=ids(all.community_solutions.filter(s=>ps.has(s.problem_id))),cs=ids(all.community_comments.filter(x=>ss.has(x.solution_id))),rs=ids(all.community_reports.filter(x=>ps.has(x.problem_id)||ss.has(x.solution_id)||cs.has(x.comment_id)));
const selectedRows={community_problems:selected,community_solutions:all.community_solutions.filter(x=>ss.has(x.id)),community_comments:all.community_comments.filter(x=>cs.has(x.id)),community_reports:all.community_reports.filter(x=>rs.has(x.id))};
for(const name of names.filter(n=>!selectedRows[n]))selectedRows[name]=all[name].filter(x=>rs.has(x.report_id)||ss.has(x.solution_id));
const mod=await readJson(new URL('../supabase/.temp/community-moderator.json',import.meta.url));const actors=new Set([...c.accounts.map(x=>x.id),mod.id]);
for(const [name,rows] of Object.entries(selectedRows))for(const row of rows)for(const field of ['author_id','actor_id','voter_id','reporter_id','moderator_id','user_id'])if(row[field]&&!actors.has(row[field]))throw new Error('Non-test participant found: cleanup needs review');
await writeFile(new URL('../supabase/.temp/community-fixture-backup.json',import.meta.url),JSON.stringify(selectedRows,null,2));
const manifest=Object.fromEntries(names.map(n=>[n,n==='community_problems'?selectedRows[n].map(({id,author_id,title})=>({id,author_id,title})):selectedRows[n].map(x=>n==='community_solution_votes'?{solution_id:x.solution_id,voter_id:x.voter_id}:n==='community_report_reviews'?{report_id:x.report_id}:{id:x.id})]));
await writeFile(new URL('../docs/community-fixture-cleanup-manifest.json',import.meta.url),JSON.stringify(manifest,null,2));
const quote=x=>"'"+String(x).replaceAll("'","''")+"'";
let sql=`BEGIN;
-- Exact synthetic fixture manifest reviewed against the hosted project.
-- No prefix-based DELETE, no legacy/account/storage deletion, no CASCADE.
LOCK TABLE ${names.map(n=>'public.'+n).join(',')} IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE cleanup_manifest(data jsonb) ON COMMIT DROP;
INSERT INTO cleanup_manifest VALUES (${quote(JSON.stringify(manifest))}::jsonb);
DO $$ DECLARE n text; actual integer; BEGIN
 -- Abort if any selected problem was repurposed or no longer explicitly fictional.
 IF EXISTS(SELECT 1 FROM public.community_problems p JOIN jsonb_to_recordset((SELECT data->'community_problems' FROM cleanup_manifest)) x(id uuid,author_id uuid,title text) ON p.id=x.id WHERE p.author_id<>x.author_id OR p.title<>x.title OR NOT p.is_example) THEN RAISE EXCEPTION 'Fixture identity changed; manual review required'; END IF;
END; $$;
`;
for(const name of names){const fields=name==='community_solution_votes'?['solution_id','voter_id']:name==='community_report_reviews'?['report_id']:['id'];sql+=`CREATE TEMP TABLE cleanup_${name} ON COMMIT DROP AS SELECT ${fields.map(f=>'x.'+f).join(',')} FROM jsonb_to_recordset((SELECT data->'${name}' FROM cleanup_manifest)) x(${fields.map(f=>f+' uuid').join(',')});\n`;}
const guards={community_solutions:'problem_id IN (SELECT id FROM cleanup_community_problems)',community_comments:'solution_id IN (SELECT id FROM cleanup_community_solutions)',community_reports:'problem_id IN (SELECT id FROM cleanup_community_problems) OR solution_id IN (SELECT id FROM cleanup_community_solutions) OR comment_id IN (SELECT id FROM cleanup_community_comments)',community_report_reviews:'report_id IN (SELECT id FROM cleanup_community_reports)',community_moderation_events:'report_id IN (SELECT id FROM cleanup_community_reports)',community_acceptance_history:'problem_id IN (SELECT id FROM cleanup_community_problems)',community_reputation_events:'solution_id IN (SELECT id FROM cleanup_community_solutions)',community_solution_votes:'solution_id IN (SELECT id FROM cleanup_community_solutions)'};
sql+='DO $$ BEGIN\n';for(const [name,guard] of Object.entries(guards)){const fields=name==='community_solution_votes'?['solution_id','voter_id']:name==='community_report_reviews'?['report_id']:['id'];sql+=` IF EXISTS(SELECT ${fields.join(',')} FROM public.${name} WHERE ${guard} EXCEPT SELECT ${fields.join(',')} FROM cleanup_${name}) THEN RAISE EXCEPTION 'New dependent rows in ${name}; cleanup aborted'; END IF;\n`;}
sql+='END; $$;\n';
const triggers=[['community_acceptance_history','history_immutable'],['community_moderation_events','moderation_events_immutable'],['community_reputation_events','community_reputation_immutable'],['community_solution_votes','community_vote_award'],['community_problems','community_acceptance_award']];
for(const [table,trigger] of triggers)sql+=`ALTER TABLE public.${table} DISABLE TRIGGER ${trigger};\n`;
sql+=`UPDATE public.community_problems SET state='closed',accepted_solution_id=NULL,solved_at=NULL,resolution_observation=NULL,resolution_verification=NULL WHERE id IN (SELECT id FROM cleanup_community_problems);\n`;
for(const name of ['community_moderation_events','community_report_reviews','community_reports','community_acceptance_history','community_solution_votes','community_reputation_events','community_comments','community_solutions','community_problems']){const fields=name==='community_solution_votes'?['solution_id','voter_id']:name==='community_report_reviews'?['report_id']:['id'];sql+=`DELETE FROM public.${name} WHERE (${fields.join(',')}) IN (SELECT ${fields.join(',')} FROM cleanup_${name});\n`;}
for(const [table,trigger] of triggers)sql+=`ALTER TABLE public.${table} ENABLE TRIGGER ${trigger};\n`;
sql+='COMMIT;\n';
await writeFile(new URL('../supabase/migrations/20260927000300_remove_known_community_fixtures.sql',import.meta.url),sql);
console.log(JSON.stringify({selected:Object.fromEntries(names.map(n=>[n,selectedRows[n].length])),remainingProblems:all.community_problems.filter(p=>!ps.has(p.id)).map(p=>({id:p.id,visibility:p.visibility})),backup:'supabase/.temp/community-fixture-backup.json'},null,2));
