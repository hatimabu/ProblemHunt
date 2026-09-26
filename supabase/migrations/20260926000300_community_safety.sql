BEGIN;
ALTER TABLE public.community_problems ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.community_reports ADD COLUMN target_excerpt text NOT NULL DEFAULT '';
DROP POLICY community_problems_read ON public.community_problems;
CREATE POLICY community_problems_read ON public.community_problems FOR SELECT TO anon,authenticated USING ((visibility='public' AND NOT is_hidden) OR author_id=auth.uid());
CREATE TABLE public.community_write_limits(user_id uuid NOT NULL REFERENCES auth.users(id),bucket text NOT NULL,window_start timestamptz NOT NULL,hits integer NOT NULL,PRIMARY KEY(user_id,bucket,window_start));
ALTER TABLE public.community_write_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.community_write_limits FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,DELETE ON public.community_write_limits TO service_role;
CREATE FUNCTION public.community_limit_writes() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n integer; max_hits integer;
BEGIN
 IF auth.uid() IS NULL THEN RETURN NEW; END IF;
 max_hits:=CASE TG_TABLE_NAME WHEN 'community_problems' THEN 10 WHEN 'community_reports' THEN 10 WHEN 'community_solutions' THEN 30 ELSE 60 END;
 INSERT INTO public.community_write_limits(user_id,bucket,window_start,hits) VALUES(auth.uid(),TG_TABLE_NAME,date_trunc('hour',now()),1)
 ON CONFLICT(user_id,bucket,window_start) DO UPDATE SET hits=public.community_write_limits.hits+1 RETURNING hits INTO n;
 IF n>max_hits THEN RAISE EXCEPTION 'Hourly posting limit reached. Please try again later.' USING ERRCODE='P0001'; END IF;
 RETURN NEW;
END; $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['community_problems','community_solutions','community_comments','community_reports','community_solution_votes'] LOOP
 EXECUTE format('CREATE TRIGGER community_rate_limit BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.community_limit_writes()',t);
END LOOP; END $$;
CREATE FUNCTION public.community_report_excerpt() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 SELECT left(coalesce(p.title,s.diagnosis,c.body,''),500) INTO NEW.target_excerpt FROM (SELECT 1) x
 LEFT JOIN public.community_problems p ON p.id=NEW.problem_id
 LEFT JOIN public.community_solutions s ON s.id=NEW.solution_id
 LEFT JOIN public.community_comments c ON c.id=NEW.comment_id;
 RETURN NEW;
END; $$;
CREATE TRIGGER community_report_snapshot BEFORE INSERT ON public.community_reports FOR EACH ROW EXECUTE FUNCTION public.community_report_excerpt();
CREATE TABLE public.community_moderation_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),report_id uuid NOT NULL REFERENCES public.community_reports(id),moderator_id uuid NOT NULL REFERENCES auth.users(id),action text NOT NULL,status text NOT NULL,notes text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.community_moderation_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.community_moderation_events FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.community_moderation_events TO authenticated,service_role;
CREATE POLICY moderation_events_read ON public.community_moderation_events FOR SELECT TO authenticated USING(public.community_is_moderator());
CREATE TRIGGER moderation_events_immutable BEFORE UPDATE OR DELETE ON public.community_moderation_events FOR EACH ROW EXECUTE FUNCTION public.community_immutable_reputation();
CREATE FUNCTION public.community_moderate_report(p_report_id uuid,p_status text,p_notes text,p_action text DEFAULT 'review') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.community_reports; target uuid;
BEGIN
 IF NOT public.community_is_moderator() THEN RAISE EXCEPTION 'Moderator required' USING ERRCODE='42501'; END IF;
 IF p_status NOT IN ('reviewing','dismissed','actioned') OR length(btrim(coalesce(p_notes,''))) NOT BETWEEN 1 AND 20000 OR p_action NOT IN ('review','hide','restore') THEN RAISE EXCEPTION 'Valid review and notes required' USING ERRCODE='23514'; END IF;
 SELECT * INTO r FROM public.community_reports WHERE id=p_report_id FOR UPDATE;
 IF r.id IS NULL THEN RAISE EXCEPTION 'Report unavailable' USING ERRCODE='42501'; END IF;
 SELECT coalesce(r.problem_id,s.problem_id,cs.problem_id) INTO target FROM (SELECT 1)x LEFT JOIN public.community_solutions s ON s.id=r.solution_id
 LEFT JOIN public.community_comments c ON c.id=r.comment_id LEFT JOIN public.community_solutions cs ON cs.id=c.solution_id;
 IF p_action<>'review' THEN
  PERFORM 1 FROM public.community_problems WHERE id=target AND visibility='public' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Moderation cannot reveal or modify a private draft' USING ERRCODE='42501'; END IF;
  UPDATE public.community_problems SET is_hidden=(p_action='hide') WHERE id=target;
 END IF;
 INSERT INTO public.community_moderation_events(report_id,moderator_id,action,status,notes) VALUES(r.id,auth.uid(),p_action,p_status,p_notes);
 INSERT INTO public.community_report_reviews(report_id,moderator_id,status,private_notes) VALUES(r.id,auth.uid(),p_status,p_notes)
 ON CONFLICT(report_id) DO UPDATE SET moderator_id=auth.uid(),status=excluded.status,private_notes=excluded.private_notes;
