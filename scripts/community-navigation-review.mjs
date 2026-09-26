// Production data is read-only. This harness never creates synthetic content.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {config,client,signedIn,checked} from './community-test-support.mjs';
const c=await config({readOnly:true}),anon=client(c),require=createRequire(new URL('../supabase/tests/package.json',import.meta.url));
const {chromium}=require('playwright'),{default:AxeBuilder}=require('@axe-core/playwright');
assert.equal(checked(await anon.from('community_problems').select('id'),'Public empty state').length,0);
assert.equal(checked(await anon.rpc('community_search',{}),'Empty search').length,0);
const browser=await chromium.launch({headless:true,channel:process.platform==='win32'?'msedge':undefined}),base='http://127.0.0.1:4173';
async function scan(page,label){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+' overflow');const r=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],label);}
const path=name=>fileURLToPath(new URL('../supabase/.temp/'+name,import.meta.url));
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
 await page.goto(base);assert.equal(await page.getByRole('link',{name:'HUNT',exact:true}).getAttribute('href'),'/browse');assert.equal(await page.locator('h1 a').count(),1);assert.equal(await page.locator('h1 span').innerText(),'problems');assert.equal(await page.getByText('Community problems',{exact:true}).count(),0);await scan(page,'Landing desktop');await page.screenshot({path:path('landing-redesign.png'),fullPage:true});
 await page.getByRole('link',{name:'HUNT',exact:true}).click();await page.getByRole('search').waitFor();
 const shell=await page.getByRole('navigation',{name:'Knowledge domains'}).elementHandle(),form=await page.getByRole('search').elementHandle();
 await page.getByRole('navigation',{name:'Knowledge domains'}).getByRole('link',{name:'Cloud / DevOps'}).click();await page.waitForURL('**/domains/cloud-devops');assert.ok(await shell.evaluate(el=>el.isConnected));assert.ok(await form.evaluate(el=>el.isConnected));
 await page.goBack();await page.waitForURL('**/browse');await page.goForward();await page.waitForURL('**/domains/cloud-devops');assert.ok(await shell.evaluate(el=>el.isConnected));
 await page.getByRole('navigation',{name:'Knowledge domains'}).getByRole('link',{name:'Professional AV'}).click();await page.waitForURL('**/domains/professional-av');await page.getByText('No matching public problems. Try fewer words or clear the filters.').waitFor();await scan(page,'Browse desktop');
 await page.setViewportSize({width:390,height:844});await page.reload();await page.getByRole('search').waitFor();await scan(page,'Browse mobile');await page.screenshot({path:path('browse-redesign-mobile.png'),fullPage:true});
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.community-tab').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
 for(let i=0;i<c.accounts.length;i++){
  const account=c.accounts[i],api=await signedIn(c,account);assert.equal(checked(await api.from('community_profiles').select('user_id').eq('user_id',c.accounts[1-i].id).eq('is_public',false),'Other private identity').length,0);
  const ctx=await browser.newContext({viewport:{width:i===0?1440:390,height:1000}}),p=await ctx.newPage();
  await p.goto(base+'/auth?returnTo=%2Fdashboard');await p.getByLabel('Email',{exact:true}).fill(account.email);await p.getByLabel('Password',{exact:true}).fill(account.password);await p.getByRole('button',{name:'Login',exact:true}).click();await p.waitForURL('**/dashboard');await p.getByText('No problems yet',{exact:true}).waitFor();
  const nav=await p.getByRole('navigation',{name:'Your workspace'}).elementHandle(),identity=await p.locator('.workspace-sidebar').elementHandle(),header=await p.locator('.workspace-heading').elementHandle();
  await scan(p,'Dashboard '+i);await p.screenshot({path:path('dashboard-redesign-'+i+'.png'),fullPage:true});
  for(const [label,url] of [['My problems','/my-problems'],['My solutions','/my-solutions'],['Accepted fixes','/my-solutions?accepted=1'],['My profile','/profile'],['Reputation history','/dashboard/reputation']]){
   await p.getByRole('navigation',{name:'Your workspace'}).getByRole('link',{name:label,exact:true}).click();await p.waitForURL(base+url);assert.ok(await nav.evaluate(el=>el.isConnected));assert.ok(await identity.evaluate(el=>el.isConnected));assert.ok(await header.evaluate(el=>el.isConnected));
   if(url==='/profile'){await p.getByLabel('Username',{exact:true}).waitFor();assert.ok(await p.getByText('Sign-in email:',{exact:false}).isVisible());}
  }
  await p.goBack();await p.waitForURL('**/profile');await p.goForward();await p.waitForURL('**/dashboard/reputation');assert.ok(await nav.evaluate(el=>el.isConnected));await p.reload();await p.getByRole('heading',{name:'Your dashboard'}).waitFor();await p.getByRole('heading',{name:'Category reputation',exact:true}).waitFor();await scan(p,'Reputation '+i);
  await p.goto(base+'/profile');await p.getByLabel('Username',{exact:true}).waitFor();await scan(p,'Profile '+i);
  await ctx.close();
 }
 console.log('PASS real Supabase read-only: empty public library, HUNT-only hero link, persistent Browse/dashboard DOM, both account sessions, private profile read denial, all tabs, direct refresh, back/forward, desktop/mobile, reduced motion and axe checks. No fixtures created.');
}finally{await browser.close();}
