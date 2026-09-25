-- Step 1 of the funded-job workflow.
-- Accepting a proposal selects the builder but does not authorize work to begin.
-- Funding and on-chain verification will move the job forward in a later step.

-- State transitions must go through SECURITY DEFINER workflow functions. Direct
-- row updates previously let an author or builder rewrite protected status fields.
DROP POLICY IF EXISTS "Authors can update problems" ON public.problems;
DROP POLICY IF EXISTS "Builders can update proposals" ON public.proposals;

CREATE OR REPLACE FUNCTION public.accept_proposal(
  p_problem_id uuid,
  p_proposal_id uuid
)
RETURNS public.problems
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.problems;
  selected public.proposals;
  wallet text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO result
  FROM public.problems
  WHERE id = p_problem_id
  FOR UPDATE;

  IF result.id IS NULL OR result.author_id <> auth.uid() THEN
    RAISE EXCEPTION 'Job not found or access denied';
  END IF;

  IF result.type <> 'job' OR result.job_status <> 'open' THEN
    RAISE EXCEPTION 'Only open jobs support proposal acceptance';
  END IF;

  SELECT *
  INTO selected
  FROM public.proposals
  WHERE id = p_proposal_id
    AND problem_id = p_problem_id
  FOR UPDATE;

  IF selected.id IS NULL THEN
    RAISE EXCEPTION 'Proposal not found for this job';
  END IF;

  SELECT address
  INTO wallet
  FROM public.wallets
  WHERE user_id = selected.builder_id
    AND chain = 'solana'
  ORDER BY is_primary DESC, created_at ASC
  LIMIT 1;

  IF wallet IS NULL THEN
    RAISE EXCEPTION 'The selected builder must link a Solana payout wallet first';
  END IF;

  UPDATE public.proposals
  SET status = CASE
    WHEN id = p_proposal_id THEN 'accepted'
    ELSE 'rejected'
  END
  WHERE problem_id = p_problem_id;

  UPDATE public.problems
  SET accepted_proposal_id = p_proposal_id,
      accepted_builder_id = selected.builder_id,
      accepted_builder_name = selected.builder_name,
      accepted_builder_wallet_address = wallet,
      job_status = 'awaiting_funding'
  WHERE id = p_problem_id
  RETURNING * INTO result;

  INSERT INTO public.notifications(user_id, message, link)
  VALUES (
    selected.builder_id,
    'Your proposal was accepted. Wait for secure funding before starting work.',
    '/problem/' || p_problem_id
  );

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_proposal(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_proposal(uuid, uuid) TO authenticated;
