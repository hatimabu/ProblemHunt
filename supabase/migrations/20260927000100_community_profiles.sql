BEGIN;
-- Separate opt-in public identity from legacy accounts, email and payment data.
CREATE TABLE public.community_profiles (
 user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id),
 display_name text NOT NULL DEFAULT '' CHECK(length(display_name)<=80),
 bio text NOT NULL DEFAULT '' CHECK(length(bio)<=500),
 expertise text[] NOT NULL DEFAULT '{}' CHECK(cardinality(expertise)<=12 AND length(array_to_string(expertise,','))<=500),
 is_public boolean NOT NULL DEFAULT false,
 avatar_path text CHECK(avatar_path IS NULL OR (split_part(avatar_path,'/',1)=user_id::text AND avatar_path ~ '^[0-9a-f-]+/[0-9a-f-]+\.webp$'))
);
ALTER TABLE public.community_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.community_profiles FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.community_profiles TO anon,authenticated;
GRANT INSERT(user_id,display_name,bio,expertise,is_public,avatar_path), UPDATE(display_name,bio,expertise,is_public,avatar_path) ON public.community_profiles TO authenticated;
GRANT ALL ON public.community_profiles TO service_role;
CREATE POLICY community_profiles_read ON public.community_profiles FOR SELECT TO anon,authenticated USING(is_public OR user_id=auth.uid());
CREATE POLICY community_profiles_create ON public.community_profiles FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());
CREATE POLICY community_profiles_edit ON public.community_profiles FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

-- Private bucket: only the selected avatar of an opted-in public profile is readable.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('community-avatars','community-avatars',false,2097152,ARRAY['image/webp']);
CREATE POLICY community_picture_read ON storage.objects FOR SELECT TO anon,authenticated USING(bucket_id='community-avatars' AND
 (split_part(name,'/',1)=auth.uid()::text OR EXISTS(SELECT 1 FROM public.community_profiles p WHERE p.is_public AND p.avatar_path=name)));
CREATE POLICY community_picture_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='community-avatars' AND split_part(name,'/',1)=auth.uid()::text AND name ~ '^[0-9a-f-]+/[0-9a-f-]+\.webp$');
CREATE POLICY community_picture_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='community-avatars' AND split_part(name,'/',1)=auth.uid()::text);
-- Also constrain any broad permissive Storage policies inherited from the legacy app.
CREATE POLICY community_picture_read_boundary ON storage.objects AS RESTRICTIVE FOR SELECT TO PUBLIC USING(bucket_id<>'community-avatars' OR
 (split_part(name,'/',1)=auth.uid()::text OR EXISTS(SELECT 1 FROM public.community_profiles p WHERE p.is_public AND p.avatar_path=name)));
CREATE POLICY community_picture_insert_boundary ON storage.objects AS RESTRICTIVE FOR INSERT TO PUBLIC WITH CHECK(bucket_id<>'community-avatars' OR
 (auth.uid() IS NOT NULL AND split_part(name,'/',1)=auth.uid()::text AND name ~ '^[0-9a-f-]+/[0-9a-f-]+\.webp$'));
CREATE POLICY community_picture_update_boundary ON storage.objects AS RESTRICTIVE FOR UPDATE TO PUBLIC USING(bucket_id<>'community-avatars') WITH CHECK(bucket_id<>'community-avatars');
CREATE POLICY community_picture_delete_boundary ON storage.objects AS RESTRICTIVE FOR DELETE TO PUBLIC USING(bucket_id<>'community-avatars' OR (auth.uid() IS NOT NULL AND split_part(name,'/',1)=auth.uid()::text));

-- Invoker rights: all counts/list rows remain subject to existing content RLS.
CREATE FUNCTION public.community_contributions(p_user_id uuid,p_kind text DEFAULT 'problems',p_state text DEFAULT '',p_offset integer DEFAULT 0,p_public boolean DEFAULT true)
RETURNS TABLE(id uuid,problem_id uuid,title text,summary text,state text,visibility text,accepted boolean,is_example boolean,created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT x.* FROM (
 SELECT p.id,p.id problem_id,p.title,p.symptom summary,p.state,p.visibility,false accepted,p.is_example,p.created_at
 FROM public.community_problems p WHERE p.author_id=p_user_id AND p_kind='problems'
 AND (NOT p_public OR (p.visibility='public' AND NOT p.is_hidden))
 AND (p_state='' OR (p_state='draft' AND p.visibility='draft') OR (p.visibility='public' AND p.state=p_state))
 UNION ALL
 SELECT s.id,p.id,p.title,s.diagnosis,p.state,p.visibility,coalesce(p.accepted_solution_id=s.id,false),p.is_example,s.created_at
 FROM public.community_solutions s JOIN public.community_problems p ON p.id=s.problem_id
 WHERE s.author_id=p_user_id AND p_kind IN ('solutions','accepted')
 AND (NOT p_public OR (p.visibility='public' AND NOT p.is_hidden))
 AND (p_kind='solutions' OR p.accepted_solution_id=s.id)
 ) x ORDER BY x.created_at DESC,x.id LIMIT 21 OFFSET greatest(0,least(coalesce(p_offset,0),100000));
$$;
CREATE FUNCTION public.community_contribution_counts(p_user_id uuid,p_public boolean DEFAULT true)
RETURNS TABLE(problems bigint,solutions bigint,accepted bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT (SELECT count(*) FROM public.community_problems p WHERE p.author_id=p_user_id AND (NOT p_public OR (p.visibility='public' AND NOT p.is_hidden))),
 count(*),count(*) FILTER(WHERE p.accepted_solution_id=s.id)
 FROM public.community_solutions s JOIN public.community_problems p ON p.id=s.problem_id
 WHERE s.author_id=p_user_id AND (NOT p_public OR (p.visibility='public' AND NOT p.is_hidden));
$$;
REVOKE ALL ON FUNCTION public.community_contributions(uuid,text,text,integer,boolean),public.community_contribution_counts(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_contributions(uuid,text,text,integer,boolean),public.community_contribution_counts(uuid,boolean) TO anon,authenticated;
COMMIT;
