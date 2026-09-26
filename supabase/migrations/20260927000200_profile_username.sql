BEGIN;
ALTER TABLE public.community_profiles ADD COLUMN username text NOT NULL DEFAULT '' CHECK(username='' OR username ~ '^[a-z0-9_]{3,30}$');
CREATE UNIQUE INDEX community_profile_username ON public.community_profiles(username) WHERE username<>'';
GRANT INSERT(username),UPDATE(username) ON public.community_profiles TO authenticated;
CREATE OR REPLACE FUNCTION public.community_contributions(p_user_id uuid,p_kind text DEFAULT 'problems',p_state text DEFAULT '',p_offset integer DEFAULT 0,p_public boolean DEFAULT true)
RETURNS TABLE(id uuid,problem_id uuid,title text,summary text,state text,visibility text,accepted boolean,is_example boolean,created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT x.* FROM (
 SELECT p.id,p.id problem_id,p.title,p.symptom summary,p.state,p.visibility,false accepted,p.is_example,p.created_at
 FROM public.community_problems p WHERE p.author_id=p_user_id AND p_kind='problems'
 AND (NOT p_public OR (p.visibility='public' AND NOT p.is_hidden))
 AND (p_state='' OR (p_state='active' AND p.visibility='public' AND NOT p.is_hidden AND p.state IN ('open','testing')) OR (p_state='draft' AND p.visibility='draft') OR (p.visibility='public' AND p.state=p_state))
 UNION ALL
 SELECT s.id,p.id,p.title,s.diagnosis,p.state,p.visibility,coalesce(p.accepted_solution_id=s.id,false),p.is_example,s.created_at
 FROM public.community_solutions s JOIN public.community_problems p ON p.id=s.problem_id
 WHERE s.author_id=p_user_id AND p_kind IN ('solutions','accepted')
 AND (NOT p_public OR (p.visibility='public' AND NOT p.is_hidden))
 AND (p_kind='solutions' OR p.accepted_solution_id=s.id)
 ) x ORDER BY x.created_at DESC,x.id LIMIT 21 OFFSET greatest(0,least(coalesce(p_offset,0),100000));
$$;

COMMIT;
