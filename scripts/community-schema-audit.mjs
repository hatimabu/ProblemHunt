import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../supabase/tests/package.json',import.meta.url));const {Client}=require('pg');
const raw=await readFile(new URL('../supabase/.temp/release-dump-command.txt',import.meta.url),'utf8');
function variable(name){const m=raw.match(new RegExp('(?:export )?'+name+'=(.*)'));if(!m)throw new Error('Missing connection field');return m[1].trim().replace(/^['"]|['"]$/g,'');}
const pg=new Client({host:variable('PGHOST'),port:Number(variable('PGPORT')),user:variable('PGUSER'),password:variable('PGPASSWORD'),database:variable('PGDATABASE'),ssl:{rejectUnauthorized:false},connectionTimeoutMillis:10000});
try{
 await pg.connect();await pg.query('BEGIN READ ONLY');
 const tables=(await pg.query("SELECT c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname")).rows;
 const policies=(await pg.query("SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname IN ('public','storage') ORDER BY schemaname,tablename,policyname")).rows;
 const routines=(await pg.query("SELECT p.oid::regprocedure::text signature,p.prosecdef,has_function_privilege('anon',p.oid,'EXECUTE') anon,has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f' AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.objid=p.oid AND d.deptype='e') ORDER BY 1")).rows;
 const grants=(await pg.query("SELECT grantee,table_name,privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND grantee IN ('anon','authenticated') ORDER BY table_name,grantee,privilege_type")).rows;
 await pg.query('ROLLBACK');await writeFile(new URL('../supabase/.temp/release-schema-audit.json',import.meta.url),JSON.stringify({tables,policies,routines,grants},null,2));
 console.log(JSON.stringify({tables:tables.length,communityTables:tables.filter(t=>t.relname.startsWith('community_')).length,communityRlsOff:tables.filter(t=>t.relname.startsWith('community_')&&!t.relrowsecurity),policies:policies.length,legacyCallable:routines.filter(r=>!r.signature.startsWith('community_')&&(r.anon||r.authenticated)).map(r=>r.signature)},null,2));
}finally{await pg.end();}
