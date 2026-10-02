import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {config,client,signedIn,checked} from './community-test-support.mjs';
const c=await config();assert.equal(c.ref,'problemhunt-core-integration');
const a=await signedIn(c,c.accounts[0]),b=await signedIn(c,c.accounts[1]);
const anon=client(c);
assert.ok((await anon.rpc('community_export_account')).error);
for(const [api,account] of [[a,c.accounts[0]],[b,c.accounts[1]]]){
 const data=checked(await api.rpc('community_export_account'),'Own export');
 assert.equal(data.account.id,account.id);assert.ok(data.posts.every(row=>row.author_id===account.id));
 assert.ok(data.acceptance_history.every(row=>!('solution_snapshot' in row)));
 assert.ok(data.reputation.every(row=>!('event_key' in row)));
}
checked(await a.rpc('community_set_deletion_request',{p_requested:false}),'Clear only local request state');
const require=createRequire(new URL('../supabase/tests/package.json',import.meta.url));
const {chromium}=require('playwright'),{default:AxeBuilder}=require('@axe-core/playwright');
const browser=await chromium.launch({headless:true,channel:process.platform==='win32'?'msedge':undefined});
try{
 const ownerContext=await browser.newContext({viewport:{width:390,height:844}}),moderatorContext=await browser.newContext();
 const owner=await ownerContext.newPage(),moderator=await moderatorContext.newPage();
 async function login(page,account,route){await page.goto('http://127.0.0.1:4173/auth?returnTo='+encodeURIComponent(route));await page.getByLabel('Email',{exact:true}).fill(account.email);await page.getByLabel('Password',{exact:true}).fill(account.password);await page.getByRole('button',{name:'Login',exact:true}).click();await page.waitForURL('**'+route);}
 await login(owner,c.accounts[0],'/profile');
 const downloadPromise=owner.waitForEvent('download');await owner.getByRole('button',{name:'Download my data'}).click();
 const download=await downloadPromise;const data=JSON.parse(await readFile(await download.path(),'utf8'));
 assert.equal(data.account.id,c.accounts[0].id);assert.ok(!JSON.stringify(data).includes(c.accounts[0].password));
 await owner.getByRole('checkbox',{name:'I want to request deletion of my account.'}).check();
 await owner.getByRole('button',{name:'Send deletion request'}).click();await owner.getByText(/Deletion request sent for review/).waitFor();
 await owner.reload();await owner.getByRole('button',{name:'Cancel deletion request'}).waitFor();
 assert.ok((await anon.from('community_deletion_requests').select('*')).error);
 await login(moderator,c.accounts[1],'/moderation');
 const card=moderator.locator('article').filter({hasText:c.accounts[0].id});
 await card.getByRole('button',{name:'Start review'}).click();await card.getByText(/Under review/).waitFor();
 await owner.reload();await owner.getByText('Under review',{exact:true}).waitFor();
 assert.deepEqual((await new AxeBuilder({page:owner}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(row=>row.id),[]);
 assert.ok(await owner.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await owner.getByRole('button',{name:'Cancel deletion request'}).click();await owner.getByText('Deletion request cancelled.').waitFor();
 await moderator.reload();await moderator.getByRole('heading',{name:'Account deletion requests'}).waitFor();
 await moderator.getByText('No active deletion requests on this page.').waitFor();
 assert.equal(checked(await a.auth.getUser(),'Account remains').user.id,c.accounts[0].id);
 console.log('PASS real privacy: authenticated JSON download, owner-bound exports, private request, moderator review, cancellation, retained account, mobile accessibility.');
}finally{await browser.close();}
