BEGIN;

-- Immutable expression shared by the index and query; no private child text is indexed.
CREATE FUNCTION public.community_search_document(p public.community_problems)
RETURNS tsvector LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
 SELECT setweight(to_tsvector('english', coalesce(p.title,'') || ' ' || coalesce(p.product,'') || ' ' || coalesce(array_to_string(p.tags,' '),'')), 'A')
 || setweight(to_tsvector('english', coalesce(p.symptom,'') || ' ' || coalesce(p.product_version,'') || ' ' || coalesce(p.resolution_observation,'')), 'B');
$$;
CREATE INDEX community_problems_search_idx ON public.community_problems USING gin (public.community_search_document(community_problems)) WHERE visibility = 'public';

CREATE FUNCTION public.community_search(p_query text DEFAULT '', p_domain text DEFAULT '', p_category text DEFAULT '', p_tag text DEFAULT '', p_state text DEFAULT '', p_offset integer DEFAULT 0)
RETURNS SETOF public.community_problems LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
 SELECT p.* FROM public.community_problems p
 JOIN public.community_categories c ON c.id=p.category_id
 JOIN public.community_domains d ON d.id=c.domain_id
 WHERE p.visibility='public'
 AND (p_domain='' OR d.slug=p_domain) AND (p_category='' OR c.slug=p_category)
 AND (p_tag='' OR p.tags @> ARRAY[p_tag])
 AND (p_state='' OR (p_state IN ('open','solved') AND p.state=p_state))
 AND (btrim(p_query)='' OR public.community_search_document(p) @@ websearch_to_tsquery('english',left(p_query,500)))
 ORDER BY (p.state='solved') DESC,
 ts_rank(public.community_search_document(p),websearch_to_tsquery('english',left(p_query,500))) DESC,
 p.created_at DESC,p.id
 LIMIT 21 OFFSET greatest(0,least(coalesce(p_offset,0),10000));
$$;

-- Expose counts only, never voter identities. Explicit visibility check is required
-- because vote rows themselves are private to their voter under RLS.
CREATE FUNCTION public.community_solution_vote_counts(p_problem_id uuid)
RETURNS TABLE(solution_id uuid, upvotes bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT s.id,count(v.solution_id) FROM public.community_solutions s
 JOIN public.community_problems p ON p.id=s.problem_id
 LEFT JOIN public.community_solution_votes v ON v.solution_id=s.id
 WHERE p.id=p_problem_id AND p.visibility='public' GROUP BY s.id;
$$;
REVOKE ALL ON FUNCTION public.community_search_document(public.community_problems) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.community_search(text,text,text,text,text,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.community_solution_vote_counts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_search_document(public.community_problems), public.community_search(text,text,text,text,text,integer), public.community_solution_vote_counts(uuid) TO anon,authenticated,service_role;
COMMIT;
