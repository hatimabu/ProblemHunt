-- Authors can toggle Testing; only acceptance resolves a problem. Existing closed records remain unchanged.
CREATE OR REPLACE FUNCTION public.community_set_problem_state(p_problem_id uuid, p_state text)
RETURNS public.community_problems LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE p public.community_problems;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO p FROM public.community_problems WHERE id = p_problem_id FOR UPDATE;
  IF p.id IS NULL OR p.author_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Problem not found or access denied' USING ERRCODE = '42501';
  END IF;
  IF p_state IS NULL OR p_state NOT IN ('open','testing') OR p.state NOT IN ('open','testing')
    OR p.visibility <> 'public' THEN
    RAISE EXCEPTION 'Invalid state transition' USING ERRCODE = '23514';
  END IF;
  UPDATE public.community_problems SET state = p_state WHERE id = p.id RETURNING * INTO p;
  RETURN p;
END;
$$;
REVOKE ALL ON FUNCTION public.community_set_problem_state(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_set_problem_state(uuid,text) TO authenticated;
