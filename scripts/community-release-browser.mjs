import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import {config,readJson} from './community-test-support.mjs';
const require=createRequire(new URL('../supabase/tests/package.json',import.meta.url));
const {chromium}=require('playwright'),{default:AxeBuilder}=require('@axe-core/playwright');
const c=await config();const base=process.env.COMMUNITY_TEST_BASE_URL||'http://127.0.0.1:4173';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Local frontend required');
const examples=await readJson(new URL('../supabase/.temp/community-examples-results.json',import.meta.url));
const browser=await chromium.launch({headless:true,channel:process.platform==='win32'?'msedge':undefined});const results=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://*.supabase.co/**',r=>new URL(r.request().url()).origin===c.url?r.continue():r.abort());
 for(const route of ['/','/domains/cloud-devops','/domains/professional-av','/browse','/problem/'+examples[0].id,'/privacy','/auth']){
  const response=await page.goto(base+route);assert.equal(response.status(),200);assert.equal(response.headers()['x-content-type-options'],'nosniff');assert.ok(!response.headers()['content-security-policy'].includes('unsafe-eval'));
  await page.getByRole('heading',{level:1}).first().waitFor();
  if(route.includes('/problem/'))await page.getByRole('region',{name:'Confirmed fix'}).waitFor();
  if(route.includes('/domains/'))await page.getByRole('button',{name:'Search',exact:true}).waitFor();
  const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  results.push({route,violations:audit.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 await writeFile(new URL('../supabase/.temp/release-accessibility.json',import.meta.url),JSON.stringify({results,errors},null,2));
 console.log(JSON.stringify({pageErrors:errors,violations:results.filter(r=>r.violations.length)},null,2));
 assert.equal(errors.length,0);assert.equal(results.flatMap(r=>r.violations).filter(v=>['serious','critical'].includes(v.impact)).length,0);
}finally{await browser.close();}
