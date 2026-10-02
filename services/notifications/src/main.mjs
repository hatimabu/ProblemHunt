import pg from 'pg';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { databaseConfig } from './config.mjs';
import { runOnce } from './worker.mjs';
import { createTelemetry } from './telemetry.mjs';

let stopping = false, healthyAt = 0, pool;
const telemetry = createTelemetry();
let snapshotAt = 0;
const healthy = () => !stopping && Date.now() - healthyAt < 30000;
const controller = new AbortController();
const server = createServer((req, res) => {
  if (req.url === '/metrics') { res.writeHead(200, {'Content-Type':'text/plain; version=0.0.4'}).end(telemetry.metrics(healthy())); return; }
  if (req.url === '/live') { res.writeHead(stopping ? 503 : 200).end(); return; }
  if (req.url !== '/health') { res.writeHead(404).end(); return; }
  res.writeHead(healthy() ? 200 : 503).end(stopping ? 'stopping' : 'worker');
});
function stop() {
  if (stopping) return;
  stopping = true; controller.abort();
  telemetry.log('stopping');
  // Bound shutdown even on a broken connection. Expired leases recover unfinished work.
  setTimeout(() => process.exit(1), 20000).unref();
}
process.on('SIGTERM', stop); process.on('SIGINT', stop);
try {
  pool = new pg.Pool(await databaseConfig());
  pool.on('error', () => { healthyAt = 0; telemetry.log('database_unavailable'); });
  server.listen(8080, '0.0.0.0');
  telemetry.log('started');
  while (!stopping) {
    const start = performance.now();
    let outcome = 'error';
    try { outcome = await runOnce(pool, { telemetry }); healthyAt = Date.now(); }
    catch { healthyAt = 0; telemetry.log('cycle_failed'); }
    telemetry.observe(outcome, (performance.now() - start) / 1000);
    if (!stopping && Date.now() - snapshotAt >= 30000) {
      snapshotAt = Date.now();
      try { telemetry.snapshot((await pool.query('SELECT * FROM public.community_notification_stats()')).rows[0]); }
      catch { telemetry.log('snapshot_failed'); }
    }
    if (!stopping) await delay(1000, undefined, { signal: controller.signal }).catch(() => {});
  }
} catch { telemetry.log('startup_failed'); process.exitCode = 1; }
finally { server.close(); await pool?.end(); }
