import pg from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import { databaseConfig } from '../src/config.mjs';
const db = new pg.Client(await databaseConfig(process.env, true));
try {
  await db.connect();
  // No hosted URL/config is accepted. This container-only database is a disposable platform approximation.
  const ready = await db.query("SELECT to_regclass('public.notification_lab_ready') AS ready");
  if (!ready.rows[0].ready) {
    const existing = await db.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname='public'");
    if (existing.rows[0].n) throw new Error('Partial/nonempty lab; inspect it before recreating its dedicated volume');
    await db.query(await readFile('/app/supabase/tests/bootstrap.sql', 'utf8'));
    for (const file of (await readdir('/app/supabase/migrations')).filter(f => f.endsWith('.sql')).sort()) await db.query(await readFile(`/app/supabase/migrations/${file}`, 'utf8'));
    const password = (await readFile('/run/secrets/worker_password', 'utf8')).trim();
    if (!/^[a-f0-9]{48}$/.test(password)) throw new Error('Invalid local worker password');
    await db.query(`CREATE ROLE notification_worker_login LOGIN PASSWORD '${password}'`);
    await db.query('GRANT community_notification_worker TO notification_worker_login');
    await db.query('CREATE TABLE public.notification_lab_ready(version integer); INSERT INTO public.notification_lab_ready VALUES(2)');
  } else {
    const {rows} = await db.query('SELECT version FROM public.notification_lab_ready');
    if (rows.length !== 1 || ![1,2].includes(rows[0].version)) throw new Error('Unknown local lab version');
    if (rows[0].version === 1) {
      // One explicit additive local upgrade; preserve the existing volume and its data.
      const upgrade = await readFile('/app/supabase/migrations/20260929000100_notification_observability.sql', 'utf8');
      await db.query(upgrade.replace(/COMMIT;\s*$/, 'UPDATE public.notification_lab_ready SET version=2; COMMIT;'));
    }
  }
  console.log('Local notification lab initialized. No hosted service was contacted.');
} catch { console.error('Lab initialization failed; inspect the dedicated local database.'); process.exitCode = 1; }
finally { await db.end(); }