END; $$;
UPDATE storage.buckets SET file_size_limit=5242880,allowed_mime_types=ARRAY['image/png','image/jpeg','image/webp'] WHERE id='avatars';
-- Restrictive policy prevents any permissive legacy upload policy from bypassing ownership.
CREATE POLICY community_avatar_insert_boundary ON storage.objects AS RESTRICTIVE FOR INSERT TO PUBLIC
 WITH CHECK(bucket_id<>'avatars' OR (auth.uid() IS NOT NULL AND split_part(name,'/',1)=auth.uid()::text AND lower(name) ~ '\.(png|jpg|jpeg|webp)$'));
CREATE POLICY community_avatar_update_boundary ON storage.objects AS RESTRICTIVE FOR UPDATE TO PUBLIC
 USING(bucket_id<>'avatars' OR (auth.uid() IS NOT NULL AND split_part(name,'/',1)=auth.uid()::text))
 WITH CHECK(bucket_id<>'avatars' OR (auth.uid() IS NOT NULL AND split_part(name,'/',1)=auth.uid()::text AND lower(name) ~ '\.(png|jpg|jpeg|webp)$'));
REVOKE ALL ON FUNCTION public.community_limit_writes(),public.community_report_excerpt(),public.community_moderate_report(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.community_moderate_report(uuid,text,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.community_search(p_query text DEFAULT '', p_domain text DEFAULT '', p_category text DEFAULT '', p_tag text DEFAULT '', p_state text DEFAULT '', p_offset integer DEFAULT 0)
RETURNS SETOF public.community_problems LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
 SELECT p.* FROM public.community_problems p
 JOIN public.community_categories c ON c.id=p.category_id
 JOIN public.community_domains d ON d.id=c.domain_id
 WHERE p.visibility='public' AND NOT p.is_hidden
 AND (p_domain='' OR d.slug=p_domain) AND (p_category='' OR c.slug=p_category)
 AND (p_tag='' OR p.tags @> ARRAY[p_tag])
 AND (p_state='' OR (p_state IN ('open','solved') AND p.state=p_state))
 AND (btrim(p_query)='' OR public.community_search_document(p) @@ websearch_to_tsquery('english',left(p_query,500)))
 ORDER BY (p.state='solved') DESC,
 ts_rank(public.community_search_document(p),websearch_to_tsquery('english',left(p_query,500))) DESC,
 p.created_at DESC,p.id
 LIMIT 21 OFFSET greatest(0,least(coalesce(p_offset,0),10000));
$$;
CREATE OR REPLACE FUNCTION public.community_solution_vote_counts(p_problem_id uuid)
RETURNS TABLE(solution_id uuid, upvotes bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT s.id,count(v.solution_id) FROM public.community_solutions s
 JOIN public.community_problems p ON p.id=s.problem_id
 LEFT JOIN public.community_solution_votes v ON v.solution_id=s.id
 WHERE p.id=p_problem_id AND p.visibility='public' AND NOT p.is_hidden GROUP BY s.id;
$$;
CREATE OR REPLACE FUNCTION public.community_reputation(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(user_id uuid,category_id uuid,points bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT e.user_id,e.category_id,sum(e.points) FROM public.community_reputation_events e
 JOIN public.community_solutions s ON s.id=e.solution_id JOIN public.community_problems p ON p.id=s.problem_id
 WHERE p.visibility='public' AND NOT p.is_hidden AND NOT p.is_example AND (p_user_id IS NULL OR e.user_id=p_user_id)
 GROUP BY e.user_id,e.category_id HAVING sum(e.points)<>0 ORDER BY sum(e.points) DESC,e.user_id,e.category_id LIMIT 100;
$$;
COMMIT;
