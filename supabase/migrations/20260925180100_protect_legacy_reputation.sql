-- Close the existing direct profile-score write path without altering any rows.
-- Legacy totals are not the future community reputation source.
BEGIN;
CREATE FUNCTION public.community_guard_legacy_reputation() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF (TG_OP = 'INSERT' AND coalesce(NEW.reputation_score, 0) <> 0) OR
       (TG_OP = 'UPDATE' AND NEW.reputation_score IS DISTINCT FROM OLD.reputation_score) THEN
      RAISE EXCEPTION 'Reputation is server managed' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.community_guard_legacy_reputation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER community_legacy_reputation_guard BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.community_guard_legacy_reputation();
COMMIT;
