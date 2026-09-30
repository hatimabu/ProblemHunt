BEGIN;
-- Aggregate operations data only; no event, actor, recipient or content identifiers.
CREATE FUNCTION public.community_notification_stats()
RETURNS TABLE(undispatched bigint, ready bigint, processing bigint, failed bigint,
 expired_leases bigint, oldest_pending_seconds double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT
  (SELECT count(*) FROM public.community_notification_outbox WHERE dispatched_at IS NULL),
  count(*) FILTER (WHERE q.status='ready'),
  count(*) FILTER (WHERE q.status='processing'),
  count(*) FILTER (WHERE q.status='failed'),
  count(*) FILTER (WHERE q.status='processing' AND q.lease_until<statement_timestamp()),
  coalesce((SELECT greatest(0,extract(epoch FROM statement_timestamp()-min(e.created_at)))::double precision
    FROM public.community_notification_outbox e
    LEFT JOIN public.community_notification_queue pending ON pending.event_id=e.id
    WHERE e.dispatched_at IS NULL OR pending.status IN ('ready','processing')),0)
 FROM public.community_notification_queue q WHERE q.status<>'done';
$$;
REVOKE ALL ON FUNCTION public.community_notification_stats() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.community_notification_stats() TO community_notification_worker;
COMMIT;
