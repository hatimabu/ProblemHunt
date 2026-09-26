import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {config,readJson} from './community-test-support.mjs';
const require=createRequire(new URL('../supabase/tests/package.json',import.meta.url));const {chromium}=require('playwright');
const c=await config(),mod=await readJson(new URL('../supabase/.temp/community-moderator.json',import.meta.url));
const fixture=await readJson(new URL('../supabase/.temp/community-browser-results.json',import.meta.url));
const base=process.env.COMMUNITY_TEST_BASE_URL||'http://127.0.0.1:5173';if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Local frontend required');
const browser=await chromium.launch({headless:true,channel:process.platform==='win32'?'msedge':undefined});
try{
 const contexts=await Promise.all([1,2,3,4].map(()=>browser.newContext({viewport:{width:390,height:844}})));
 const [a,b,m,v]=await Promise.all(contexts.map(x=>x.newPage()));
 for(const page of [a,b,m,v])await page.route('https://*.supabase.co/**',r=>new URL(r.request().url()).origin===c.url?r.continue():r.abort());
 async function login(page,account){await page.goto(base+'/auth');await page.getByLabel('Email',{exact:true}).fill(account.email);await page.getByLabel('Password',{exact:true}).fill(account.password);await page.getByRole('button',{name:'Login',exact:true}).click();await page.waitForURL('**/dashboard');}
 await login(a,c.accounts[0]);await login(b,c.accounts[1]);await login(m,mod);
 const url=base+'/problem/'+fixture.problemId;await a.goto(url);await a.getByRole('region',{name:'Confirmed fix'}).waitFor();
 await a.getByRole('button',{name:'Upvote solution',exact:true}).click();await a.getByRole('button',{name:'Remove upvote',exact:true}).waitFor();
 await a.getByRole('button',{name:'Remove upvote',exact:true}).click();await a.getByRole('button',{name:'Upvote solution',exact:true}).waitFor();
 await b.goto(url);await b.getByText('You cannot upvote your own solution.').waitFor();assert.equal(await b.getByRole('button',{name:'Reopen for testing'}).count(),0);
 await a.getByRole('button',{name:'Reopen for testing'}).click();await a.getByLabel('Why did the fix stop working?').fill('Synthetic pilot reversal');await a.getByRole('button',{name:'Confirm acceptance reversal'}).click();
 await a.getByRole('button',{name:'Accept solution and mark Solved'}).waitFor();await a.reload();await a.getByRole('button',{name:'Accept solution and mark Solved'}).waitFor();
 await a.getByLabel('Confirmed observation').fill('Simulated confirmation after retest');await a.getByLabel('Confirmed verification').fill('Fictional pilot workflow, not real hardware');await a.getByRole('button',{name:'Accept solution and mark Solved'}).click();await a.getByRole('region',{name:'Confirmed fix'}).waitFor();
 const reason='[Pilot browser] '+Date.now();await b.getByRole('button',{name:'Report problem',exact:true}).click();await b.getByLabel('Report reason').fill(reason);await b.getByRole('button',{name:'Send report',exact:true}).click();await b.getByText('Report sent privately to moderators.').waitFor();
 await b.goto(base+'/moderation');await b.getByText('You do not have moderator permission.').waitFor();
 await m.goto(base+'/moderation');const review=m.getByRole('article').filter({has:m.getByRole('heading',{name:reason,exact:true})});await review.waitFor();
 await review.getByLabel('Review status',{exact:true}).selectOption('actioned');await review.getByLabel('Content action',{exact:true}).selectOption('hide');await review.getByLabel('Moderator-only notes').fill('Synthetic hide test');
 await Promise.all([m.waitForResponse(r=>r.url().includes('rpc/community_moderate_report')),review.getByRole('button',{name:'Save review'}).click()]);
 await v.goto(url);await v.getByRole('heading',{name:'Problem unavailable'}).waitFor();
 await m.reload();await review.waitFor();await review.getByLabel('Content action',{exact:true}).selectOption('restore');await review.getByLabel('Moderator-only notes').fill('Restored after synthetic test');
 await Promise.all([m.waitForResponse(r=>r.url().includes('rpc/community_moderate_report')),review.getByRole('button',{name:'Save review'}).click()]);
 await v.reload();await v.getByRole('region',{name:'Confirmed fix'}).waitFor();await v.getByText('Fictional example. Test results and acceptance are simulated, not a real verified fix.').waitFor();
 assert.ok(await v.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await v.goto(base+'/privacy');assert.equal(await v.evaluate(()=>localStorage.getItem('problemhunt.pilot-counts.v1')),null);await v.getByLabel('Enable local pilot counts').check();
 await v.goto(base+'/browse');await v.getByLabel('Search symptoms, products or tags').fill('audio');await v.getByRole('button',{name:'Search',exact:true}).click();
 const metrics=await v.evaluate(()=>localStorage.getItem('problemhunt.pilot-counts.v1'));assert.ok(metrics.includes('searches'));assert.ok(!metrics.includes('audio'));
 await v.goto(base+'/privacy');await v.getByRole('button',{name:'Delete counts and opt out'}).click();assert.equal(await v.evaluate(()=>localStorage.getItem('problemhunt.pilot-counts.v1')),null);
 console.log('PASS browser: anonymous, author, contributor, moderator; vote/remove, self-vote UI, reversal/reaccept with refresh, private report, unauthorized moderator denial, hide/restore, fictional labels, mobile width and local-only opt-in counters.');
}finally{await browser.close();}
