-- Keep paid-job state transitions atomic and prevent accepting a builder who
-- cannot receive the required direct SOL payout.

CREATE OR REPLACE FUNCTION public.create_proposal(
  p_problem_id uuid,
  p_title text,
  p_description text,
  p_brief_solution text DEFAULT NULL,
  p_project_url text DEFAULT NULL,
  p_timeline text DEFAULT NULL,
  p_cost text DEFAULT NULL,
  p_expertise text[] DEFAULT '{}',
  p_proposed_price_sol numeric DEFAULT NULL,
  p_estimated_delivery text DEFAULT NULL
)
RETURNS public.proposals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result public.proposals; post public.problems;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO post FROM public.problems WHERE id = p_problem_id FOR UPDATE;
  IF post.id IS NULL THEN RAISE EXCEPTION 'Job not found'; END IF;
  IF post.author_id = auth.uid() THEN RAISE EXCEPTION 'You cannot submit a proposal to your own job'; END IF;
  IF post.type <> 'job' OR post.job_status <> 'open' THEN RAISE EXCEPTION 'Only open paid jobs accept proposals'; END IF;
  IF nullif(trim(p_title), '') IS NULL OR nullif(trim(p_description), '') IS NULL THEN
    RAISE EXCEPTION 'A proposal title and description are required';
  END IF;
  IF p_proposed_price_sol IS NULL OR p_proposed_price_sol <= 0 OR nullif(trim(p_estimated_delivery), '') IS NULL THEN
    RAISE EXCEPTION 'Job proposals require a positive SOL price and estimated delivery';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.wallets WHERE user_id = auth.uid() AND chain = 'solana') THEN
    RAISE EXCEPTION 'Add a Solana payout wallet in your dashboard before submitting a proposal';
  END IF;
  IF EXISTS (SELECT 1 FROM public.proposals WHERE problem_id = p_problem_id AND builder_id = auth.uid()) THEN
    RAISE EXCEPTION 'You already submitted a proposal for this job';
  END IF;

  INSERT INTO public.proposals (
    problem_id, title, description, project_url, builder_id, builder_name,
    brief_solution, timeline, cost, expertise, proposed_price_sol, estimated_delivery
  ) VALUES (
    p_problem_id, trim(p_title), trim(p_description), nullif(trim(p_project_url), ''), auth.uid(),
    coalesce((SELECT full_name FROM public.profiles WHERE user_id = auth.uid()), 'Anonymous Builder'),
    coalesce(nullif(trim(p_brief_solution), ''), trim(p_description)), nullif(trim(p_timeline), ''), nullif(trim(p_cost), ''),
    coalesce(p_expertise, '{}'), p_proposed_price_sol, trim(p_estimated_delivery)
  ) RETURNING * INTO result;

  UPDATE public.problems SET proposals = proposals + 1 WHERE id = p_problem_id;
  INSERT INTO public.notifications(user_id, message, link)
  VALUES (post.author_id, 'New proposal received on ' || post.title, '/problem/' || p_problem_id);
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_proposal(p_problem_id uuid, p_proposal_id uuid)
RETURNS public.problems
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result public.problems; selected public.proposals; wallet text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO result FROM public.problems WHERE id = p_problem_id FOR UPDATE;
  IF result.id IS NULL OR result.author_id <> auth.uid() THEN RAISE EXCEPTION 'Job not found or access denied'; END IF;
  IF result.type <> 'job' OR result.job_status <> 'open' THEN RAISE EXCEPTION 'Only open jobs support proposal acceptance'; END IF;
  SELECT * INTO selected FROM public.proposals WHERE id = p_proposal_id AND problem_id = p_problem_id FOR UPDATE;
  IF selected.id IS NULL THEN RAISE EXCEPTION 'Proposal not found for this job'; END IF;
  SELECT address INTO wallet FROM public.wallets
  WHERE user_id = selected.builder_id AND chain = 'solana'
  ORDER BY is_primary DESC, created_at ASC LIMIT 1;
  IF wallet IS NULL THEN RAISE EXCEPTION 'The selected builder must link a Solana payout wallet first'; END IF;

  UPDATE public.proposals SET status = CASE WHEN id = p_proposal_id THEN 'accepted' ELSE 'rejected' END WHERE problem_id = p_problem_id;
  UPDATE public.problems SET accepted_proposal_id = p_proposal_id, accepted_builder_id = selected.builder_id,
    accepted_builder_name = selected.builder_name, accepted_builder_wallet_address = wallet, job_status = 'in_progress'
  WHERE id = p_problem_id RETURNING * INTO result;
  INSERT INTO public.notifications(user_id, message, link)
  VALUES (selected.builder_id, 'Your proposal was accepted. Get to work!', '/problem/' || p_problem_id);
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_problem_upvote(p_problem_id uuid)
RETURNS public.problems
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result public.problems; vote_id text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO result FROM public.problems WHERE id = p_problem_id FOR UPDATE;
  IF result.id IS NULL THEN RAISE EXCEPTION 'Job not found'; END IF;
  vote_id := p_problem_id::text || '-' || auth.uid()::text;
  IF EXISTS (SELECT 1 FROM public.upvotes WHERE id = vote_id) THEN
    DELETE FROM public.upvotes WHERE id = vote_id;
    UPDATE public.problems SET upvotes = greatest(0, upvotes - 1) WHERE id = p_problem_id RETURNING * INTO result;
  ELSE
    INSERT INTO public.upvotes(id, problem_id, user_id) VALUES (vote_id, p_problem_id, auth.uid());
    UPDATE public.problems SET upvotes = upvotes + 1 WHERE id = p_problem_id RETURNING * INTO result;
  END IF;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.create_proposal(uuid,text,text,text,text,text,text,text[],numeric,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_proposal(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_problem_upvote(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_proposal(uuid,text,text,text,text,text,text,text[],numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_proposal(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_problem_upvote(uuid) TO authenticated;
