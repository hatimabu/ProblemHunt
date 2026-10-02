// Dedicated local Auth only. Never uses linked-project credentials or hosted keys.
import {readFile, writeFile, rename} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {createClient, checked} from './community-test-support.mjs';
const root = new URL('../supabase/.temp/core-integration/', import.meta.url);
const status = JSON.parse(await readFile(new URL('status.json', root), 'utf8'));
if (status.API_URL !== 'http://127.0.0.1:55321') throw new Error('Dedicated local integration API required');
const target = new URL('accounts.json', root);
if(process.argv.slice(2).some(arg=>arg!=='--fresh'))throw new Error('Only --fresh is supported');
if(process.argv.includes('--fresh')){
  try{await rename(target,new URL(`accounts-${Date.now()}.json`,root));}
  catch(error){if(error.code!=='ENOENT')throw error;}
}
let config;
try { config = JSON.parse(await readFile(target, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (config) {
  if (config.ref !== 'problemhunt-core-integration' || config.url !== status.API_URL) throw new Error('Unexpected existing test configuration');
} else config = {ref:'problemhunt-core-integration', url:status.API_URL, anonKey:status.ANON_KEY, accounts:[]};
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {auth:{persistSession:false,autoRefreshToken:false}});
for (const label of ['author','contributor']) {
  if (config.accounts.some(account => account.label === label)) continue;
  const email = `core-${label}-${Date.now()}@example.invalid`, password = randomBytes(24).toString('base64url');
  const {user} = checked(await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{username:`core_${label}_${Date.now()}`,user_type:'builder'}}), 'Create local test account');
  config.accounts.push({label,id:user.id,email,password});
  await writeFile(target, JSON.stringify(config,null,2));
}
console.log('Local synthetic accounts ready; credentials retained only in ignored test directory.');
