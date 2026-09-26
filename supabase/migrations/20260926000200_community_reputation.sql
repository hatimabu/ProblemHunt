BEGIN;
ALTER TABLE public.community_problems ADD COLUMN is_example boolean NOT NULL DEFAULT false;
UPDATE public.community_problems SET is_example=true WHERE tags @> ARRAY['example'] OR title LIKE '[Stage 3 %' OR title LIKE '[Example]%';
ALTER TABLE public.community_solution_votes ADD COLUMN reputation_event_id uuid REFERENCES public.community_reputation_events(id);
CREATE TABLE public.community_acceptance_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), problem_id uuid NOT NULL REFERENCES public.community_problems(id),
 solution_id uuid NOT NULL REFERENCES public.community_solutions(id), actor_id uuid NOT NULL REFERENCES auth.users(id),
 solution_snapshot jsonb NOT NULL DEFAULT '{}',
 action text NOT NULL CHECK(action IN ('accepted','reversed')), reason text NOT NULL,
 observation text NOT NULL, verification text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.community_acceptance_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.community_acceptance_history FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.community_acceptance_history TO anon,authenticated;
GRANT SELECT,INSERT ON public.community_acceptance_history TO service_role;
CREATE POLICY history_read ON public.community_acceptance_history FOR SELECT TO anon,authenticated USING
 (EXISTS(SELECT 1 FROM public.community_problems p WHERE p.id=problem_id));
CREATE FUNCTION public.community_history_snapshot() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN SELECT to_jsonb(s) INTO NEW.solution_snapshot FROM public.community_solutions s WHERE s.id=NEW.solution_id; RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION public.community_history_snapshot() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER history_snapshot BEFORE INSERT ON public.community_acceptance_history FOR EACH ROW EXECUTE FUNCTION public.community_history_snapshot();
CREATE TRIGGER history_immutable BEFORE UPDATE OR DELETE ON public.community_acceptance_history FOR EACH ROW EXECUTE FUNCTION public.community_immutable_reputation();

