-- A poster may pay immediately after accepting a proposal. The payment is
-- locked to the accepted builder and exact agreed SOL amount.

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
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO result FROM public.problems WHERE id = p_problem_id FOR UPDATE;
  SELECT * INTO selected FROM public.proposals WHERE id = result.accepted_proposal_id;
  agreed := coalesce(selected.proposed_price_sol, result.budget_sol);
  IF result.id IS NULL OR result.author_id <> auth.uid() OR result.type <> 'job' OR result.job_status <> 'in_progress' THEN
    RAISE EXCEPTION 'Only the poster can pay an accepted proposal';
  END IF;
  IF selected.id IS NULL OR selected.status <> 'accepted' THEN RAISE EXCEPTION 'A valid accepted proposal is required for payment'; END IF;
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
REVOKE ALL ON FUNCTION public.record_job_payment(uuid,numeric,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_job_payment(uuid,numeric,text,text) TO authenticated;
