BEGIN;
-- Explicit opt-in. A new follow gets a new generation: old queued work never revives.
CREATE TABLE public.community_discussion_follows (
 user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
 problem_id uuid NOT NULL REFERENCES public.community_problems(id),
 generation uuid NOT NULL DEFAULT gen_random_uuid(),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(user_id,problem_id)
);
ALTER TABLE public.community_discussion_follows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.community_discussion_follows FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,DELETE ON public.community_discussion_follows TO authenticated;
GRANT INSERT(user_id,problem_id) ON public.community_discussion_follows TO authenticated;
CREATE POLICY discussion_follows_read ON public.community_discussion_follows FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY discussion_follows_remove ON public.community_discussion_follows FOR DELETE TO authenticated USING(user_id=auth.uid());
CREATE POLICY discussion_follows_add ON public.community_discussion_follows FOR INSERT TO authenticated WITH CHECK(
 user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.community_problems p WHERE p.id=problem_id AND p.post_type='problem' AND p.visibility='public' AND NOT p.is_hidden)
);
CREATE INDEX discussion_follows_problem ON public.community_discussion_follows(problem_id);

-- Only identifiers, never titles, reply text, email or credentials, enter the outbox.
CREATE TABLE public.community_notification_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version integer NOT NULL DEFAULT 1,
 kind text NOT NULL CHECK(kind IN ('solution.created','comment.created')),
 problem_id uuid NOT NULL REFERENCES public.community_problems(id),
 solution_id uuid NOT NULL REFERENCES public.community_solutions(id),
 comment_id uuid REFERENCES public.community_comments(id),
 actor_id uuid NOT NULL REFERENCES auth.users(id), recipient_id uuid NOT NULL REFERENCES auth.users(id),
 follow_generation uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), dispatched_at timestamptz,
 CHECK(actor_id<>recipient_id), CHECK((kind='comment.created')=(comment_id IS NOT NULL))
);
CREATE UNIQUE INDEX notification_event_recipient ON public.community_notification_outbox(kind,coalesce(comment_id,solution_id),recipient_id);
CREATE INDEX notification_undispatched ON public.community_notification_outbox(created_at,id) WHERE dispatched_at IS NULL;
CREATE TABLE public.community_notification_queue (
 event_id uuid PRIMARY KEY REFERENCES public.community_notification_outbox(id),
 status text NOT NULL DEFAULT 'ready' CHECK(status IN ('ready','processing','done','failed')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 available_at timestamptz NOT NULL DEFAULT clock_timestamp(), lease_id uuid, lease_until timestamptz,
 outcome text CHECK(outcome IN ('delivered','suppressed')), last_error text,
 CHECK((status='processing')=(lease_id IS NOT NULL AND lease_until IS NOT NULL))
);
CREATE INDEX notification_queue_due ON public.community_notification_queue(status,available_at,lease_until);
ALTER TABLE public.community_notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_notification_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.community_notification_outbox,public.community_notification_queue FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.community_capture_reply() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE pid uuid; sid uuid; cid uuid; event_kind text;
BEGIN
 IF TG_TABLE_NAME='community_solutions' THEN pid:=NEW.problem_id; sid:=NEW.id; event_kind:='solution.created';
 ELSE sid:=NEW.solution_id; cid:=NEW.id; event_kind:='comment.created'; SELECT problem_id INTO pid FROM public.community_solutions WHERE id=sid; END IF;
 INSERT INTO public.community_notification_outbox(kind,problem_id,solution_id,comment_id,actor_id,recipient_id,follow_generation)
 SELECT event_kind,pid,sid,cid,NEW.author_id,f.user_id,f.generation
 FROM public.community_discussion_follows f JOIN public.community_problems p ON p.id=f.problem_id
 WHERE f.problem_id=pid AND f.user_id<>NEW.author_id AND p.visibility='public' AND NOT p.is_hidden AND p.post_type='problem';
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.community_capture_reply() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER community_solution_reply_event AFTER INSERT ON public.community_solutions FOR EACH ROW EXECUTE FUNCTION public.community_capture_reply();
CREATE TRIGGER community_comment_reply_event AFTER INSERT ON public.community_comments FOR EACH ROW EXECUTE FUNCTION public.community_capture_reply();

-- Reuse the existing private inbox. Its historical marketplace rows stay untouched.
ALTER TABLE public.notifications ADD COLUMN community_event_id uuid UNIQUE REFERENCES public.community_notification_outbox(id);
REVOKE ALL ON public.notifications FROM PUBLIC,anon,authenticated;
GRANT SELECT,UPDATE(is_read) ON public.notifications TO authenticated;
CREATE FUNCTION public.community_notification_visible(p_event uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.community_notification_outbox e
 JOIN public.community_problems p ON p.id=e.problem_id
 JOIN public.community_discussion_follows f ON f.problem_id=e.problem_id AND f.user_id=e.recipient_id AND f.generation=e.follow_generation
 WHERE e.id=p_event AND e.recipient_id=auth.uid() AND p.visibility='public' AND NOT p.is_hidden);
$$;
REVOKE ALL ON FUNCTION public.community_notification_visible(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.community_notification_visible(uuid) TO authenticated;
CREATE POLICY notification_community_visibility ON public.notifications AS RESTRICTIVE FOR ALL TO authenticated
 USING(community_event_id IS NULL OR public.community_notification_visible(community_event_id))
 WITH CHECK(community_event_id IS NULL OR public.community_notification_visible(community_event_id));

-- Narrow server-only role. Provision a login/member separately; never use browser keys.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='community_notification_worker') THEN CREATE ROLE community_notification_worker NOLOGIN; END IF;
END; $$;
GRANT USAGE ON SCHEMA public TO community_notification_worker;
CREATE FUNCTION public.community_dispatch_notifications(p_limit integer DEFAULT 50) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e record; n integer:=0;
BEGIN
 FOR e IN SELECT id FROM public.community_notification_outbox WHERE dispatched_at IS NULL ORDER BY created_at,id LIMIT greatest(1,least(coalesce(p_limit,50),500)) FOR UPDATE SKIP LOCKED LOOP
  INSERT INTO public.community_notification_queue(event_id) VALUES(e.id) ON CONFLICT DO NOTHING;
  UPDATE public.community_notification_outbox SET dispatched_at=clock_timestamp() WHERE id=e.id; n:=n+1;
 END LOOP;
 RETURN n;
END; $$;
CREATE FUNCTION public.community_claim_notification(p_seconds integer DEFAULT 30)
RETURNS TABLE(event_id uuid,lease_id uuid,attempts integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target uuid;
BEGIN
 UPDATE public.community_notification_queue q SET status='failed',lease_id=NULL,lease_until=NULL,last_error='lease_expired'
 WHERE q.status='processing' AND q.lease_until<clock_timestamp() AND q.attempts>=5;
 SELECT q.event_id INTO target FROM public.community_notification_queue q
 WHERE q.attempts<5 AND ((q.status='ready' AND q.available_at<=clock_timestamp()) OR (q.status='processing' AND q.lease_until<clock_timestamp()))
 ORDER BY q.available_at,q.event_id LIMIT 1 FOR UPDATE SKIP LOCKED;
 RETURN QUERY UPDATE public.community_notification_queue q SET status='processing',attempts=q.attempts+1,
 lease_id=gen_random_uuid(),lease_until=clock_timestamp()+make_interval(secs=>greatest(5,least(coalesce(p_seconds,30),300))),outcome=NULL
 WHERE q.event_id=target RETURNING q.event_id,q.lease_id,q.attempts;
END; $$;
CREATE FUNCTION public.community_deliver_notification(p_event uuid,p_lease uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e public.community_notification_outbox; p public.community_problems; g uuid;
BEGIN
 PERFORM 1 FROM public.community_notification_queue q WHERE q.event_id=p_event AND q.lease_id=p_lease AND q.status='processing' AND q.lease_until>clock_timestamp() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Lease unavailable' USING ERRCODE='42501'; END IF;
 SELECT * INTO e FROM public.community_notification_outbox WHERE id=p_event;
 IF e.version<>1 THEN RAISE EXCEPTION 'Unsupported event version' USING ERRCODE='23514'; END IF;
 -- Locks serialize delivery with hiding/unpublishing/unfollowing. Reads also recheck visibility.
 SELECT * INTO p FROM public.community_problems WHERE id=e.problem_id FOR SHARE;
 SELECT generation INTO g FROM public.community_discussion_follows WHERE user_id=e.recipient_id AND problem_id=e.problem_id FOR SHARE;
 IF p.visibility<>'public' OR p.is_hidden OR g IS DISTINCT FROM e.follow_generation THEN
  UPDATE public.community_notification_queue SET outcome='suppressed' WHERE event_id=p_event; RETURN 'suppressed';
 END IF;
 INSERT INTO public.notifications(user_id,message,link,community_event_id)
 VALUES(e.recipient_id,CASE e.kind WHEN 'solution.created' THEN 'New solution in a discussion you follow.' ELSE 'New reply in a discussion you follow.' END,
 '/problem/'||e.problem_id::text||'#solution-'||e.solution_id::text,e.id) ON CONFLICT(community_event_id) DO NOTHING;
 UPDATE public.community_notification_queue SET outcome='delivered' WHERE event_id=p_event;
 RETURN 'delivered';
END; $$;
CREATE FUNCTION public.community_ack_notification(p_event uuid,p_lease uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE public.community_notification_queue SET status='done',lease_id=NULL,lease_until=NULL,last_error=NULL
 WHERE event_id=p_event AND lease_id=p_lease AND status='processing' AND lease_until>clock_timestamp() AND outcome IS NOT NULL;
 RETURN FOUND;
END; $$;
CREATE FUNCTION public.community_fail_notification(p_event uuid,p_lease uuid,p_code text DEFAULT 'processing_error') RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE public.community_notification_queue SET status=CASE WHEN attempts>=5 THEN 'failed' ELSE 'ready' END,
 available_at=clock_timestamp()+make_interval(secs=>least(300,(power(2,attempts)*2)::integer)),lease_id=NULL,lease_until=NULL,
 last_error=CASE WHEN p_code='invalid_event' THEN 'invalid_event' ELSE 'processing_error' END
 WHERE event_id=p_event AND lease_id=p_lease AND status='processing' AND lease_until>clock_timestamp();
 RETURN FOUND;
END; $$;
-- Operator-only recovery; no privilege granted to the worker or browser roles.
CREATE FUNCTION public.community_requeue_notification(p_event uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE public.community_notification_queue SET status='ready',attempts=0,available_at=clock_timestamp(),lease_id=NULL,lease_until=NULL,last_error=NULL,outcome=NULL
 WHERE event_id=p_event AND status='failed'; RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.community_dispatch_notifications(integer),public.community_claim_notification(integer),
 public.community_deliver_notification(uuid,uuid),public.community_ack_notification(uuid,uuid),public.community_fail_notification(uuid,uuid,text),
 public.community_requeue_notification(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.community_dispatch_notifications(integer),public.community_claim_notification(integer),
 public.community_deliver_notification(uuid,uuid),public.community_ack_notification(uuid,uuid),public.community_fail_notification(uuid,uuid,text)
 TO community_notification_worker;
COMMIT;
