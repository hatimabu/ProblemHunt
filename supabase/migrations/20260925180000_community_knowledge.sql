-- Additive community model. No legacy records are copied, rewritten or deleted.
-- State transitions and acceptance are separate from paid-job RPCs/triggers.
BEGIN;

CREATE TABLE public.community_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug IN ('cloud-devops', 'professional-av')),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100)
);
CREATE TABLE public.community_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES public.community_domains(id),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  UNIQUE (domain_id, slug)
);
INSERT INTO public.community_domains (slug, name) VALUES
  ('cloud-devops', 'Cloud Computing and DevOps'),
  ('professional-av', 'Professional AV and Audio');
INSERT INTO public.community_categories (domain_id, slug, name)
SELECT d.id, c.slug, c.name FROM public.community_domains d
JOIN (VALUES
  ('cloud-devops', 'cloud-platforms', 'Cloud platforms'),
  ('cloud-devops', 'linux-networking', 'Linux and networking'),
  ('cloud-devops', 'deployment-automation', 'Deployment and automation'),
  ('professional-av', 'audio-rf', 'Audio and RF'),
  ('professional-av', 'video-projection', 'Video and projection'),
  ('professional-av', 'conferencing-control', 'Conferencing and control')
) AS c(domain_slug, slug, name) ON d.slug = c.domain_slug;

CREATE FUNCTION public.community_valid_test_records(records jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE WHEN jsonb_typeof(records) IS DISTINCT FROM 'array' THEN false ELSE
    jsonb_array_length(records) <= 100 AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(records) AS entry(value)
      WHERE jsonb_typeof(entry.value) IS DISTINCT FROM 'object'
        OR jsonb_typeof(entry.value -> 'test') IS DISTINCT FROM 'string'
        OR length(btrim(entry.value ->> 'test')) NOT BETWEEN 1 AND 10000
        OR jsonb_typeof(entry.value -> 'observation') IS DISTINCT FROM 'string'
        OR length(btrim(entry.value ->> 'observation')) NOT BETWEEN 1 AND 10000
        OR (entry.value ? 'verification_method' AND (
          jsonb_typeof(entry.value -> 'verification_method') IS DISTINCT FROM 'string'
          OR length(btrim(entry.value ->> 'verification_method')) NOT BETWEEN 1 AND 10000))
    ) END;
$$;
CREATE FUNCTION public.community_valid_steps(steps text[]) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT coalesce(array_ndims(steps) = 1 AND cardinality(steps) BETWEEN 1 AND 100 AND
    NOT EXISTS (SELECT 1 FROM unnest(steps) AS entry(value)
      WHERE value IS NULL OR length(btrim(value)) NOT BETWEEN 1 AND 10000), false);
$$;
REVOKE ALL ON FUNCTION public.community_valid_test_records(jsonb), public.community_valid_steps(text[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_valid_test_records(jsonb), public.community_valid_steps(text[])
  TO anon, authenticated, service_role;

CREATE TABLE public.community_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  category_id uuid NOT NULL REFERENCES public.community_categories(id),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  symptom text NOT NULL DEFAULT '' CHECK (length(symptom) <= 10000),
  environment jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(environment) = 'object'),
  product text NOT NULL DEFAULT '' CHECK (length(product) <= 200),
  product_version text NOT NULL DEFAULT '' CHECK (length(product_version) <= 200),
  expected_behavior text NOT NULL DEFAULT '' CHECK (length(expected_behavior) <= 10000),
  actual_behavior text NOT NULL DEFAULT '' CHECK (length(actual_behavior) <= 10000),
  -- Ordered test records: {test, observation, verification_method?}.
  attempted_tests jsonb NOT NULL DEFAULT '[]' CHECK (public.community_valid_test_records(attempted_tests)),
  observations text NOT NULL DEFAULT '' CHECK (length(observations) <= 20000),
  verification_method text NOT NULL DEFAULT '' CHECK (length(verification_method) <= 10000),
  tags text[] NOT NULL DEFAULT '{}' CHECK (cardinality(tags) <= 20),
  visibility text NOT NULL DEFAULT 'draft' CHECK (visibility IN ('draft', 'public')),
  state text NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'testing', 'solved', 'closed')),
  accepted_solution_id uuid,
  resolution_observation text,
  resolution_verification text,
  solved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_public_context CHECK (visibility = 'draft' OR (
    length(btrim(symptom)) > 0 AND environment <> '{}'::jsonb AND
    length(btrim(expected_behavior)) > 0 AND length(btrim(actual_behavior)) > 0)),
  CONSTRAINT community_solved_evidence CHECK (
    (state = 'solved' AND accepted_solution_id IS NOT NULL AND visibility = 'public'
      AND solved_at IS NOT NULL AND length(btrim(coalesce(resolution_observation, ''))) > 0
      AND length(btrim(coalesce(resolution_verification, ''))) > 0)
    OR (state <> 'solved' AND accepted_solution_id IS NULL AND solved_at IS NULL
      AND resolution_observation IS NULL AND resolution_verification IS NULL))
);
CREATE INDEX community_problems_author ON public.community_problems(author_id);
CREATE INDEX community_problems_discovery ON public.community_problems(category_id, state, created_at DESC)
  WHERE visibility = 'public';

