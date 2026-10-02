const outcomes = ['idle', 'delivered', 'suppressed', 'retry', 'failed', 'lease_lost', 'error'];
const gauges = ['undispatched', 'ready', 'processing', 'failed', 'expired_leases', 'oldest_pending_seconds'];
const bounds = [0.01, 0.05, 0.1, 0.5, 1, 5, 15, 30];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const events = ['claimed', 'completed', 'cycle_failed', 'database_unavailable', 'startup_failed', 'started', 'stopping', 'queue_snapshot', 'snapshot_failed'];
export function createTelemetry(write = line => console.log(line), now = Date.now) {
  const counts = Object.fromEntries(outcomes.map(x => [x, 0]));
  const buckets = bounds.map(() => 0);
  let total = 0, durationSum = 0, snapshot = {}, snapshotAt = 0;
  function log(event, data = {}) {
    if (!events.includes(event)) return;
    // Construct an allowlisted record; never serialize errors, connection config or arbitrary fields.
    const record = { time: new Date(now()).toISOString(), service: 'notification-worker', event };
    if (uuid.test(data.event_id ?? '')) record.correlation_id = data.event_id;
    if (Number.isInteger(data.attempts) && data.attempts >= 1 && data.attempts <= 5) record.attempt = data.attempts;
    if (outcomes.includes(data.outcome)) record.outcome = data.outcome;
    if (Number.isFinite(data.duration_ms) && data.duration_ms >= 0) record.duration_ms = Math.round(data.duration_ms);
    if (event === 'queue_snapshot') for (const key of gauges) record[key] = snapshot[key];
    write(JSON.stringify(record));
  }
  return {
    log,
    observe(outcome, seconds) {
      if (!outcomes.includes(outcome) || !Number.isFinite(seconds) || seconds < 0) return;
      counts[outcome]++; total++; durationSum += seconds;
      bounds.forEach((bound, i) => { if (seconds <= bound) buckets[i]++; });
    },
    snapshot(row) {
      const next = {};
      for (const key of gauges) { const n = Number(row[key]); if (!Number.isFinite(n) || n < 0) throw new Error('Invalid aggregate'); next[key] = n; }
      snapshot = next; snapshotAt = now(); log('queue_snapshot');
    },
    metrics(healthy) {
      const lines = ['# TYPE notification_cycles_total counter', ...outcomes.map(x => `notification_cycles_total{outcome="${x}"} ${counts[x]}`),
        '# TYPE notification_cycle_duration_seconds histogram',
        ...bounds.map((b, i) => `notification_cycle_duration_seconds_bucket{le="${b}"} ${buckets[i]}`),
        `notification_cycle_duration_seconds_bucket{le="+Inf"} ${total}`,
        `notification_cycle_duration_seconds_sum ${durationSum}`, `notification_cycle_duration_seconds_count ${total}`,
        `notification_worker_healthy ${healthy ? 1 : 0}`, `notification_snapshot_available ${snapshotAt && now() - snapshotAt < 90000 ? 1 : 0}`,
        `notification_snapshot_age_seconds ${snapshotAt ? Math.max(0, (now() - snapshotAt) / 1000) : 0}`];
      for (const key of gauges) if (key in snapshot) lines.push(`notification_queue_${key} ${snapshot[key]}`);
      return lines.join('\n') + '\n';
    },
  };
}
