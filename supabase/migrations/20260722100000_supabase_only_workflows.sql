-- Supabase-only application workflows.
--
-- These functions replace the authorization and multi-table behavior formerly
-- implemented by the Azure Functions API. They are intentionally added as a
-- separate migration so the restored historical schema remains auditable.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS problems_set_updated_at ON public.problems;
CREATE TRIGGER problems_set_updated_at
BEFORE UPDATE ON public.problems
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS proposals_set_updated_at ON public.proposals;
CREATE TRIGGER proposals_set_updated_at
BEFORE UPDATE ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.create_problem(
  p_type text,
  p_title text,
  p_description text,
  p_category text,
  p_budget text,
  p_requirements text[] DEFAULT '{}',
  p_deadline timestamptz DEFAULT NULL,
  p_budget_sol numeric DEFAULT NULL,
  p_job_type text DEFAULT NULL,
  p_skills_required text[] DEFAULT '{}'
)
RETURNS public.problems
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.problems;
  normalized_type text := lower(coalesce(nullif(trim(p_type), ''), 'problem'));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF normalized_type NOT IN ('problem', 'job') THEN RAISE EXCEPTION 'Invalid post type'; END IF;
  IF length(trim(coalesce(p_title, ''))) = 0 OR length(trim(p_title)) > 200 THEN
    RAISE EXCEPTION 'Title is required and must be 200 characters or fewer';
  END IF;
  IF length(trim(coalesce(p_description, ''))) = 0 OR length(trim(p_description)) > 5000 THEN
    RAISE EXCEPTION 'Description is required and must be 5000 characters or fewer';
  END IF;
  IF length(trim(coalesce(p_budget, ''))) = 0 THEN RAISE EXCEPTION 'Budget is required'; END IF;
  IF normalized_type = 'job' AND (p_budget_sol IS NULL OR p_budget_sol <= 0 OR p_deadline IS NULL
      OR p_job_type NOT IN ('one-time', 'contract', 'ongoing')) THEN
    RAISE EXCEPTION 'Jobs require a positive SOL budget, deadline, and valid job type';
  END IF;

  INSERT INTO public.problems (
    type, title, description, requirements, category, author, author_id,
    deadline, budget, budget_sol, budget_value, job_type, skills_required, job_status
  ) VALUES (
    normalized_type, trim(p_title), trim(p_description), coalesce(p_requirements, '{}'),
    trim(p_category), coalesce((SELECT full_name FROM public.profiles WHERE user_id = auth.uid()), 'Anonymous User'),
    auth.uid(), p_deadline, trim(p_budget), p_budget_sol,
    coalesce(p_budget_sol, 0), nullif(trim(p_job_type), ''), coalesce(p_skills_required, '{}'),
    CASE WHEN normalized_type = 'job' THEN 'open' ELSE NULL END
  ) RETURNING * INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_problem(
  p_problem_id uuid,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_budget text DEFAULT NULL,
  p_requirements text[] DEFAULT NULL,
  p_deadline timestamptz DEFAULT NULL,
  p_budget_sol numeric DEFAULT NULL,
  p_job_type text DEFAULT NULL,
  p_skills_required text[] DEFAULT NULL
)
RETURNS public.problems
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result public.problems;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE public.problems
  SET title = coalesce(nullif(trim(p_title), ''), title),
      description = coalesce(nullif(trim(p_description), ''), description),
      category = coalesce(nullif(trim(p_category), ''), category),
      budget = coalesce(nullif(trim(p_budget), ''), budget),
      requirements = coalesce(p_requirements, requirements),
      deadline = coalesce(p_deadline, deadline),
      budget_sol = coalesce(p_budget_sol, budget_sol),
      budget_value = coalesce(p_budget_sol, budget_value),
      job_type = coalesce(nullif(trim(p_job_type), ''), job_type),
      skills_required = coalesce(p_skills_required, skills_required)
  WHERE id = p_problem_id AND author_id = auth.uid()
  RETURNING * INTO result;
  IF result.id IS NULL THEN RAISE EXCEPTION 'Problem not found or access denied'; END IF;
  RETURN result;
END;
$$;

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
  SELECT * INTO post FROM public.problems WHERE id = p_problem_id;
  IF post.id IS NULL THEN RAISE EXCEPTION 'Problem not found'; END IF;
  IF post.type = 'job' AND (p_proposed_price_sol IS NULL OR p_proposed_price_sol <= 0 OR nullif(trim(p_estimated_delivery), '') IS NULL) THEN
    RAISE EXCEPTION 'Job proposals require a positive SOL price and estimated delivery';
  END IF;
  INSERT INTO public.proposals (
    problem_id, title, description, project_url, builder_id, builder_name,
    brief_solution, timeline, cost, expertise, proposed_price_sol, estimated_delivery
  ) VALUES (
    p_problem_id, trim(p_title), trim(p_description), p_project_url, auth.uid(),
    coalesce((SELECT full_name FROM public.profiles WHERE user_id = auth.uid()), 'Anonymous Builder'),
    coalesce(nullif(trim(p_brief_solution), ''), trim(p_description)), p_timeline, p_cost,
    coalesce(p_expertise, '{}'), p_proposed_price_sol, p_estimated_delivery
  ) RETURNING * INTO result;
  UPDATE public.problems SET proposals = proposals + 1 WHERE id = p_problem_id;
  IF post.type = 'job' THEN
    INSERT INTO public.notifications(user_id, message, link)
    VALUES (post.author_id, 'New proposal received on ' || post.title, '/problem/' || p_problem_id);
  END IF;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_problem_upvote(p_problem_id uuid)
