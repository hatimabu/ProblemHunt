import { mkdir, writeFile, readdir, copyFile, rm } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';
const dir = new URL('../.local/', import.meta.url);
await mkdir(dir, { recursive: true });
for (const name of ['admin-password', 'worker-password']) {
  try { await writeFile(new URL(name, dir), randomBytes(24).toString('hex'), { flag: 'wx', mode: 0o600 }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
}
// Explicit allowlist avoids scanning node_modules/backups on Windows-mounted Docker contexts.
const local = fileURLToPath(dir), context = resolve(local, 'context');
if(dirname(context)!==resolve(local))throw new Error('Build context must stay inside this lab directory');
await rm(context,{recursive:true,force:true});
const root=new URL('../../../',import.meta.url);
const files=['services/notifications/package.json','services/notifications/package-lock.json','services/notifications/Dockerfile','supabase/tests/bootstrap.sql'];
for(const folder of ['services/notifications/src','services/notifications/lab','supabase/migrations'])for(const name of await readdir(new URL(`${folder}/`,root)))if(/\.(mjs|sql)$/.test(name))files.push(`${folder}/${name}`);
for(const name of files){const target=join(context,name);await mkdir(dirname(target),{recursive:true});await copyFile(new URL(name,root),target);}
await writeFile(join(context,'.dockerignore'),'**/node_modules\n**/.local\n**/.env*\n');
console.log(`Local ignored credentials preserved; prepared ${files.length} allowlisted build files.`);
