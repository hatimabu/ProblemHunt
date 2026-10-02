// Local Auth + captured local mail only. Never sends an external email.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import {config,client} from './community-test-support.mjs';
const c=await config();assert.equal(c.ref,'problemhunt-core-integration');assert.equal(c.url,'http://127.0.0.1:55321');
const email=`core-signup-${Date.now()}@example.invalid`,password=randomBytes(18).toString('base64url'),newPassword=randomBytes(18).toString('base64url');
await writeFile(new URL('../supabase/.temp/core-integration/auth-browser-account.json',import.meta.url),JSON.stringify({email,password,newPassword},null,2));
const require=createRequire(new URL('../supabase/tests/package.json',import.meta.url));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:process.platform==='win32'?'msedge':undefined});
async function mailLink(type){
 for(let attempt=0;attempt<30;attempt++){
  const mailbox=await (await fetch('http://127.0.0.1:55324/api/v1/messages')).json();
  for(const item of mailbox.messages.filter(m=>m.To.some(to=>to.Address===email))){
   const mail=await (await fetch(`http://127.0.0.1:55324/api/v1/message/${item.ID}`)).json();
   const links=[...(mail.HTML||'').matchAll(/href="([^"]+)"/g)].map(match=>match[1].replaceAll('&amp;','&'));
   for(const link of links){
    const url=new URL(link);if(url.origin===c.url&&url.pathname==='/auth/v1/verify'&&url.searchParams.get('type')===type)return link;
   }
  }
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 throw new Error(`No captured local ${type} email arrived`);
}
try{
 const context=await browser.newContext(),page=await context.newPage();
 await page.route('https://*.supabase.co/**',route=>route.abort());
 await page.goto('http://127.0.0.1:4173/auth');await page.getByRole('tab',{name:'Sign up',exact:true}).click();
 await page.getByLabel('Username',{exact:true}).fill(`signup_${Date.now()}`);
 await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Create account'}).click();await page.getByText('Check your email to confirm your account, then sign in.').waitFor();
 assert.ok((await client(c).auth.signInWithPassword({email,password})).error,'Unconfirmed login must fail');
 await page.goto(await mailLink('signup'));await page.waitForURL(url=>url.origin==='http://127.0.0.1:4173');
 await page.getByRole('button',{name:'Sign out',exact:true}).waitFor();
 await page.goto('http://127.0.0.1:4173/profile');await page.getByRole('heading',{name:'Your profile',exact:true}).waitFor();
 await context.close();
 const recoveryContext=await browser.newContext(),recovery=await recoveryContext.newPage();
 await recovery.goto('http://127.0.0.1:4173/auth');await recovery.getByRole('button',{name:'Forgot your password?'}).click();
 await recovery.getByLabel('Email',{exact:true}).fill(email);await recovery.getByRole('button',{name:'Send reset link'}).click();
 await recovery.getByText('Check your email for a secure password reset link.').waitFor();
 await recovery.goto(await mailLink('recovery'));await recovery.getByLabel('New password',{exact:true}).waitFor();
 await recovery.getByLabel('New password',{exact:true}).fill(newPassword);await recovery.getByLabel('Confirm password',{exact:true}).fill(newPassword);
 await recovery.getByRole('button',{name:'Update password',exact:true}).click();await recovery.getByText('Your password has been updated. You can now sign in with your new password.').waitFor();
 assert.equal(new URL(recovery.url()).search,'');assert.equal(new URL(recovery.url()).hash,'');
 assert.ok((await client(c).auth.signInWithPassword({email,password})).error,'Old password must fail');
 const signed=await client(c).auth.signInWithPassword({email,password:newPassword});assert.equal(signed.error,null);assert.equal(signed.data.user.email,email);
 const invalidContext=await browser.newContext(),invalid=await invalidContext.newPage();await invalid.goto('http://127.0.0.1:4173/reset-password?error_code=otp_expired');
 await invalid.getByText('This password reset link is invalid or has expired. Request a new one to continue.').waitFor();assert.equal(await invalid.getByRole('button',{name:'Update password'}).count(),0);
 console.log('PASS real local Auth/mail: signup confirmation required, captured confirmation, PKCE recovery, changed password, old password denied, callback cleared and expired-link handling.');
}finally{await browser.close();}
