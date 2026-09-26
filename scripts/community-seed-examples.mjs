import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { config, signedIn, client, checked } from './community-test-support.mjs';
const examples=JSON.parse(await readFile(new URL('./community-examples.json',import.meta.url),'utf8'));
const c=await config(), author=await signedIn(c,c.accounts[0]), contributor=await signedIn(c,c.accounts[1]), anon=client(c);
const categories=checked(await anon.from('community_categories').select('id,slug'),'Taxonomy');
const results=[];
for(const e of examples) {
  let p=checked(await author.from('community_problems').select('*').eq('author_id',c.accounts[0].id).eq('title',e.title).maybeSingle(),'Existing example');
  if(!p) p=checked(await author.from('community_problems').insert({ title:e.title, category_id:categories.find(v=>v.slug===e.category).id,
    symptom:e.symptom, product:e.product, product_version:e.version, environment:{description:e.environment}, tags:e.tags,
    expected_behavior:e.expected, actual_behavior:e.actual, attempted_tests:[{test:e.test,observation:e.observation}],
    observations:'Clearly labeled fictional example. Not a customer case or verified production incident.', visibility:'public' }).select().single(),'Seed example');
  let s=checked(await contributor.from('community_solutions').select('id').eq('problem_id',p.id).eq('author_id',c.accounts[1].id).maybeSingle(),'Existing solution');
  if(!s) s=checked(await contributor.from('community_solutions').insert({problem_id:p.id,diagnosis:e.diagnosis,steps:e.steps,reasoning:e.reasoning,verification_method:e.verification}).select().single(),'Seed solution');
  if(e.resolved && p.state!=='solved') {
    checked(await author.from('community_comments').insert({solution_id:s.id,kind:'test_result',body:'Fictional example test evidence',attempted_test:e.test,observation:e.observation,verification_method:e.verification}),'Example test evidence');
    checked(await author.rpc('community_set_problem_state',{p_problem_id:p.id,p_state:'testing'}),'Testing');
    checked(await author.rpc('community_accept_solution',{p_problem_id:p.id,p_solution_id:s.id,p_observation:'Illustrative confirmed fix: '+e.diagnosis,p_verification:e.verification}),'Example acceptance');
  }
  for(const query of [e.product,e.tags.at(-1)]) assert.ok(checked(await anon.rpc('community_search',{p_query:query}),'Search example').some(v=>v.id===p.id));
  results.push({id:p.id,title:e.title,solutionId:s.id,resolved:e.resolved});
}
for(const query of ['502 Bad Gateway','audio dropouts']) assert.ok(checked(await anon.rpc('community_search',{p_query:query,p_state:'solved'}),'Symptom search').length);
assert.equal(checked(await anon.rpc('community_search',{p_query:'no-such-example-xyz'}),'Empty search').length,0);
await writeFile(new URL('../supabase/.temp/community-examples-results.json',import.meta.url),JSON.stringify(results,null,2));
console.log('PASS: three fictional examples seeded idempotently; anonymous product, tag, symptom and empty searches verified.');
