// Compiled UI with simulated Auth/REST only; every external request is intercepted.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const require=createRequire(new URL('../supabase/tests/package.json',import.meta.url));
const {chromium}=require('playwright'),{default:AxeBuilder}=require('@axe-core/playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),out=fileURLToPath(new URL('../supabase/.temp/session-05/',import.meta.url));await mkdir(out,{recursive:true});
const base='http://127.0.0.1:4173',alice='00000000-0000-0000-0000-000000000001',bob='00000000-0000-0000-0000-000000000002',pid='10000000-0000-0000-0000-000000000001';
function session(id){const exp=Math.floor(Date.now()/1000)+3600;return{access_token:`eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({sub:id,exp})).toString('base64url')}.test`,refresh_token:'local-test',expires_at:exp,expires_in:3600,token_type:'bearer',user:{id,email:'local@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{username:'Local reviewer'}}};}
const post={id:pid,author_id:bob,title:'Local notification example',post_type:'problem',lessons:'',symptom:'A fictional local case.',environment:{description:'Disposable review'},product:'Local lab',product_version:'',expected_behavior:'One reply notification',actual_behavior:'Awaiting replies',attempted_tests:[],observations:'',verification_method:'',tags:[],visibility:'public',state:'open',accepted_solution_id:null,is_hidden:false,is_example:true};
const server=spawn(process.execPath,['scripts/community-preview.mjs'],{cwd:root,stdio:['ignore','pipe','pipe']});let browser;const evidence=[];
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Preview startup timed out')),10000);server.stdout.once('data',()=>{clearTimeout(timer);resolve();});server.once('exit',()=>{clearTimeout(timer);reject(new Error('Preview failed'));});});
 browser=await chromium.launch({headless:true,channel:process.platform==='win32'?'msedge':undefined});
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  await context.addInitScript(value=>{if(!localStorage.getItem('notification-review')){localStorage.setItem('problemhunt-auth',JSON.stringify(value));localStorage.setItem('notification-review','1');}},session(alice));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));let followed=false,arrived=false,read=false,hidden=false,failWrite=false;
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());if(url.origin===base)return route.continue();if(url.hostname!=='example.supabase.co')return route.abort();
   let user;try{user=JSON.parse(Buffer.from((req.headers().authorization||'').split('.')[1],'base64url').toString()).sub;}catch{}
   const reply=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
   if(url.pathname==='/auth/v1/user')return reply(session(user).user);
   if(url.pathname.endsWith('/profiles'))return reply({user_id:user,username:'Local reviewer',user_type:'builder',full_name:'Local reviewer'});
   if(url.pathname.endsWith('/community_problems'))return reply(post);
   if(url.pathname.endsWith('/community_discussion_follows')){
    assert.equal(url.searchParams.get('user_id')||`eq.${req.postDataJSON()?.user_id}`,`eq.${user}`);
    if(req.method()==='POST'){assert.equal(user,alice);followed=true;return route.fulfill({status:204});}
    if(req.method()==='DELETE'){followed=false;return route.fulfill({status:204});}
    const own=user===alice&&followed;
    return reply(url.searchParams.has('problem_id')?(own?{problem_id:pid}:null):(own?[{problem_id:pid,problem:hidden?null:{title:post.title,visibility:'public',is_hidden:false}}]:[]));
   }
   if(url.pathname.endsWith('/notifications')){
    assert.equal(url.searchParams.get('user_id'),`eq.${user}`);assert.equal(url.searchParams.get('community_event_id'),'not.is.null');
    if(req.method()==='PATCH'){if(failWrite)return reply({message:'Simulated write failure'},500);read=req.postDataJSON().is_read;return reply({id:'local-notification'});}
    return reply(user===alice&&followed&&arrived&&!hidden?[{id:'local-notification',message:'New reply in a discussion you follow.',link:`/problem/${pid}#solution-20000000-0000-0000-0000-000000000001`,is_read:read,created_at:'2026-09-28T12:00:00Z'}]:[]);
   }
   if(['community_tag_follows','community_saved_cases','community_profiles','community_solutions','community_acceptance_history'].some(t=>url.pathname.endsWith(`/${t}`)))return reply([]);
   throw new Error(`Unexpected local mock request: ${req.method()} ${url.pathname}`);
  });
  const scan=async label=>{assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const result=await new AxeBuilder({page}).analyze();assert.deepEqual(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],label);evidence.push(`${width}px ${label}: axe/no overflow`);};
  await page.goto(`${base}/problem/${pid}`);await page.getByRole('button',{name:'Follow replies',exact:true}).click();await page.getByRole('button',{name:'Following replies · unfollow',exact:true}).waitFor();
  await page.reload();await page.getByRole('button',{name:'Following replies · unfollow',exact:true}).waitFor();arrived=true;
  await page.goto(`${base}/notifications`);await page.getByRole('button',{name:'Mark read',exact:true}).waitFor();await scan('inbox');await page.screenshot({path:`${out}/inbox-${width}.png`,fullPage:true});
  failWrite=true;await page.getByRole('button',{name:'Mark read',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(read,false);
  failWrite=false;await page.getByRole('button',{name:'Try again',exact:true}).click();await page.getByRole('button',{name:'Mark read',exact:true}).click();await page.getByRole('button',{name:'Mark unread',exact:true}).waitFor();
  await page.reload();await page.getByRole('button',{name:'Mark unread',exact:true}).waitFor();
  await page.evaluate(value=>localStorage.setItem('problemhunt-auth',JSON.stringify(value)),session(bob));await page.reload();await page.getByText('No visible reply notifications on this page.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Unfollow discussion',exact:true}).count(),0);
  await page.evaluate(value=>localStorage.setItem('problemhunt-auth',JSON.stringify(value)),session(alice));hidden=true;await page.reload();await page.getByText('Unavailable discussion',{exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'View reply',exact:true}).count(),0);
  await page.getByRole('button',{name:'Unfollow discussion',exact:true}).click();await page.getByText('No followed discussions on this page.',{exact:false}).waitFor();await scan('hidden removal and empty inbox');
  await page.screenshot({path:`${out}/empty-${width}.png`,fullPage:true});assert.deepEqual(errors,[]);evidence.push(`${width}px: follow/reload, failed read/retry, persisted read state, account isolation, hidden-content exclusion and unfollow passed (mocked transport)`);
  await context.close();
 }
 await writeFile(`${out}/browser-evidence.json`,JSON.stringify(evidence,null,2));console.log(evidence.join('\n'));
}finally{await browser?.close();server.kill();}
