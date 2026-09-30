import pg from 'pg';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { databaseConfig } from './config.mjs';
import { runOnce } from './worker.mjs';

let stopping = false, healthyAt = 0, pool;
const controller = new AbortController();
const server = createServer((req, res) => {
  if (req.url !== '/health') { res.writeHead(404).end(); return; }
  res.writeHead(!stopping && Date.now() - healthyAt < 30000 ? 200 : 503).end(stopping ? 'stopping' : 'worker');
});
function stop() {
  if (stopping) return;
  stopping = true; controller.abort();
  // Bound shutdown even on a broken connection. Expired leases recover unfinished work.
  setTimeout(() => process.exit(1), 20000).unref();
}
process.on('SIGTERM', stop); process.on('SIGINT', stop);
try {
  pool = new pg.Pool(await databaseConfig());
  pool.on('error', () => { healthyAt = 0; console.error('notification_database_unavailable'); });
  server.listen(8080, '0.0.0.0');
  while (!stopping) {
    try { const outcome = await runOnce(pool); healthyAt = Date.now(); if (outcome !== 'idle') console.log(`notification_${outcome}`); }
    catch { healthyAt = 0; console.error('notification_cycle_failed'); }
    if (!stopping) await delay(1000, undefined, { signal: controller.signal }).catch(() => {});
  }
} catch { console.error('notification_startup_failed'); process.exitCode = 1; }
finally { server.close(); await pool?.end(); }
