import {createRequire} from 'node:module';
import {config,readJson} from './community-test-support.mjs';
const require=createRequire(new URL('../supabase/tests/package.json',import.meta.url));
const {chromium}=require('playwright');const c=await config();
const mod=await readJson(new URL('../supabase/.temp/community-moderator.json',import.meta.url));
const browser=await chromium.launch({headless:true,channel:process.platform==='win32'?'msedge':undefined});
try {
 for(const [role,account] of [['contributor',c.accounts[1]],['moderator',mod]]){
  const context=await browser.newContext();const page=await context.newPage();
  await page.route('https://*.supabase.co/**',r=>new URL(r.request().url()).origin===c.url?r.continue():r.abort());
  const responses=[];page.on('response',r=>{if(r.url().includes('/rest/v1/'))responses.push({path:new URL(r.url()).pathname,status:r.status()});});
  await page.goto('http://127.0.0.1:4173/auth');await page.getByLabel('Email',{exact:true}).fill(account.email);await page.getByLabel('Password',{exact:true}).fill(account.password);await page.getByRole('button',{name:'Login',exact:true}).click();await page.waitForURL('**/dashboard');
  for(let i=0;i<3;i++){
   await page.goto('http://127.0.0.1:4173/moderation');
   const expected=role==='contributor'?page.getByText('You do not have moderator permission.'):page.getByRole('article').first();
   try{await expected.waitFor();}catch(e){console.log(JSON.stringify({role,path:new URL(page.url()).pathname,status:await page.getByRole('status').allTextContents(),alerts:await page.getByRole('alert').allTextContents(),headings:await page.getByRole('heading',{level:1}).allTextContents(),responses}));throw e;}
  }
  await context.close();console.log('PASS repeated moderation direct navigation: '+role);
 }
} finally {await browser.close();}
