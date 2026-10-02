// Local synthetic accounts only; no hosted connection or export destination accepted.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../supabase/.temp/core-integration/',import.meta.url);
const c=JSON.parse(await readFile(new URL('accounts.json',root),'utf8'));
assert.equal(c.ref,'problemhunt-core-integration');assert.equal(c.url,'http://127.0.0.1:55321');
const input=await readFile(new URL('../supabase/operations/account-export.sql',import.meta.url),'utf8');
for(const account of c.accounts){
 assert.match(account.id,/^[0-9a-f-]{36}$/);
 const args=['exec','-i','-e','PGPASSWORD=postgres','supabase_db_problemhunt-core-integration','psql','-X','-qAt','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-v',`account_id=${account.id}`];
 const output=execFileSync(process.platform==='win32'?'wsl':'docker',process.platform==='win32'?['-d','Ubuntu','--','docker',...args]:args,{input,encoding:'utf8',stdio:['pipe','pipe','pipe']});
 const data=JSON.parse(output);
 assert.equal(data.account.id,account.id);assert.equal(data.account.email,account.email);
 assert.deepEqual(Object.keys(data.account).sort(),['created_at','email','id']);
 for(const row of data.acceptance_history)assert.equal(row.solution_snapshot,undefined);
 for(const row of data.reputation)assert.equal(row.event_key,undefined);
 for(const collection of ['posts','solutions','comments'])for(const row of data[collection])assert.equal(row.author_id,account.id);
 for(const collection of ['profile','tag_follows','saved_cases','discussion_follows','notifications','reputation'])for(const row of data[collection])assert.equal(row.user_id,account.id);
 assert.ok(!output.includes(account.password));
 for(const other of c.accounts.filter(row=>row.id!==account.id))assert.ok(!output.includes(other.email));
 await writeFile(new URL(`export-${account.label}.json`,root),JSON.stringify(data,null,2));
}
console.log('PASS: both local account exports contain only the selected owner’s content/account email, no credentials or other account email. Protected output stays ignored.');
