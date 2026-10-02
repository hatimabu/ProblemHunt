import {mkdir,copyFile} from 'node:fs/promises';
const target=new URL('../supabase/.temp/core-integration/supabase/',import.meta.url);
await mkdir(target,{recursive:true});
await copyFile(new URL('../supabase/integration/config.toml',import.meta.url),new URL('config.toml',target));
console.log('Prepared dedicated local config. Start with: supabase start --workdir supabase/.temp/core-integration');
console.log('Automatic migrations are disabled. Run community-local-replay.mjs only against a fresh local stack. No hosted link or keys are copied.');
