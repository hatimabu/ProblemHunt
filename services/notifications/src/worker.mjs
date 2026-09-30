// SQL owns authorization, durable state and fencing; the worker never reads reply text.
export async function runOnce(db, hooks = {}) {
  await db.query('SELECT public.community_dispatch_notifications(50)');
  const { rows } = await db.query('SELECT * FROM public.community_claim_notification(30)');
  if (!rows.length) return 'idle';
  const job = rows[0], args = [job.event_id, job.lease_id];
  // Test hooks model abrupt process loss: intentionally outside the recoverable catch.
  await hooks.afterClaim?.(job);
  let outcome;
  try {
    const result = await db.query('SELECT public.community_deliver_notification($1,$2) AS outcome', args);
    outcome = result.rows[0].outcome;
  } catch (error) {
    await db.query('SELECT public.community_fail_notification($1,$2,$3)', [...args, error.code === '23514' ? 'invalid_event' : 'processing_error']);
    return 'retry';
  }
  await hooks.afterDelivery?.(job);
  const ack = await db.query('SELECT public.community_ack_notification($1,$2) AS acknowledged', args);
  return ack.rows[0].acknowledged ? outcome : 'lease_lost';
}
