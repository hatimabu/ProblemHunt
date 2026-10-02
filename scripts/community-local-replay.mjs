// Explicitly named local container only. No URL, host or remote target is accepted.
import {execFileSync} from 'node:child_process';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
if(process.argv.length!==2)throw new Error('No target arguments accepted');
const container='supabase_db_problemhunt-core-integration';
function sql(input){
 const args=['exec','-i','-e','PGPASSWORD=postgres',container,'psql','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-At'];
 return execFileSync(process.platform==='win32'?'wsl':'docker',process.platform==='win32'?['-d','Ubuntu','--','docker',...args]:args,{input,encoding:'utf8',stdio:['pipe','pipe','pipe']});
}
const occupied=sql("SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename IN ('wallets','profiles','community_problems');").trim();
if(occupied!=='0')throw new Error('Local application tables already exist. Refusing replay or reset; retain the existing test data.');
const dir=new URL('../supabase/migrations/',import.meta.url);
const files=(await readdir(dir)).filter(file=>file.endsWith('.sql')).sort(), applied=[];
for(const file of files){
 const content=await readFile(new URL(file,dir),'utf8');
 sql(content);
 applied.push({file,sha256:createHash('sha256').update(content).digest('hex')});
 console.log(`Applied locally: ${file}`);
}
await writeFile(new URL('../supabase/.temp/core-integration/replay.json',import.meta.url),JSON.stringify({at:new Date().toISOString(),container,role:'supabase_admin',applied},null,2));
console.log('Local replay complete. Platform owner is needed by historical Storage DDL; this does not prove hosted migration permissions.');
