-- Allow the dashboard to switch the primary wallet without a transient
-- unique-index violation when another wallet for the same chain is primary.
CREATE OR REPLACE FUNCTION public.set_primary_wallet(p_wallet_id uuid)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected public.wallets;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO selected FROM public.wallets
  WHERE id = p_wallet_id AND user_id = auth.uid()
  FOR UPDATE;
  IF selected.id IS NULL THEN RAISE EXCEPTION 'Wallet not found or access denied'; END IF;

  UPDATE public.wallets
  SET is_primary = false
  WHERE user_id = auth.uid() AND chain = selected.chain AND is_primary = true;

  UPDATE public.wallets
  SET is_primary = true
  WHERE id = selected.id
  RETURNING * INTO selected;
  RETURN selected;
END;
$$;

REVOKE ALL ON FUNCTION public.set_primary_wallet(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_primary_wallet(uuid) TO authenticated;