CREATE FUNCTION public.community_vote_reputation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.community_problems; s public.community_solutions; e public.community_reputation_events;
BEGIN
 SELECT * INTO s FROM public.community_solutions WHERE id=coalesce(NEW.solution_id,OLD.solution_id);
 SELECT * INTO p FROM public.community_problems WHERE id=s.problem_id FOR UPDATE;
 IF TG_OP='INSERT' THEN
  IF p.visibility<>'public' OR p.state='closed' OR NEW.voter_id=s.author_id THEN RAISE EXCEPTION 'Vote not eligible' USING ERRCODE='42501'; END IF;
  IF NOT p.is_example THEN
   INSERT INTO public.community_reputation_events(user_id,category_id,solution_id,event_key,reason,points)
   VALUES(s.author_id,p.category_id,s.id,'vote:'||gen_random_uuid(),'upvote',2) RETURNING id INTO NEW.reputation_event_id;
  END IF;
  RETURN NEW;
 ELSE
  IF OLD.reputation_event_id IS NOT NULL THEN
   SELECT * INTO e FROM public.community_reputation_events WHERE id=OLD.reputation_event_id;
   INSERT INTO public.community_reputation_events(user_id,category_id,solution_id,event_key,reason,points,reverses_event_id)
   VALUES(e.user_id,e.category_id,e.solution_id,'reverse:'||e.id,'vote_removed',-e.points,e.id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN OLD;
 END IF;
END; $$;
CREATE TRIGGER community_vote_award BEFORE INSERT OR DELETE ON public.community_solution_votes FOR EACH ROW EXECUTE FUNCTION public.community_vote_reputation();

CREATE FUNCTION public.community_acceptance_reputation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e public.community_reputation_events; contributor uuid;
BEGIN
 IF NEW.accepted_solution_id IS NOT DISTINCT FROM OLD.accepted_solution_id THEN RETURN NEW; END IF;
 IF OLD.accepted_solution_id IS NOT NULL THEN
  FOR e IN SELECT a.* FROM public.community_reputation_events a WHERE a.solution_id=OLD.accepted_solution_id AND a.reason='accepted'
    AND NOT EXISTS(SELECT 1 FROM public.community_reputation_events r WHERE r.reverses_event_id=a.id) LOOP
   INSERT INTO public.community_reputation_events(user_id,category_id,solution_id,event_key,reason,points,reverses_event_id)
   VALUES(e.user_id,e.category_id,e.solution_id,'reverse:'||e.id,'acceptance_reversed',-e.points,e.id) ON CONFLICT DO NOTHING;
  END LOOP;
 END IF;
 IF NEW.accepted_solution_id IS NOT NULL THEN
  INSERT INTO public.community_acceptance_history(problem_id,solution_id,actor_id,action,reason,observation,verification)
  VALUES(NEW.id,NEW.accepted_solution_id,NEW.author_id,'accepted','Author confirmation',NEW.resolution_observation,NEW.resolution_verification);
  IF NOT NEW.is_example THEN
   SELECT author_id INTO contributor FROM public.community_solutions WHERE id=NEW.accepted_solution_id;
   INSERT INTO public.community_reputation_events(user_id,category_id,solution_id,event_key,reason,points)
   VALUES(contributor,NEW.category_id,NEW.accepted_solution_id,'accept:'||gen_random_uuid(),'accepted',10);
  END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER community_acceptance_award AFTER UPDATE ON public.community_problems FOR EACH ROW EXECUTE FUNCTION public.community_acceptance_reputation();

CREATE FUNCTION public.community_reverse_acceptance(p_problem_id uuid,p_reason text) RETURNS public.community_problems
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.community_problems;
BEGIN
 SELECT * INTO p FROM public.community_problems WHERE id=p_problem_id FOR UPDATE;
 IF auth.uid() IS NULL OR p.author_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Author access required' USING ERRCODE='42501'; END IF;
 IF p.state<>'solved' OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Solved case and reversal reason required' USING ERRCODE='23514'; END IF;
 INSERT INTO public.community_acceptance_history(problem_id,solution_id,actor_id,action,reason,observation,verification)
 VALUES(p.id,p.accepted_solution_id,auth.uid(),'reversed',btrim(p_reason),p.resolution_observation,p.resolution_verification);
 UPDATE public.community_problems SET state='testing',accepted_solution_id=NULL,resolution_observation=NULL,resolution_verification=NULL,solved_at=NULL WHERE id=p.id RETURNING * INTO p;
 RETURN p;
END; $$;
CREATE FUNCTION public.community_guard_category() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.category_id<>OLD.category_id AND EXISTS(SELECT 1 FROM public.community_solutions WHERE problem_id=OLD.id) THEN
 RAISE EXCEPTION 'Category is fixed once solutions exist' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER community_category_guard BEFORE UPDATE ON public.community_problems FOR EACH ROW EXECUTE FUNCTION public.community_guard_category();
CREATE FUNCTION public.community_reputation(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(user_id uuid,category_id uuid,points bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT e.user_id,e.category_id,sum(e.points) FROM public.community_reputation_events e
 JOIN public.community_solutions s ON s.id=e.solution_id JOIN public.community_problems p ON p.id=s.problem_id
 WHERE p.visibility='public' AND NOT p.is_example AND (p_user_id IS NULL OR e.user_id=p_user_id)
 GROUP BY e.user_id,e.category_id HAVING sum(e.points)<>0 ORDER BY sum(e.points) DESC,e.user_id,e.category_id LIMIT 100;
$$;
REVOKE ALL ON FUNCTION public.community_vote_reputation(),public.community_acceptance_reputation(),public.community_guard_category(),public.community_reverse_acceptance(uuid,text),public.community_reputation(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.community_reverse_acceptance(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_reputation(uuid) TO anon,authenticated;
-- No historical scores are fabricated. Existing votes and acceptances start with no award;
-- subsequent new votes/acceptances are ledger-backed, with exact compensating reversals.
COMMIT;