CREATE TABLE public.community_solutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES public.community_problems(id),
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  diagnosis text NOT NULL CHECK (length(btrim(diagnosis)) BETWEEN 1 AND 10000),
  steps text[] NOT NULL CHECK (public.community_valid_steps(steps)),
  reasoning text NOT NULL CHECK (length(btrim(reasoning)) BETWEEN 1 AND 10000),
  verification_method text NOT NULL CHECK (length(btrim(verification_method)) BETWEEN 1 AND 10000),
  observations text NOT NULL DEFAULT '' CHECK (length(observations) <= 20000),
  sources text[] NOT NULL DEFAULT '{}' CHECK (cardinality(sources) <= 50),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (problem_id, id)
);
CREATE INDEX community_solutions_author ON public.community_solutions(author_id);
-- A single scalar reference per problem, constrained to a solution of THAT problem.
ALTER TABLE public.community_problems ADD CONSTRAINT community_accepted_parent
  FOREIGN KEY (id, accepted_solution_id) REFERENCES public.community_solutions(problem_id, id);

CREATE TABLE public.community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id uuid NOT NULL REFERENCES public.community_solutions(id),
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  kind text NOT NULL DEFAULT 'clarification' CHECK (kind IN ('clarification', 'test_result')),
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 10000),
  attempted_test text NOT NULL DEFAULT '' CHECK (length(attempted_test) <= 10000),
  observation text NOT NULL DEFAULT '' CHECK (length(observation) <= 10000),
  verification_method text NOT NULL DEFAULT '' CHECK (length(verification_method) <= 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind <> 'test_result' OR (length(btrim(attempted_test)) > 0 AND length(btrim(observation)) > 0))
);
CREATE INDEX community_comments_solution ON public.community_comments(solution_id);
CREATE INDEX community_comments_author ON public.community_comments(author_id);

CREATE TABLE public.community_solution_votes (
  solution_id uuid NOT NULL REFERENCES public.community_solutions(id),
  voter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (solution_id, voter_id)
);
CREATE INDEX community_votes_voter ON public.community_solution_votes(voter_id);

