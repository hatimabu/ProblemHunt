-- Operator-only, after verifying the requester's identity. Not an RPC or migration.
-- psql -X -qAt -v ON_ERROR_STOP=1 -v account_id=<verified UUID> -f account-export.sql
-- Redirect output to protected, ignored storage. No passwords/tokens are exported.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
WITH account AS (SELECT :'account_id'::uuid AS id)
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
);
ROLLBACK;
