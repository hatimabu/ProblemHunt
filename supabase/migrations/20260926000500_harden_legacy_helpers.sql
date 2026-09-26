BEGIN;
-- These three service-only counter helpers have no auth checks and no active
-- application callers. Keep tables, authenticated marketplace RPCs and Auth intact.
REVOKE EXECUTE ON FUNCTION public.increment_problem_upvotes(uuid),public.decrement_problem_upvotes(uuid),public.increment_problem_proposals(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.increment_problem_upvotes(uuid),public.decrement_problem_upvotes(uuid),public.increment_problem_proposals(uuid) TO service_role;
-- Preserve the existing helper signature and own-wallet behavior, but prevent
-- authenticated callers from reading another user's wallet through SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.get_primary_wallet(p_user_id uuid,p_chain text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE wallet_address text;
BEGIN
 IF current_setting('role',true) IS DISTINCT FROM 'service_role' AND (auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id) THEN
 RAISE EXCEPTION 'Own wallet access required' USING ERRCODE='42501'; END IF;
 SELECT address INTO wallet_address FROM public.wallets WHERE user_id=p_user_id AND chain=p_chain ORDER BY is_primary DESC,created_at ASC LIMIT 1;
 RETURN wallet_address;
END; $$;
COMMIT;
