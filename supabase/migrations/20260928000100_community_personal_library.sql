-- Session 03. Additive and local-only until separately reviewed/authorized for hosting.
BEGIN;
CREATE TABLE public.community_tag_follows (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  tag text NOT NULL CHECK (tag = lower(btrim(tag)) AND length(tag) BETWEEN 1 AND 80 AND tag !~ '[[:cntrl:]]'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tag)
);
CREATE TABLE public.community_saved_cases (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  problem_id uuid NOT NULL REFERENCES public.community_problems(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, problem_id)
);
CREATE INDEX community_saved_cases_problem_idx ON public.community_saved_cases(problem_id);
CREATE INDEX community_saved_cases_recent_idx ON public.community_saved_cases(user_id, created_at DESC, problem_id);
ALTER TABLE public.community_tag_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_saved_cases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.community_tag_follows, public.community_saved_cases FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.community_tag_follows, public.community_saved_cases TO authenticated;
GRANT INSERT(user_id, tag) ON public.community_tag_follows TO authenticated;
GRANT INSERT(user_id, problem_id) ON public.community_saved_cases TO authenticated;
GRANT ALL ON public.community_tag_follows, public.community_saved_cases TO service_role;
CREATE POLICY follows_read_own ON public.community_tag_follows FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY follows_insert_own ON public.community_tag_follows FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY follows_delete_own ON public.community_tag_follows FOR DELETE TO authenticated USING (user_id = auth.uid());
-- Saved references remain readable/removable by their owner even after content is hidden.
-- They contain no copied titles, snippets or tags. The feed always rechecks content visibility.
CREATE POLICY saved_read_own ON public.community_saved_cases FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY saved_insert_visible ON public.community_saved_cases FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.community_problems p WHERE p.id = problem_id AND p.visibility = 'public' AND NOT p.is_hidden
  )
);
CREATE POLICY saved_delete_own ON public.community_saved_cases FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE FUNCTION public.community_personal_feed(p_view text, p_offset integer DEFAULT 0)
RETURNS SETOF public.community_problems LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF p_view IS NULL OR p_view NOT IN ('following','saved') THEN
    RAISE EXCEPTION 'Invalid personal feed' USING ERRCODE = '23514';
  END IF;
  IF p_view = 'saved' THEN
    RETURN QUERY SELECT p.* FROM public.community_problems p
      JOIN public.community_saved_cases s ON s.problem_id = p.id AND s.user_id = auth.uid()
      WHERE p.visibility = 'public' AND NOT p.is_hidden
      ORDER BY s.created_at DESC, p.id DESC
      LIMIT 21 OFFSET greatest(0, least(coalesce(p_offset, 0), 10000));
  ELSE
    RETURN QUERY SELECT p.* FROM public.community_problems p
      WHERE p.visibility = 'public' AND NOT p.is_hidden AND EXISTS (
        SELECT 1 FROM public.community_tag_follows f
        WHERE f.user_id = auth.uid() AND EXISTS (
          SELECT 1 FROM unnest(p.tags) AS t(tag) WHERE lower(btrim(t.tag)) = f.tag
        )
      ) ORDER BY p.created_at DESC, p.id DESC
      LIMIT 21 OFFSET greatest(0, least(coalesce(p_offset, 0), 10000));
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.community_personal_feed(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_personal_feed(text, integer) TO authenticated;
COMMIT;
