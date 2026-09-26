import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {config,signedIn,client,checked} from './community-test-support.mjs';
const require=createRequire(new URL('../supabase/tests/package.json',import.meta.url));
const {chromium}=require('playwright'),{default:AxeBuilder}=require('@axe-core/playwright');
const c=await config(),a=await signedIn(c,c.accounts[0]),b=await signedIn(c,c.accounts[1]),anon=client(c);
const clients=[a,b],originals=[];const base='http://127.0.0.1:4173';
for(let i=0;i<2;i++)originals.push(checked(await clients[i].from('community_profiles').select('*').eq('user_id',c.accounts[i].id).maybeSingle(),'Snapshot synthetic profile'));
const browser=await chromium.launch({headless:true,channel:process.platform==='win32'?'msedge':undefined});
try{
 const visitorContext=await browser.newContext({viewport:{width:390,height:844}}),visitor=await visitorContext.newPage();
 for(let i=0;i<2;i++){
  const account=c.accounts[i],api=clients[i],other=clients[1-i];
  if(originals[i])checked(await api.from('community_profiles').update({avatar_path:null}).eq('user_id',account.id),'Detach original fixture avatar during test');
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  await page.route('https://*.supabase.co/**',r=>new URL(r.request().url()).origin===c.url?r.continue():r.abort());
  await page.goto(base+'/auth?returnTo=%2Fprofile');await page.getByLabel('Email',{exact:true}).fill(account.email);await page.getByLabel('Password',{exact:true}).fill(account.password);await page.getByRole('button',{name:'Login',exact:true}).click();await page.waitForURL('**/profile');
  await page.getByLabel('Display name').fill('Fictional profile '+i);await page.getByLabel('Short bio').fill('Synthetic community profile for automated tests.');await page.getByLabel('Areas of expertise (comma separated, up to 12)').fill('Cloud, Professional AV');await page.getByLabel('Publish my profile and picture').uncheck();await page.getByRole('button',{name:'Save profile'}).click();await page.getByText('Profile saved.',{exact:true}).waitFor();
  assert.equal(checked(await other.from('community_profiles').select('*').eq('user_id',account.id),'Private profile').length,0);
  assert.equal(checked(await anon.from('community_profiles').select('*').eq('user_id',account.id),'Anonymous private profile').length,0);
  assert.equal(checked(await other.from('community_profiles').update({bio:'Forged'}).eq('user_id',account.id).select('user_id'),'Cross profile edit').length,0);
  const png=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=20;canvas.height=20;const ctx=canvas.getContext('2d');ctx.fillStyle='#6699aa';ctx.fillRect(0,0,20,20);return canvas.toDataURL('image/png').split(',')[1];});
  const input=page.getByLabel('Upload or replace picture');
  await input.setInputFiles({name:'invalid.png',mimeType:'image/png',buffer:Buffer.from('not an image')});await page.getByRole('alert').filter({hasText:'could not be decoded'}).waitFor();
  await input.setInputFiles({name:'fictional.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.getByText('Picture updated.',{exact:true}).waitFor();
  const first=checked(await api.from('community_profiles').select('*').eq('user_id',account.id).single(),'Saved avatar');assert.ok(first.avatar_path.endsWith('.webp'));
  assert.ok((await other.storage.from('community-avatars').createSignedUrl(first.avatar_path,60)).error);
  assert.ok((await anon.storage.from('community-avatars').createSignedUrl(first.avatar_path,60)).error);
  const picture=checked(await api.storage.from('community-avatars').download(first.avatar_path),'Own image');
  assert.ok((await other.storage.from('community-avatars').upload(account.id+'/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.webp',picture,{contentType:'image/webp'})).error);
  assert.ok((await other.storage.from('community-avatars').upload(first.avatar_path,picture,{contentType:'image/webp',upsert:true})).error);
  await other.storage.from('community-avatars').remove([first.avatar_path]);checked(await api.storage.from('community-avatars').download(first.avatar_path),'Foreign deletion did not remove image');
  await input.setInputFiles({name:'replacement.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.getByText('Picture updated.',{exact:true}).waitFor();
  await page.waitForFunction(()=>!document.querySelector('fieldset[disabled]'));
  const second=checked(await api.from('community_profiles').select('*').eq('user_id',account.id).single(),'Replacement');assert.notEqual(second.avatar_path,first.avatar_path);assert.equal(checked(await api.storage.from('community-avatars').list(account.id,{search:first.avatar_path.split('/')[1]}),'Replaced object listing').length,0);
  await page.getByLabel('Publish my profile and picture').check();await page.getByRole('button',{name:'Save profile'}).click();await page.getByText('Profile saved.',{exact:true}).waitFor();
  const published=checked(await anon.from('community_profiles').select('*').eq('user_id',account.id).single(),'Public identity');assert.equal(published.email,undefined);
  await visitor.goto(base+'/people/'+account.id);await visitor.getByRole('heading',{name:'Fictional profile '+i,exact:true}).waitFor();await visitor.getByRole('img',{name:'Fictional profile '+i+' profile picture'}).waitFor();assert.equal(await visitor.getByRole('button',{name:'Save profile'}).count(),0);
  await visitor.reload();await visitor.getByRole('heading',{name:'Fictional profile '+i,exact:true}).waitFor();
  assert.equal(checked(await other.rpc('community_contributions',{p_user_id:account.id,p_kind:'problems',p_state:'draft',p_public:false}),'Draft boundary').length,0);
  assert.equal(checked(await anon.rpc('community_contributions',{p_user_id:account.id,p_kind:'problems',p_state:'draft',p_public:false}),'Anonymous draft boundary').length,0);
  for(const route of ['/dashboard','/my-problems?state=draft','/my-solutions','/my-solutions?accepted=1','/profile']){
   await page.goto(base+route);await page.getByRole('heading',{level:1}).waitFor();if(route==='/dashboard')await page.getByRole('heading',{name:'Recent problems'}).waitFor();else await page.getByRole('button',{name:'Next page'}).waitFor();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(audit.violations.map(v=>v.id),[],route);
  }
  await page.getByRole('button',{name:'Remove picture'}).click();await page.getByText('Picture removed.',{exact:true}).waitFor();assert.equal(checked(await api.storage.from('community-avatars').list(account.id,{search:second.avatar_path.split('/')[1]}),'Removed object listing').length,0);
  await page.getByLabel('Publish my profile and picture').uncheck();await page.getByRole('button',{name:'Save profile'}).click();await page.getByText('Profile saved.',{exact:true}).waitFor();
  await visitor.reload();await visitor.getByText('This profile is private or has not been created.').waitFor();
  await page.goto(base+'/dashboard');await page.getByRole('heading',{name:'Recent problems'}).waitFor();await page.screenshot({path:new URL('../supabase/.temp/profile-dashboard-mobile.png',import.meta.url).pathname.replace(/^\/(?=[A-Z]:)/,'') ,fullPage:true});
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:new URL('../supabase/.temp/profile-dashboard-desktop.png',import.meta.url).pathname.replace(/^\/(?=[A-Z]:)/,''),fullPage:true});
  await context.close();console.log('PASS profile account '+i+': owner edit, public/private identity, avatar upload/replace/remove, foreign Storage denial, draft privacy, mobile/direct refresh, accessibility.');
 }
}finally{
 for(let i=0;i<2;i++)if(originals[i]){const {user_id,...fields}=originals[i];checked(await clients[i].from('community_profiles').update(fields).eq('user_id',user_id),'Restore synthetic profile');}
 await browser.close();
}
