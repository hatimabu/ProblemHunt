BEGIN;
UPDATE public.community_problems SET is_example=true WHERE tags @> ARRAY['example'] OR title LIKE '[Example]%' OR title LIKE '[Stage 3 %' OR title LIKE '[Pilot test]%';
CREATE FUNCTION public.community_mark_example() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.tags @> ARRAY['example'] OR NEW.title LIKE '[Example]%' OR NEW.title LIKE '[Stage 3 %' OR NEW.title LIKE '[Pilot test]%' THEN NEW.is_example=true; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.community_mark_example() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER community_example_marker BEFORE INSERT OR UPDATE ON public.community_problems FOR EACH ROW EXECUTE FUNCTION public.community_mark_example();
COMMIT;