CREATE TABLE public.community_moderators (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  problem_id uuid REFERENCES public.community_problems(id),
  solution_id uuid REFERENCES public.community_solutions(id),
  comment_id uuid REFERENCES public.community_comments(id),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 200),
  details text NOT NULL DEFAULT '' CHECK (length(details) <= 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(problem_id, solution_id, comment_id) = 1)
);
CREATE INDEX community_reports_reporter ON public.community_reports(reporter_id);
-- Separate notes so reporters can read their own report without seeing moderation data.
CREATE TABLE public.community_report_reviews (
  report_id uuid PRIMARY KEY REFERENCES public.community_reports(id),
  moderator_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.community_moderators(user_id),
  status text NOT NULL CHECK (status IN ('reviewing', 'dismissed', 'actioned')),
  private_notes text NOT NULL DEFAULT '' CHECK (length(private_notes) <= 20000),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Stage 5 will define scoring. No client can create, change or delete ledger entries.
-- No automatic awards and no import of legacy reputation_score.
CREATE TABLE public.community_reputation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  category_id uuid NOT NULL REFERENCES public.community_categories(id),
  solution_id uuid NOT NULL REFERENCES public.community_solutions(id),
  event_key text NOT NULL UNIQUE CHECK (length(btrim(event_key)) BETWEEN 1 AND 200),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 1000),
  points integer NOT NULL CHECK (points <> 0),
  reverses_event_id uuid UNIQUE REFERENCES public.community_reputation_events(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX community_reputation_user_category ON public.community_reputation_events(user_id, category_id);

-- Explicitly reset Supabase default table grants before granting only what is needed.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['community_domains','community_categories','community_problems',
    'community_solutions','community_comments','community_solution_votes','community_moderators',
    'community_reports','community_report_reviews','community_reputation_events'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated, service_role', t);
  END LOOP;
END $$;

GRANT SELECT ON public.community_domains, public.community_categories,
  public.community_problems, public.community_solutions, public.community_comments TO anon, authenticated;
GRANT SELECT ON public.community_solution_votes, public.community_reports,
  public.community_moderators, public.community_report_reviews, public.community_reputation_events TO authenticated;
GRANT INSERT (author_id, category_id, title, symptom, environment, product, product_version,
  expected_behavior, actual_behavior, attempted_tests, observations, verification_method, tags, visibility)
  ON public.community_problems TO authenticated;
GRANT UPDATE (category_id, title, symptom, environment, product, product_version,
  expected_behavior, actual_behavior, attempted_tests, observations, verification_method, tags, visibility)
  ON public.community_problems TO authenticated;
GRANT INSERT (problem_id, author_id, diagnosis, steps, reasoning, verification_method, observations, sources)
  ON public.community_solutions TO authenticated;
GRANT UPDATE (diagnosis, steps, reasoning, verification_method, observations, sources)
  ON public.community_solutions TO authenticated;
GRANT INSERT (solution_id, author_id, kind, body, attempted_test, observation, verification_method)
  ON public.community_comments TO authenticated;
GRANT UPDATE (kind, body, attempted_test, observation, verification_method)
  ON public.community_comments TO authenticated;
GRANT INSERT (solution_id, voter_id), DELETE ON public.community_solution_votes TO authenticated;
GRANT INSERT (reporter_id, problem_id, solution_id, comment_id, reason, details)
  ON public.community_reports TO authenticated;
GRANT INSERT (report_id, moderator_id, status, private_notes), UPDATE (status, private_notes)
  ON public.community_report_reviews TO authenticated;
GRANT ALL ON public.community_domains, public.community_categories, public.community_problems,
  public.community_solutions, public.community_comments, public.community_solution_votes,
  public.community_reports, public.community_report_reviews, public.community_moderators TO service_role;
GRANT SELECT, INSERT ON public.community_reputation_events TO service_role;

CREATE FUNCTION public.community_is_moderator() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.community_moderators WHERE user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.community_is_moderator() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_is_moderator() TO authenticated;

CREATE POLICY community_domains_read ON public.community_domains FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY community_categories_read ON public.community_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY community_problems_read ON public.community_problems FOR SELECT TO anon, authenticated
  USING (visibility = 'public' OR author_id = auth.uid());
CREATE POLICY community_problems_insert ON public.community_problems FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND state = 'open' AND accepted_solution_id IS NULL);
CREATE POLICY community_problems_edit ON public.community_problems FOR UPDATE TO authenticated
  USING (author_id = auth.uid() AND state <> 'solved')
  WITH CHECK (author_id = auth.uid() AND state <> 'solved');

CREATE POLICY community_solutions_read ON public.community_solutions FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.community_problems p WHERE p.id = problem_id));
CREATE POLICY community_solutions_insert ON public.community_solutions FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.community_problems p
    WHERE p.id = problem_id AND p.visibility = 'public' AND p.state IN ('open','testing') AND p.author_id <> auth.uid()));
