BEGIN;
-- Existing records and old clients retain the problem workflow.
ALTER TABLE public.community_problems
 ADD COLUMN post_type text NOT NULL DEFAULT 'problem' CHECK (post_type IN ('problem','lab','incident')),
 ADD COLUMN lessons text NOT NULL DEFAULT '' CHECK (length(lessons) <= 10000),
 ADD CONSTRAINT community_writeup_state CHECK (post_type='problem' OR state='open'),
 ADD CONSTRAINT community_writeup_context CHECK (post_type='problem' OR visibility='draft' OR (
   jsonb_array_length(attempted_tests)>0 AND length(btrim(verification_method))>0 AND length(btrim(lessons))>0));
GRANT INSERT(post_type,lessons), UPDATE(lessons) ON public.community_problems TO authenticated;
-- Content type is fixed at creation. This also prevents converting existing evidence.
CREATE FUNCTION public.community_guard_post_type() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.post_type IS DISTINCT FROM OLD.post_type THEN
  RAISE EXCEPTION 'Content type cannot be changed after creation' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.community_guard_post_type() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER community_post_type_immutable BEFORE UPDATE ON public.community_problems
 FOR EACH ROW EXECUTE FUNCTION public.community_guard_post_type();
-- Write-ups are publications, not requests for proposed/accepted solutions.
CREATE OR REPLACE FUNCTION public.community_guard_solution() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE p public.community_problems;
BEGIN
  SELECT * INTO p FROM public.community_problems WHERE id = NEW.problem_id FOR UPDATE;
  IF p.post_type <> 'problem' OR p.id IS NULL OR p.visibility <> 'public' OR p.state NOT IN ('open','testing') THEN
    RAISE EXCEPTION 'Solutions require an open or testing public problem' USING ERRCODE = '42501';
  END IF;
  IF NEW.author_id = p.author_id THEN
    RAISE EXCEPTION 'Problem authors record tests; contributors propose solutions' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE POLICY community_solutions_problem_type ON public.community_solutions
 AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (
 EXISTS (SELECT 1 FROM public.community_problems p WHERE p.id=problem_id AND p.post_type='problem'));

-- Replace, rather than overload, the RPC: old named calls still use the default.
DROP FUNCTION public.community_search(text,text,text,text,text,integer);
CREATE FUNCTION public.community_search(p_query text DEFAULT '', p_domain text DEFAULT '', p_category text DEFAULT '', p_tag text DEFAULT '', p_state text DEFAULT '', p_offset integer DEFAULT 0, p_post_type text DEFAULT '')
RETURNS SETOF public.community_problems LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT p.* FROM public.community_problems p
 JOIN public.community_categories c ON c.id=p.category_id
 JOIN public.community_domains d ON d.id=c.domain_id
 WHERE p.visibility='public' AND NOT p.is_hidden
 AND (p_domain='' OR d.slug=p_domain) AND (p_category='' OR c.slug=p_category)
 AND (p_tag='' OR p.tags @> ARRAY[p_tag])
 AND (p_post_type='' OR p.post_type=p_post_type)
 AND (p_state='' OR (p.post_type='problem' AND p_state IN ('open','solved') AND p.state=p_state))
 AND (btrim(p_query)='' OR public.community_search_document(p) @@ websearch_to_tsquery('english',left(p_query,500)))
 ORDER BY (p.state='solved') DESC,
 ts_rank(public.community_search_document(p),websearch_to_tsquery('english',left(p_query,500))) DESC,
 p.created_at DESC,p.id
 LIMIT 21 OFFSET greatest(0,least(coalesce(p_offset,0),10000));
$$;
REVOKE ALL ON FUNCTION public.community_search(text,text,text,text,text,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_search(text,text,text,text,text,integer,text) TO anon,authenticated,service_role;
-- Include type in workspace/public contribution cards; keep existing arguments.
DROP FUNCTION public.community_contributions(uuid,text,text,integer,boolean);
CREATE FUNCTION public.community_contributions(p_user_id uuid,p_kind text DEFAULT 'problems',p_state text DEFAULT '',p_offset integer DEFAULT 0,p_public boolean DEFAULT true)
RETURNS TABLE(id uuid,problem_id uuid,title text,summary text,state text,visibility text,accepted boolean,is_example boolean,created_at timestamptz,post_type text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT x.* FROM (
 SELECT p.id,p.id problem_id,p.title,p.symptom summary,p.state,p.visibility,false accepted,p.is_example,p.created_at,p.post_type
 FROM public.community_problems p WHERE p.author_id=p_user_id AND p_kind='problems'
 AND (NOT p_public OR (p.visibility='public' AND NOT p.is_hidden))
 AND (p_state='' OR (p_state='active' AND p.post_type='problem' AND p.visibility='public' AND NOT p.is_hidden AND p.state IN ('open','testing')) OR (p_state='draft' AND p.visibility='draft') OR (p.post_type='problem' AND p.visibility='public' AND p.state=p_state))
 UNION ALL
 SELECT s.id,p.id,p.title,s.diagnosis,p.state,p.visibility,coalesce(p.accepted_solution_id=s.id,false),p.is_example,s.created_at,p.post_type
 FROM public.community_solutions s JOIN public.community_problems p ON p.id=s.problem_id
 WHERE s.author_id=p_user_id AND p_kind IN ('solutions','accepted')
 AND (NOT p_public OR (p.visibility='public' AND NOT p.is_hidden))
 AND (p_kind='solutions' OR p.accepted_solution_id=s.id)
 ) x ORDER BY x.created_at DESC,x.id LIMIT 21 OFFSET greatest(0,least(coalesce(p_offset,0),100000));
$$;

REVOKE ALL ON FUNCTION public.community_contributions(uuid,text,text,integer,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_contributions(uuid,text,text,integer,boolean) TO anon,authenticated;
COMMIT;
