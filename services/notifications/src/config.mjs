import { readFile } from 'node:fs/promises';
export async function databaseConfig(env = process.env, admin = false) {
  // This release is deliberately local-only. Hosted support needs a reviewed later adapter/config.
  if (!['db', 'localhost', '127.0.0.1', '::1'].includes(env.PGHOST) || env.PGDATABASE !== 'problemhunt_notification_lab') throw new Error('A local notification lab database is required');
  if (env.PGUSER !== (admin ? 'postgres' : 'notification_worker_login')) throw new Error('Unexpected database role');
  const password = (await readFile(env.PGPASSWORD_FILE, 'utf8')).trim();
  if (!/^[a-f0-9]{48}$/.test(password)) throw new Error('Generate local lab credentials with lab:prepare');
  return { host: env.PGHOST, port: 5432, database: env.PGDATABASE, user: env.PGUSER, password,
    max: 1, connectionTimeoutMillis: 5000, query_timeout: 10000, statement_timeout: 10000, application_name: 'community-notification-worker' };
}
