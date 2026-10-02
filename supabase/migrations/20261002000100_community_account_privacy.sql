BEGIN;
CREATE TABLE public.community_deletion_requests (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id),
 status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','reviewing','cancelled')),
 requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.community_deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.community_deletion_requests FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.community_deletion_requests TO authenticated;
CREATE POLICY deletion_requests_private ON public.community_deletion_requests FOR SELECT TO authenticated
 USING(user_id=auth.uid() OR public.community_is_moderator());

CREATE FUNCTION public.community_set_deletion_request(p_requested boolean)
RETURNS public.community_deletion_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); result public.community_deletion_requests;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 IF p_requested IS NULL THEN RAISE EXCEPTION 'Request action required' USING ERRCODE='23514'; END IF;
 -- Serialize changes per account, including the first request. No data is deleted.
 PERFORM 1 FROM auth.users WHERE id=uid FOR UPDATE;
 SELECT * INTO result FROM public.community_deletion_requests WHERE user_id=uid FOR UPDATE;
 IF p_requested THEN
  IF result.user_id IS NULL THEN
   INSERT INTO public.community_deletion_requests(user_id) VALUES(uid) RETURNING * INTO result;
  ELSIF result.status='cancelled' THEN
   UPDATE public.community_deletion_requests SET status='requested',requested_at=clock_timestamp(),updated_at=clock_timestamp()
    WHERE user_id=uid RETURNING * INTO result;
  END IF;
 ELSE
  UPDATE public.community_deletion_requests SET status='cancelled',updated_at=clock_timestamp()
   WHERE user_id=uid AND status<>'cancelled' RETURNING * INTO result;
  IF result.user_id IS NULL THEN SELECT * INTO result FROM public.community_deletion_requests WHERE user_id=uid; END IF;
 END IF;
 RETURN result;
END; $$;
CREATE FUNCTION public.community_review_deletion_request(p_user_id uuid)
RETURNS public.community_deletion_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result public.community_deletion_requests;
BEGIN
 IF auth.uid() IS NULL OR NOT public.community_is_moderator() THEN RAISE EXCEPTION 'Moderator access required' USING ERRCODE='42501'; END IF;
 UPDATE public.community_deletion_requests SET status='reviewing',updated_at=clock_timestamp()
  WHERE user_id=p_user_id AND status='requested' RETURNING * INTO result;
 IF result.user_id IS NULL THEN RAISE EXCEPTION 'Request changed; refresh the queue' USING ERRCODE='23514'; END IF;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.community_set_deletion_request(boolean),public.community_review_deletion_request(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.community_set_deletion_request(boolean),public.community_review_deletion_request(uuid) TO authenticated;
CREATE FUNCTION public.community_export_account() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 RETURN (
WITH account AS (SELECT auth.uid() AS id)
SELECT jsonb_build_object(
 'format_version',1,'exported_at',statement_timestamp(),
 'scope','Community records; avatar binary and provider logs require separate operator review',
 'account',(SELECT jsonb_build_object('id',u.id,'email',u.email,'created_at',u.created_at) FROM auth.users u,account a WHERE u.id=a.id),
 'profile',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM public.community_profiles t,account a WHERE t.user_id=a.id),'[]'::jsonb),
 'posts',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM public.community_problems t,account a WHERE t.author_id=a.id),'[]'::jsonb),
 'solutions',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM public.community_solutions t,account a WHERE t.author_id=a.id),'[]'::jsonb),
 'comments',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM public.community_comments t,account a WHERE t.author_id=a.id),'[]'::jsonb),
 'votes',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM public.community_solution_votes t,account a WHERE t.voter_id=a.id),'[]'::jsonb),
 'tag_follows',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM public.community_tag_follows t,account a WHERE t.user_id=a.id),'[]'::jsonb),
 'saved_cases',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM public.community_saved_cases t,account a WHERE t.user_id=a.id),'[]'::jsonb),
 'discussion_follows',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM public.community_discussion_follows t,account a WHERE t.user_id=a.id),'[]'::jsonb),
 'notifications',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM public.notifications t,account a WHERE t.user_id=a.id AND t.community_event_id IS NOT NULL),'[]'::jsonb),
 'reports',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'problem_id',t.problem_id,'solution_id',t.solution_id,'comment_id',t.comment_id,'reason',t.reason,'details',t.details,'created_at',t.created_at)) FROM public.community_reports t,account a WHERE t.reporter_id=a.id),'[]'::jsonb),
 'reputation',coalesce((SELECT jsonb_agg(to_jsonb(t)-'event_key') FROM public.community_reputation_events t,account a WHERE t.user_id=a.id),'[]'::jsonb),
 'acceptance_history',coalesce((SELECT jsonb_agg(to_jsonb(t)-'solution_snapshot') FROM public.community_acceptance_history t,account a WHERE t.actor_id=a.id),'[]'::jsonb),
 'rate_limit_records',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM public.community_write_limits t,account a WHERE t.user_id=a.id),'[]'::jsonb),
 'deletion_request',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM public.community_deletion_requests t,account a WHERE t.user_id=a.id),'[]'::jsonb),
 'delivery_records',coalesce((SELECT jsonb_agg(jsonb_build_object('event_id',e.id,'kind',e.kind,'problem_id',e.problem_id,'created_at',e.created_at,'status',q.status,'outcome',q.outcome)) FROM public.community_notification_outbox e LEFT JOIN public.community_notification_queue q ON q.event_id=e.id,account a WHERE e.recipient_id=a.id),'[]'::jsonb)
)
 );
END; $$;
REVOKE ALL ON FUNCTION public.community_export_account() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.community_export_account() TO authenticated;
COMMIT;