RETURNS public.problems
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result public.problems; vote_id text := p_problem_id::text || '-' || auth.uid()::text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF EXISTS (SELECT 1 FROM public.upvotes WHERE id = vote_id) THEN
    DELETE FROM public.upvotes WHERE id = vote_id;
    UPDATE public.problems SET upvotes = greatest(0, upvotes - 1) WHERE id = p_problem_id;
  ELSE
    INSERT INTO public.upvotes(id, problem_id, user_id) VALUES (vote_id, p_problem_id, auth.uid());
    UPDATE public.problems SET upvotes = upvotes + 1 WHERE id = p_problem_id;
  END IF;
  SELECT * INTO result FROM public.problems WHERE id = p_problem_id;
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
  SELECT * INTO selected FROM public.proposals WHERE id = p_proposal_id AND problem_id = p_problem_id;
  IF selected.id IS NULL THEN RAISE EXCEPTION 'Proposal not found for this job'; END IF;
  SELECT address INTO wallet FROM public.wallets WHERE user_id = selected.builder_id AND chain = 'solana' ORDER BY is_primary DESC, created_at ASC LIMIT 1;
  UPDATE public.proposals SET status = CASE WHEN id = p_proposal_id THEN 'accepted' ELSE 'rejected' END WHERE problem_id = p_problem_id;
  UPDATE public.problems SET accepted_proposal_id = p_proposal_id, accepted_builder_id = selected.builder_id,
    accepted_builder_name = selected.builder_name, accepted_builder_wallet_address = wallet, job_status = 'in_progress'
  WHERE id = p_problem_id RETURNING * INTO result;
  INSERT INTO public.notifications(user_id, message, link) VALUES (selected.builder_id, 'Your proposal was accepted! Get to work 🚀', '/problem/' || p_problem_id);
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_job_complete(p_problem_id uuid)
RETURNS public.problems
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result public.problems; selected public.proposals;
BEGIN
  SELECT * INTO result FROM public.problems WHERE id = p_problem_id FOR UPDATE;
  SELECT * INTO selected FROM public.proposals WHERE id = result.accepted_proposal_id;
  IF result.id IS NULL OR result.type <> 'job' OR result.job_status <> 'in_progress' OR selected.builder_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the accepted builder can complete this job';
  END IF;
  UPDATE public.problems SET job_status = 'completed', completed_at = now() WHERE id = p_problem_id RETURNING * INTO result;
  INSERT INTO public.notifications(user_id, message, link) VALUES (result.author_id, coalesce(selected.builder_name, 'The builder') || ' marked the job done - review and pay', '/problem/' || p_problem_id);
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_job_payment(
  p_problem_id uuid, p_amount_sol numeric, p_tx_hash text, p_from_wallet_address text DEFAULT NULL
)
RETURNS public.problems
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result public.problems; selected public.proposals; wallet text; agreed numeric;
BEGIN
  SELECT * INTO result FROM public.problems WHERE id = p_problem_id FOR UPDATE;
  SELECT * INTO selected FROM public.proposals WHERE id = result.accepted_proposal_id;
  agreed := coalesce(selected.proposed_price_sol, result.budget_sol);
  IF result.id IS NULL OR result.author_id <> auth.uid() OR result.type <> 'job' OR result.job_status <> 'completed' THEN
    RAISE EXCEPTION 'Only the owner can pay a completed job';
  END IF;
  IF nullif(trim(p_tx_hash), '') IS NULL OR agreed IS NULL OR abs(agreed - p_amount_sol) > 0.000001 THEN
    RAISE EXCEPTION 'Payment hash and exact agreed SOL amount are required';
  END IF;
  SELECT address INTO wallet FROM public.wallets WHERE user_id = selected.builder_id AND chain = 'solana' ORDER BY is_primary DESC, created_at ASC LIMIT 1;
  IF wallet IS NULL THEN RAISE EXCEPTION 'Accepted builder has no Solana wallet'; END IF;
  INSERT INTO public.payments(job_id, from_user_id, to_user_id, amount_sol, tx_hash, from_wallet_address, to_wallet_address)
  VALUES (p_problem_id, auth.uid(), selected.builder_id, p_amount_sol, trim(p_tx_hash), p_from_wallet_address, wallet);
  UPDATE public.problems SET job_status = 'paid', paid_at = now(), payment_tx_hash = trim(p_tx_hash) WHERE id = p_problem_id RETURNING * INTO result;
  UPDATE public.proposals SET payment_tx_hash = trim(p_tx_hash) WHERE id = selected.id;
  INSERT INTO public.notifications(user_id, message, link) VALUES (selected.builder_id, 'Payment received for ' || result.title || ' ✅', '/problem/' || p_problem_id);
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_tip(
  p_proposal_id uuid, p_amount numeric, p_chain text, p_currency text, p_tx_hash text DEFAULT NULL,
  p_message text DEFAULT NULL, p_to_wallet text DEFAULT NULL
)
RETURNS public.tips
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result public.tips; selected public.proposals; wallet text;
BEGIN
  IF auth.uid() IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Authenticated user and positive tip amount are required'; END IF;
  IF lower(p_chain) NOT IN ('ethereum', 'polygon', 'arbitrum', 'solana') THEN RAISE EXCEPTION 'Unsupported chain'; END IF;
  SELECT * INTO selected FROM public.proposals WHERE id = p_proposal_id;
  IF selected.id IS NULL THEN RAISE EXCEPTION 'Proposal not found'; END IF;
  SELECT address INTO wallet FROM public.wallets WHERE user_id = selected.builder_id AND chain = lower(p_chain) ORDER BY is_primary DESC, created_at ASC LIMIT 1;
  INSERT INTO public.tips(proposal_id, problem_id, builder_id, tipper_id, amount, message, currency, chain, tx_hash, to_wallet)
  VALUES (p_proposal_id, selected.problem_id, selected.builder_id, auth.uid(), p_amount, p_message, upper(coalesce(p_currency, p_chain)), lower(p_chain), nullif(trim(p_tx_hash), ''), coalesce(nullif(trim(p_to_wallet), ''), wallet))
  RETURNING * INTO result;
  IF nullif(trim(p_tx_hash), '') IS NOT NULL THEN
    INSERT INTO public.tip_transactions(proposal_id, problem_id, builder_id, tipper_id, amount, currency, chain, tx_hash, to_wallet_address, message)
    VALUES (p_proposal_id, selected.problem_id, selected.builder_id, auth.uid(), p_amount, upper(coalesce(p_currency, p_chain)), lower(p_chain), trim(p_tx_hash), coalesce(nullif(trim(p_to_wallet), ''), wallet), p_message);
  END IF;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_limit integer DEFAULT 20)
