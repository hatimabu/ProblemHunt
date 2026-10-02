// Fail a release before build if its public contact or core scope is unconfigured.
const value=(process.env.VITE_SUPPORT_CONTACT||'').trim();
let valid=false;
try{
 const url=new URL(value);
 valid=(url.protocol==='https:'&&!url.username&&!url.password)||(url.protocol==='mailto:'&&/^[^\s@?]+@[^\s@?]+\.[^\s@?]+$/.test(url.pathname)&&!url.search);
}catch{}
if(!valid)throw new Error('Set the repository SUPPORT_CONTACT variable or secret to a monitored mailto: address or HTTPS contact page before release.');
if(process.env.VITE_REPLY_NOTIFICATIONS_ENABLED!=='false')throw new Error('Core release requires reply notifications explicitly disabled.');
console.log('Core release public contact and notification configuration validated.');

// Anonymous calls must be denied by the installed RPC permissions, not fail
// because the required privacy migration is missing. Never send user data.
const api=new URL(process.env.VITE_SUPABASE_URL);
if(api.protocol!=='https:')throw new Error('Production Supabase URL must use HTTPS');
const key=process.env.VITE_SUPABASE_ANON_KEY;
if(!key)throw new Error('Production Supabase anonymous key is missing');
const response=await fetch(new URL('/rest/v1/rpc/community_export_account',api),{
 method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000),
});
const result=await response.json();
if(![401,403].includes(response.status)||result.code!=='42501')throw new Error('Required account privacy RPC/permissions are not verified. Review and apply the approved privacy migration before deployment.');
console.log('Required privacy RPC exists and denies anonymous access.');
