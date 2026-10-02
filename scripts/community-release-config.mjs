// Fail a release before build if its public contact or core scope is unconfigured.
const value=(process.env.VITE_SUPPORT_CONTACT||'').trim();
let valid=false;
try{
 const url=new URL(value);
 valid=(url.protocol==='https:'&&!url.username&&!url.password)||(url.protocol==='mailto:'&&/^[^\s@?]+@[^\s@?]+\.[^\s@?]+$/.test(url.pathname)&&!url.search);
}catch{}
if(!valid)throw new Error('Set the repository SUPPORT_CONTACT variable to a monitored mailto: address or HTTPS contact page before release.');
if(process.env.VITE_REPLY_NOTIFICATIONS_ENABLED!=='false')throw new Error('Core release requires reply notifications explicitly disabled.');
console.log('Core release public contact and notification configuration validated.');
