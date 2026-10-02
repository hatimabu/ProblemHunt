// Read-only hosted migration inventory. Never applies SQL or reads database credentials.
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
if(process.argv.slice(2).join(' ')!=='--read-only') throw new Error('Usage: node scripts/community-release-inventory.mjs --read-only');
const output=execFileSync('supabase',['migration','list','--linked'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const remote=[...output.matchAll(/^\s*\d*\s*\|\s*(\d+)\s*\|/gm)].map(match=>match[1]);
if(!remote.length)throw new Error('No migration history parsed; stop and inspect CLI output manually');
const directory=new URL('../supabase/migrations/',import.meta.url);
const files=(await readdir(directory)).filter(file=>file.endsWith('.sql')).sort();
const local=await Promise.all(files.map(async file=>({file,version:file.split('_')[0],sha256:createHash('sha256').update(await readFile(new URL(file,directory))).digest('hex')})));
const report={checkedAt:new Date().toISOString(),readOnly:true,remoteVersions:remote,pending:local.filter(m=>!remote.includes(m.version)),missingLocally:remote.filter(version=>!local.some(m=>m.version===version))};
await writeFile(new URL('../supabase/.temp/core-release-inventory.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
