import { readFile } from 'node:fs/promises';
export async function databaseConfig(env = process.env, admin = false) {
  const cloud = env.NOTIFICATION_ENV === 'azure-lab';
  if (env.NOTIFICATION_ENV && !['local', 'azure-lab'].includes(env.NOTIFICATION_ENV)) throw new Error('Unknown environment');
  if (env.PGDATABASE !== 'problemhunt_notification_lab') throw new Error('An isolated notification lab database is required');
  if (cloud) {
    if (admin || !/^phnotif-[a-z0-9]{13}\.postgres\.database\.azure\.com$/.test(env.PGHOST ?? '')) throw new Error('Unexpected isolated Azure database');
  } else if (!['db', 'localhost', '127.0.0.1', '::1'].includes(env.PGHOST)) throw new Error('A local notification lab database is required');
  if (env.PGUSER !== (admin ? 'postgres' : 'notification_worker_login')) throw new Error('Unexpected database role');
  const password = cloud ? env.PGPASSWORD : (await readFile(env.PGPASSWORD_FILE, 'utf8')).trim();
  if (!/^[a-f0-9]{48}$/.test(password)) throw new Error('Generate local lab credentials with lab:prepare');
  return { host: env.PGHOST, port: 5432, database: env.PGDATABASE, user: env.PGUSER, password, ssl: cloud ? { rejectUnauthorized: true } : false,
    max: 1, connectionTimeoutMillis: 5000, query_timeout: 10000, statement_timeout: 10000, application_name: 'community-notification-worker' };
}