RETURNS TABLE (
  rank bigint,
  builder_id uuid,
  builder_name text,
  proposals_submitted bigint,
  proposals_accepted bigint,
  tips_received numeric,
  reputation_score bigint,
  tier text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH proposal_stats AS (
    SELECT p.builder_id,
      max(coalesce(nullif(p.builder_name, ''), 'Anonymous Builder')) AS builder_name,
      count(*)::bigint AS proposals_submitted,
      count(*) FILTER (WHERE p.status = 'accepted')::bigint AS proposals_accepted
    FROM public.proposals p
    WHERE p.builder_id IS NOT NULL
    GROUP BY p.builder_id
  ), tip_stats AS (
    SELECT t.builder_id, coalesce(sum(t.amount), 0) AS tips_received
    FROM public.tips t
    WHERE t.builder_id IS NOT NULL
    GROUP BY t.builder_id
  ), scored AS (
    SELECT ps.builder_id, ps.builder_name, ps.proposals_submitted, ps.proposals_accepted,
      coalesce(ts.tips_received, 0) AS tips_received,
      (ps.proposals_accepted * 100 + floor(coalesce(ts.tips_received, 0) * 10)::bigint + ps.proposals_submitted * 5) AS reputation_score
    FROM proposal_stats ps
    LEFT JOIN tip_stats ts ON ts.builder_id = ps.builder_id
  )
  SELECT row_number() OVER (ORDER BY reputation_score DESC, builder_name ASC), builder_id, builder_name,
    proposals_submitted, proposals_accepted, tips_received, reputation_score,
    CASE WHEN reputation_score >= 5000 THEN 'Legend'
         WHEN reputation_score >= 1500 THEN 'Expert'
         WHEN reputation_score >= 500 THEN 'Senior'
         WHEN reputation_score >= 100 THEN 'Builder'
         ELSE 'Newcomer' END
  FROM scored
  ORDER BY reputation_score DESC, builder_name ASC
  LIMIT greatest(1, least(coalesce(p_limit, 20), 100));
$$;

REVOKE ALL ON FUNCTION public.create_problem(text,text,text,text,text,text[],timestamptz,numeric,text,text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_problem(uuid,text,text,text,text,text[],timestamptz,numeric,text,text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_proposal(uuid,text,text,text,text,text,text,text[],numeric,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_problem_upvote(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_proposal(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_job_complete(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_job_payment(uuid,numeric,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_tip(uuid,numeric,text,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_leaderboard(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_problem(text,text,text,text,text,text[],timestamptz,numeric,text,text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_problem(uuid,text,text,text,text,text[],timestamptz,numeric,text,text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_proposal(uuid,text,text,text,text,text,text,text[],numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_problem_upvote(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_proposal(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_job_complete(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_job_payment(uuid,numeric,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_tip(uuid,numeric,text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO anon, authenticated;