CREATE POLICY community_solutions_edit ON public.community_solutions FOR UPDATE TO authenticated
  USING (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.community_problems p
    WHERE p.id = problem_id AND p.visibility = 'public' AND p.state IN ('open','testing')))
  WITH CHECK (author_id = auth.uid());

CREATE POLICY community_comments_read ON public.community_comments FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.community_solutions s WHERE s.id = solution_id));
CREATE POLICY community_comments_insert ON public.community_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.community_solutions s
    JOIN public.community_problems p ON p.id = s.problem_id
    WHERE s.id = solution_id AND p.visibility = 'public' AND p.state <> 'closed'));
CREATE POLICY community_comments_edit ON public.community_comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.community_solutions s
    JOIN public.community_problems p ON p.id = s.problem_id
    WHERE s.id = solution_id AND p.visibility = 'public' AND p.state <> 'closed'))
  WITH CHECK (author_id = auth.uid());

CREATE POLICY community_votes_read ON public.community_solution_votes FOR SELECT TO authenticated
  USING (voter_id = auth.uid() AND EXISTS (SELECT 1 FROM public.community_solutions s WHERE s.id = solution_id));
CREATE POLICY community_votes_insert ON public.community_solution_votes FOR INSERT TO authenticated
  WITH CHECK (voter_id = auth.uid() AND EXISTS (SELECT 1 FROM public.community_solutions s
    JOIN public.community_problems p ON p.id = s.problem_id
    WHERE s.id = solution_id AND s.author_id <> auth.uid() AND p.visibility = 'public' AND p.state <> 'closed'));
CREATE POLICY community_votes_delete ON public.community_solution_votes FOR DELETE TO authenticated USING (voter_id = auth.uid());

CREATE POLICY community_moderators_read ON public.community_moderators FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY community_reports_read ON public.community_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.community_is_moderator());
CREATE POLICY community_reports_insert ON public.community_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND (
    EXISTS (SELECT 1 FROM public.community_problems p WHERE p.id = problem_id AND p.visibility = 'public') OR
    EXISTS (SELECT 1 FROM public.community_solutions s JOIN public.community_problems p ON p.id = s.problem_id
      WHERE s.id = solution_id AND p.visibility = 'public') OR
    EXISTS (SELECT 1 FROM public.community_comments c JOIN public.community_solutions s ON s.id = c.solution_id
      JOIN public.community_problems p ON p.id = s.problem_id WHERE c.id = comment_id AND p.visibility = 'public')));
CREATE POLICY community_reviews_read ON public.community_report_reviews FOR SELECT TO authenticated USING (public.community_is_moderator());
CREATE POLICY community_reviews_insert ON public.community_report_reviews FOR INSERT TO authenticated
  WITH CHECK (public.community_is_moderator() AND moderator_id = auth.uid());
CREATE POLICY community_reviews_edit ON public.community_report_reviews FOR UPDATE TO authenticated
  USING (public.community_is_moderator() AND moderator_id = auth.uid())
  WITH CHECK (public.community_is_moderator() AND moderator_id = auth.uid());
CREATE POLICY community_reputation_read ON public.community_reputation_events FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE FUNCTION public.community_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
REVOKE ALL ON FUNCTION public.community_touch_updated_at() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER community_problems_touch BEFORE UPDATE ON public.community_problems
  FOR EACH ROW EXECUTE FUNCTION public.community_touch_updated_at();
CREATE TRIGGER community_solutions_touch BEFORE UPDATE ON public.community_solutions
  FOR EACH ROW EXECUTE FUNCTION public.community_touch_updated_at();
CREATE TRIGGER community_comments_touch BEFORE UPDATE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.community_touch_updated_at();
CREATE TRIGGER community_reviews_touch BEFORE UPDATE ON public.community_report_reviews
  FOR EACH ROW EXECUTE FUNCTION public.community_touch_updated_at();

