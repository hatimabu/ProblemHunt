import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {config,createClient,signedIn,client,checked,readJson} from './community-test-support.mjs';
const c=await config();
const keys=await readJson(new URL('../supabase/.temp/community-test-keys.json',import.meta.url));
const admin=createClient(c.url,keys.find(k=>k.name==='service_role').api_key,{auth:{persistSession:false}});
const file=new URL('../supabase/.temp/community-moderator.json',import.meta.url);
let account;
try{account=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;
 const email=`problemhunt-moderator-${Date.now()}@example.invalid`,password=randomBytes(24).toString('base64url');
 const u=checked(await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{username:'pilot_moderator',user_type:'builder'}}),'Create dedicated moderator');
 account={id:u.user.id,email,password};await writeFile(file,JSON.stringify(account));}
checked(await admin.from('community_moderators').upsert({user_id:account.id}),'Test moderator role');
const m=await signedIn(c,account),a=await signedIn(c,c.accounts[0]),b=await signedIn(c,c.accounts[1]),anon=client(c);
const examples=await readJson(new URL('../supabase/.temp/community-examples-results.json',import.meta.url));
const id=examples[0].id;
const report=checked(await b.from('community_reports').insert({problem_id:id,reason:'[Pilot test] Reversible safety review',details:'Fictional example only'}).select('id').single(),'Report');
assert.equal(checked(await a.from('community_reports').select('id').eq('id',report.id),'Author report privacy').length,0);
assert.equal((await b.rpc('community_moderate_report',{p_report_id:report.id,p_status:'actioned',p_notes:'Forbidden',p_action:'hide'})).error?.code,'42501');
try{
 checked(await m.rpc('community_moderate_report',{p_report_id:report.id,p_status:'actioned',p_notes:'Synthetic hide test',p_action:'hide'}),'Hide');
 assert.equal(checked(await anon.from('community_problems').select('id').eq('id',id),'Hidden read').length,0);
 assert.equal(checked(await b.from('community_report_reviews').select('*').eq('report_id',report.id),'Private notes').length,0);
}finally{checked(await m.rpc('community_moderate_report',{p_report_id:report.id,p_status:'dismissed',p_notes:'Synthetic test completed; restored',p_action:'restore'}),'Restore');}
assert.equal(checked(await anon.from('community_problems').select('id').eq('id',id),'Restored read').length,1);
const draft=checked(await a.from('community_problems').select('id').eq('visibility','draft').limit(1),'Draft fixture')[0];
if(draft)assert.equal(checked(await m.from('community_problems').select('id').eq('id',draft.id),'Moderator draft denial').length,0);
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const name=`${c.accounts[0].id}/pilot-${Date.now()}.png`;
assert.ok((await anon.storage.from('avatars').upload(name,bytes,{contentType:'image/png'})).error);
assert.ok((await b.storage.from('avatars').upload(name,bytes,{contentType:'image/png'})).error);
checked(await a.storage.from('avatars').upload(name,bytes,{contentType:'image/png'}),'Own avatar');
checked(await a.storage.from('avatars').remove([name]),'Remove only newly created test avatar');
console.log('PASS hosted safety: report privacy, unauthorized moderation denial, hide/restore, private review notes, moderator draft denial and real Storage anonymous/foreign-folder denial with own upload success.');
