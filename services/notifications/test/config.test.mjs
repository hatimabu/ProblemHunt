import { test } from 'node:test';
import assert from 'node:assert/strict';
import { databaseConfig } from '../src/config.mjs';
test('worker refuses remote hosts, unrelated databases and privileged logins before reading credentials',async()=>{
 const base={PGHOST:'db',PGDATABASE:'problemhunt_notification_lab',PGUSER:'notification_worker_login'};
 for(const env of [{...base,PGHOST:'example.supabase.co'},{...base,PGDATABASE:'postgres'},{...base,PGUSER:'postgres'}])await assert.rejects(databaseConfig(env));
});
