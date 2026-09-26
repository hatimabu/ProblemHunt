import assert from 'node:assert/strict';
import {config,signedIn,checked,readJson,createClient} from './community-test-support.mjs';
const c=await config(),a=await signedIn(c,c.accounts[0]),b=await signedIn(c,c.accounts[1]);
const keys=await readJson(new URL('../supabase/.temp/community-test-keys.json',import.meta.url));
const admin=createClient(c.url,keys.find(k=>k.name==='service_role').api_key,{auth:{persistSession:false}});
const category=checked(await a.from('community_categories').select('id').limit(1),'Category')[0].id;
// This explicitly fictional scoring fixture temporarily exercises non-example awards.
// Finally mark it as an example so it is excluded from public reputation totals.
const p=checked(await a.from('community_problems').insert({category_id:category,title:'Fictional automated reputation scoring fixture',symptom:'Synthetic fault; no real equipment outcome',environment:{description:'Fictional test only'},expected_behavior:'Success',actual_behavior:'Failure',visibility:'public'}).select().single(),'Problem');
try {
const s=checked(await b.from('community_solutions').insert({problem_id:p.id,diagnosis:'Synthetic fix',steps:['Simulate correction'],reasoning:'Test fixture',verification_method:'Automated API assertions'}).select().single(),'Solution');
const total=async()=>checked(await b.from('community_reputation_events').select('points').eq('solution_id',s.id),'Ledger').reduce((n,e)=>n+e.points,0);
assert.equal((await b.from('community_solution_votes').insert({solution_id:s.id})).error?.code,'42501');
checked(await a.from('community_solution_votes').insert({solution_id:s.id}),'Vote');assert.equal(await total(),2);
assert.equal((await a.from('community_solution_votes').insert({solution_id:s.id})).error?.code,'23505');assert.equal(await total(),2);
checked(await a.from('community_solution_votes').delete().eq('solution_id',s.id),'Remove');assert.equal(await total(),0);
checked(await a.rpc('community_set_problem_state',{p_problem_id:p.id,p_state:'testing'}),'Testing');
const args={p_problem_id:p.id,p_solution_id:s.id,p_observation:'Simulated success',p_verification:'Test fixture, not real equipment'};
checked(await a.rpc('community_accept_solution',args),'Accept');assert.equal(await total(),10);
assert.equal((await b.rpc('community_reverse_acceptance',{p_problem_id:p.id,p_reason:'Forged'})).error?.code,'42501');
checked(await a.rpc('community_reverse_acceptance',{p_problem_id:p.id,p_reason:'Synthetic regression test'}),'Reverse');assert.equal(await total(),0);
assert.equal((await a.rpc('community_reverse_acceptance',{p_problem_id:p.id,p_reason:'Repeat'})).error?.code,'23514');
assert.equal(checked(await a.from('community_acceptance_history').select('id').eq('problem_id',p.id),'History').length,2);
assert.equal((await b.from('community_reputation_events').insert({user_id:c.accounts[1].id,category_id:category,solution_id:s.id,event_key:'forged',reason:'forged',points:9000})).error?.code,'42501');
console.log('PASS hosted reputation: self/duplicate vote rejection; +2/remove=0; +10/reverse=0; author-only reversal; immutable ledger; evidence history. Synthetic case left Testing with net zero points.');
} finally {
 checked(await admin.from('community_problems').update({is_example:true}).eq('id',p.id),'Exclude synthetic scoring fixture');
}