-- Lock the parent to serialize solution writes with author state transitions.
-- A selected solution cannot be silently edited after it becomes tested evidence.
CREATE FUNCTION public.community_guard_solution() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE p public.community_problems;
BEGIN
  SELECT * INTO p FROM public.community_problems WHERE id = NEW.problem_id FOR UPDATE;
  IF p.id IS NULL OR p.visibility <> 'public' OR p.state NOT IN ('open','testing') THEN
    RAISE EXCEPTION 'Solutions require an open or testing public problem' USING ERRCODE = '42501';
  END IF;
  IF NEW.author_id = p.author_id THEN
    RAISE EXCEPTION 'Problem authors record tests; contributors propose solutions' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.community_guard_solution() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER community_solutions_guard BEFORE INSERT OR UPDATE ON public.community_solutions
  FOR EACH ROW EXECUTE FUNCTION public.community_guard_solution();

CREATE FUNCTION public.community_accept_solution(p_problem_id uuid, p_solution_id uuid,
  p_observation text, p_verification text) RETURNS public.community_problems
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE p public.community_problems;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO p FROM public.community_problems WHERE id = p_problem_id FOR UPDATE;
  IF p.id IS NULL OR p.author_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Problem not found or access denied' USING ERRCODE = '42501';
  END IF;
  IF p.visibility <> 'public' OR p.state <> 'testing' THEN
    RAISE EXCEPTION 'Test a public problem before confirming a solution' USING ERRCODE = '23514';
  END IF;
  IF length(btrim(coalesce(p_observation, ''))) NOT BETWEEN 1 AND 20000 OR
     length(btrim(coalesce(p_verification, ''))) NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION 'Test observation and verification are required' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_solutions
    WHERE id = p_solution_id AND problem_id = p.id) THEN
    RAISE EXCEPTION 'Solution does not belong to this problem' USING ERRCODE = '23514';
  END IF;
  UPDATE public.community_problems SET state = 'solved', accepted_solution_id = p_solution_id,
    resolution_observation = btrim(p_observation), resolution_verification = btrim(p_verification), solved_at = now()
    WHERE id = p.id RETURNING * INTO p;
  RETURN p;
END;
$$;
CREATE FUNCTION public.community_set_problem_state(p_problem_id uuid, p_state text)
RETURNS public.community_problems LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE p public.community_problems;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO p FROM public.community_problems WHERE id = p_problem_id FOR UPDATE;
  IF p.id IS NULL OR p.author_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Problem not found or access denied' USING ERRCODE = '42501';
  END IF;
  -- Reopening a solved case is deferred until revision/event reversal support exists.
  IF p_state IS NULL OR p_state NOT IN ('open','testing','closed') OR p.state = 'solved'
    OR (p_state = 'testing' AND p.visibility <> 'public') THEN
    RAISE EXCEPTION 'Invalid state transition' USING ERRCODE = '23514';
  END IF;
  UPDATE public.community_problems SET state = p_state WHERE id = p.id RETURNING * INTO p;
  RETURN p;
END;
$$;
REVOKE ALL ON FUNCTION public.community_accept_solution(uuid,uuid,text,text),
  public.community_set_problem_state(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_accept_solution(uuid,uuid,text,text),
  public.community_set_problem_state(uuid,text) TO authenticated;

CREATE FUNCTION public.community_immutable_reputation() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN RAISE EXCEPTION 'Append a compensating event instead' USING ERRCODE = '42501'; END;
$$;
REVOKE ALL ON FUNCTION public.community_immutable_reputation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER community_reputation_immutable BEFORE UPDATE OR DELETE ON public.community_reputation_events
  FOR EACH ROW EXECUTE FUNCTION public.community_immutable_reputation();

COMMENT ON TABLE public.community_reputation_events IS
  'Reserved Stage 5 ledger: trusted append-only writes; no scoring UI or awards in Stage 2.';
COMMENT ON TABLE public.community_problems IS
  'Community cases independent of legacy paid jobs. States: Open, Testing, Solved, Closed.';
COMMIT;
