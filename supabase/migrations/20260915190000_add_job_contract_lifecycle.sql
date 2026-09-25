-- Marketplace contract lifecycle. This migration intentionally stores provider
-- state only; it does not hold, sign, or transfer funds.

CREATE TABLE IF NOT EXISTS public.job_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL UNIQUE REFERENCES public.problems(id) ON DELETE CASCADE,
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES auth.users(id),
  builder_id uuid NOT NULL REFERENCES auth.users(id),
  agreed_amount_sol numeric NOT NULL CHECK (agreed_amount_sol > 0),
  asset text NOT NULL DEFAULT 'SOL',
  network text NOT NULL DEFAULT 'solana',
  status text NOT NULL DEFAULT 'awaiting_funding' CHECK (status IN (
    'awaiting_funding', 'funded', 'submitted', 'release_pending', 'released',
    'refund_requested', 'refunded', 'disputed', 'cancelled'
  )),
  provider text,
  funding_reference text UNIQUE,
  release_reference text UNIQUE,
  refund_reference text UNIQUE,
  delivery_url text,
  delivery_note text,
  dispute_reason text,
  funded_at timestamptz,
  submitted_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_contracts_client ON public.job_contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_job_contracts_builder ON public.job_contracts(builder_id);

ALTER TABLE public.job_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participants can view job contracts" ON public.job_contracts;
CREATE POLICY "Participants can view job contracts"
ON public.job_contracts FOR SELECT TO authenticated
USING (client_id = auth.uid() OR builder_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_job_contract_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS job_contracts_set_updated_at ON public.job_contracts;
CREATE TRIGGER job_contracts_set_updated_at
BEFORE UPDATE ON public.job_contracts
FOR EACH ROW EXECUTE FUNCTION public.set_job_contract_updated_at();

CREATE OR REPLACE FUNCTION public.create_job_contract_after_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE selected public.proposals;
BEGIN
  IF NEW.type = 'job'
     AND NEW.job_status = 'awaiting_funding'
     AND NEW.accepted_proposal_id IS NOT NULL
     AND (OLD.accepted_proposal_id IS DISTINCT FROM NEW.accepted_proposal_id) THEN
    SELECT * INTO selected FROM public.proposals WHERE id = NEW.accepted_proposal_id;
    INSERT INTO public.job_contracts (
      job_id, proposal_id, client_id, builder_id, agreed_amount_sol
    ) VALUES (
      NEW.id, selected.id, NEW.author_id, selected.builder_id,
      coalesce(selected.proposed_price_sol, NEW.budget_sol)
    ) ON CONFLICT (job_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS problems_create_job_contract ON public.problems;
CREATE TRIGGER problems_create_job_contract
AFTER UPDATE OF accepted_proposal_id, job_status ON public.problems
FOR EACH ROW EXECUTE FUNCTION public.create_job_contract_after_acceptance();

-- Backfill jobs accepted before this migration is applied.
INSERT INTO public.job_contracts (job_id, proposal_id, client_id, builder_id, agreed_amount_sol)
SELECT p.id, pr.id, p.author_id, pr.builder_id,
       coalesce(pr.proposed_price_sol, p.budget_sol)
FROM public.problems p
JOIN public.proposals pr ON pr.id = p.accepted_proposal_id
WHERE p.type = 'job' AND p.job_status = 'awaiting_funding'
ON CONFLICT (job_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.submit_job_delivery(
  p_job_id uuid, p_delivery_url text, p_delivery_note text
)
RETURNS public.job_contracts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE result public.job_contracts;
BEGIN
  IF nullif(trim(coalesce(p_delivery_note, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Delivery notes are required';
  END IF;
  UPDATE public.job_contracts
  SET status = 'submitted', delivery_url = nullif(trim(p_delivery_url), ''),
      delivery_note = trim(p_delivery_note), submitted_at = now()
  WHERE job_id = p_job_id AND builder_id = auth.uid() AND status = 'funded'
  RETURNING * INTO result;
  IF result.id IS NULL THEN RAISE EXCEPTION 'Only the accepted builder can submit a funded job'; END IF;
  UPDATE public.problems SET job_status = 'submitted' WHERE id = p_job_id;
  INSERT INTO public.notifications(user_id, message, link)
  VALUES (result.client_id, 'Work was submitted for review.', '/problem/' || p_job_id);
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_job_delivery(p_job_id uuid)
RETURNS public.job_contracts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE result public.job_contracts;
BEGIN
  UPDATE public.job_contracts SET status = 'release_pending'
  WHERE job_id = p_job_id AND client_id = auth.uid() AND status = 'submitted'
  RETURNING * INTO result;
  IF result.id IS NULL THEN RAISE EXCEPTION 'Only the client can approve submitted work'; END IF;
  INSERT INTO public.notifications(user_id, message, link)
  VALUES (result.builder_id, 'The client approved your delivery. Release is pending.', '/problem/' || p_job_id);
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.open_job_dispute(p_job_id uuid, p_reason text)
RETURNS public.job_contracts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE result public.job_contracts;
BEGIN
  IF length(trim(coalesce(p_reason, ''))) < 10 THEN RAISE EXCEPTION 'Please provide a clear dispute reason'; END IF;
  UPDATE public.job_contracts SET status = 'disputed', dispute_reason = trim(p_reason)
  WHERE job_id = p_job_id AND auth.uid() IN (client_id, builder_id)
    AND status IN ('funded', 'submitted', 'release_pending')
  RETURNING * INTO result;
  IF result.id IS NULL THEN RAISE EXCEPTION 'This contract cannot be disputed'; END IF;
  UPDATE public.problems SET job_status = 'disputed' WHERE id = p_job_id;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_unfunded_job(p_job_id uuid)
RETURNS public.job_contracts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE result public.job_contracts;
BEGIN
  UPDATE public.job_contracts SET status = 'cancelled'
  WHERE job_id = p_job_id AND client_id = auth.uid() AND status = 'awaiting_funding'
  RETURNING * INTO result;
  IF result.id IS NULL THEN RAISE EXCEPTION 'Only the client can cancel an unfunded contract'; END IF;
  UPDATE public.problems SET job_status = 'cancelled' WHERE id = p_job_id;
  RETURN result;
END;
$$;

-- Payment-provider callbacks use these state transitions after the provider has
-- independently verified its event. They are never callable by browser users.
CREATE OR REPLACE FUNCTION public.confirm_job_funded(
  p_job_id uuid, p_provider text, p_reference text
)
RETURNS public.job_contracts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE result public.job_contracts;
BEGIN
  UPDATE public.job_contracts
  SET status = 'funded', provider = trim(p_provider), funding_reference = trim(p_reference), funded_at = now()
  WHERE job_id = p_job_id AND status = 'awaiting_funding'
  RETURNING * INTO result;
  IF result.id IS NULL THEN RAISE EXCEPTION 'Contract is not awaiting funding'; END IF;
  UPDATE public.problems SET job_status = 'funded' WHERE id = p_job_id;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_job_delivery(uuid,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_job_delivery(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.open_job_dispute(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_unfunded_job(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_job_funded(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_job_delivery(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_job_delivery(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_job_dispute(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_unfunded_job(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_job_funded(uuid,text,text) TO service_role;
