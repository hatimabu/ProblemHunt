import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {config} from './community-test-support.mjs';
const c=await config();assert.equal(c.ref,'problemhunt-core-integration');
const require=createRequire(new URL('../supabase/tests/package.json',import.meta.url));
const {chromium}=require('playwright'),{default:AxeBuilder}=require('@axe-core/playwright');
const browser=await chromium.launch({headless:true,channel:process.platform==='win32'?'msedge':undefined});
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:950}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://*.supabase.co/**',route=>route.abort());
  for(const route of ['/','/browse','/privacy','/notifications']){
   const response=await page.goto('http://127.0.0.1:4173'+route);
   assert.equal(response.status(),200);assert.equal(response.headers()['x-content-type-options'],'nosniff');
   await page.getByRole('heading',{level:1}).first().waitFor();
   if(route==='/notifications')await page.getByText(/Reply notifications are not available yet/).waitFor();
   else assert.equal(await page.getByRole('link',{name:'Reply notifications',exact:true}).count(),0);
   assert.equal(await page.getByText(/community service is not ready/).count(),0);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
   assert.deepEqual(audit.violations.map(v=>v.id),[],`${width} ${route}`);
   if(route==='/')await page.screenshot({path:fileURLToPath(new URL(`../supabase/.temp/core-integration/home-${width}.png`,import.meta.url)),fullPage:true});
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS core candidate: real local backend, desktop/mobile navigation, notifications disabled, headers, accessibility, no overflow or page errors.');
}finally{await browser.close();}
