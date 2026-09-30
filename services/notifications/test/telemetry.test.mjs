import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTelemetry } from '../src/telemetry.mjs';
import { databaseConfig } from '../src/config.mjs';
import { runOnce } from '../src/worker.mjs';

test('logs allow only operational fields; IDs never become metric labels', () => {
  const lines = [], telemetry = createTelemetry(line => lines.push(line));
  telemetry.log('claimed', { event_id: '00000000-0000-0000-0000-000000000001', attempts: 2, password: 'secret', message: 'private content', recipient_id: 'private-user' });
  telemetry.log('completed', { event_id: 'injected\ncontent', outcome: 'delivered', error: new Error('secret') });
  telemetry.log('unknown', { message: 'secret' });
  assert.equal(lines.length, 2);
  assert.equal(JSON.parse(lines[0]).attempt, 2);
  assert.equal(JSON.parse(lines[0]).correlation_id, '00000000-0000-0000-0000-000000000001');
  assert.doesNotMatch(lines.join(''), /secret|private|injected/);
  assert.doesNotMatch(telemetry.metrics(true), /00000000|recipient|correlation/);
});
test('counters, duration buckets and stale queue snapshots have explicit semantics', () => {
  let clock = 100000;
  const telemetry = createTelemetry(() => {}, () => clock);
  telemetry.observe('retry', 0.04); telemetry.observe('delivered', 0.2); telemetry.observe('error', NaN);
  telemetry.snapshot({ undispatched: '2', ready: 1, processing: 0, failed: 3, expired_leases: 0, oldest_pending_seconds: 9 });
  const text = telemetry.metrics(true);
  assert.match(text, /notification_cycles_total\{outcome="retry"\} 1/);
  assert.match(text, /notification_cycle_duration_seconds_bucket\{le="0.05"\} 1/);
  assert.match(text, /notification_cycle_duration_seconds_count 2/);
  assert.match(text, /notification_queue_failed 3/);
  assert.match(text, /notification_snapshot_available 1/);
  clock += 90001; assert.match(telemetry.metrics(false), /notification_snapshot_available 0/);
  assert.throws(() => telemetry.snapshot({ready: -1}));
});
test('lost failure lease is reported honestly instead of claiming a retry was scheduled', async () => {
  let call = 0; const logs = [];
  const db = {query: async () => {
    call++;
    if (call === 1) return {rows: []};
    if (call === 2) return {rows: [{event_id: '00000000-0000-0000-0000-000000000001', lease_id: 'lease', attempts: 2}]};
    if (call === 3) throw new Error('sensitive database detail');
    return {rows: [{recorded: false}]};
  }};
  assert.equal(await runOnce(db, {telemetry: createTelemetry(x => logs.push(x))}), 'lease_lost');
  assert.equal(JSON.parse(logs[1]).outcome, 'lease_lost');
  assert.doesNotMatch(logs.join(''), /sensitive|lease_id/);
});
test('Azure lab config requires an isolated host and verified TLS and rejects admin mode', async () => {
  const env = {NOTIFICATION_ENV:'azure-lab', PGHOST:'phnotif-abcdefghijklm.postgres.database.azure.com', PGDATABASE:'problemhunt_notification_lab', PGUSER:'notification_worker_login', PGPASSWORD:'a'.repeat(48)};
  assert.deepEqual((await databaseConfig(env)).ssl, {rejectUnauthorized:true});
  await assert.rejects(databaseConfig({...env, PGHOST:'production.postgres.database.azure.com'}));
  await assert.rejects(databaseConfig({...env, PGDATABASE:'postgres'}));
  await assert.rejects(databaseConfig(env, true));
});
