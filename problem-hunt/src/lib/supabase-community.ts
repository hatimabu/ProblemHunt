import { supabase } from '../../lib/supabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CommunityProblem, CommunityProblemInput, CommunitySolution, CommunitySolutionInput,
  CommunityComment, CommunityCommentInput, CommunityCategory, CommunityDomain, CommunityAcceptanceInput } from './community';

export const PROBLEM_COLUMNS = 'id,is_example,is_hidden,author_id,category_id,title,symptom,environment,product,product_version,expected_behavior,actual_behavior,attempted_tests,observations,verification_method,tags,visibility,state,accepted_solution_id,resolution_observation,resolution_verification,solved_at,created_at,updated_at';
const SOLUTION_COLUMNS = 'id,problem_id,author_id,diagnosis,steps,reasoning,verification_method,observations,sources,created_at,updated_at';
const COMMENT_COLUMNS = 'id,solution_id,author_id,kind,body,attempted_test,observation,verification_method,created_at,updated_at';
const problemKeys = ['category_id','title','symptom','environment','product','product_version','expected_behavior','actual_behavior','attempted_tests','observations','verification_method','tags','visibility'] as const;

export function communityError(error: unknown): string {
  const e = error as { code?: string; message?: string };
  if (e?.code === 'P0001') return 'The hourly posting limit has been reached. Please try again later.';
  if (['42P01', '42883', 'PGRST202', 'PGRST205'].includes(e?.code || ''))
    return 'The community service is not ready in this environment. Please contact the site administrator.';
  if (['42501', 'PGRST301', 'PGRST303'].includes(e?.code || ''))
    return 'You do not have permission for this action, or your session has expired. Sign in and try again.';
  if (e?.code === '23514') return 'Check the required information and the current discussion state, then try again.';
  return error instanceof Error ? error.message : 'The request could not be completed. Please try again.';
}
function fail(error: unknown) { if (error) throw new Error(communityError(error)); }
function required<T>(data: T | null): T {
  if (!data) throw new Error('This content is unavailable or you no longer have permission to change it. Refresh the page.');
  return data;
}
function problemPayload(input: CommunityProblemInput): CommunityProblemInput {
  return Object.fromEntries(problemKeys.filter(key => input[key] !== undefined).map(key => [key, input[key]])) as unknown as CommunityProblemInput;
}
export function safeSourceUrl(value: string): string | null {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}

export function createCommunityApi(client: SupabaseClient) {
  return {
    async report(target: { problem_id?: string; solution_id?: string; comment_id?: string }, reason: string, details: string) {
      const r = await client.from('community_reports').insert({ ...target, reason, details }); fail(r.error);
    },
    async moderator() { const r = await client.from('community_moderators').select('user_id').limit(1); fail(r.error); return !!r.data?.length; },
    async reports() {
      const r = await client.from('community_reports').select('id,problem_id,solution_id,comment_id,reason,details,target_excerpt,created_at').order('created_at',{ascending:false}).limit(100); fail(r.error); return r.data || [];
    },
    async reviews() { const r = await client.from('community_report_reviews').select('report_id,status,private_notes').limit(100); fail(r.error); return r.data || []; },
    async review(id: string, status: string, notes: string, action: string) {
      const r = await client.rpc('community_moderate_report',{p_report_id:id,p_status:status,p_notes:notes,p_action:action}); fail(r.error);
    },
    async voteInfo(problemId: string, solutionId: string, signedIn: boolean) {
      const counts = await client.rpc('community_solution_vote_counts', { p_problem_id: problemId }); fail(counts.error);
      let voted = false;
      if (signedIn) { const v = await client.from('community_solution_votes').select('solution_id').eq('solution_id',solutionId); fail(v.error); voted = !!v.data?.length; }
      return { count: Number(counts.data?.find((v: { solution_id: string }) => v.solution_id === solutionId)?.upvotes || 0), voted };
    },
    async vote(solutionId: string, remove: boolean) {
      const r = remove ? await client.from('community_solution_votes').delete().eq('solution_id',solutionId) : await client.from('community_solution_votes').insert({ solution_id: solutionId });
      fail(r.error);
    },
    async reverse(id: string, reason: string) {
      const r = await client.rpc('community_reverse_acceptance', { p_problem_id: id, p_reason: reason }); fail(r.error); return required(r.data) as CommunityProblem;
    },
    async history(id: string) {
      const r = await client.from('community_acceptance_history').select('id,action,reason,observation,verification,created_at').eq('problem_id',id).order('created_at'); fail(r.error); return r.data || [];
    },
    async reputation(userId?: string) {
      const r = await client.rpc('community_reputation', { p_user_id: userId || null }); fail(r.error); return (r.data || []) as { user_id: string; category_id: string; points: number }[];
    },
    async ledger() {
      const r = await client.from('community_reputation_events').select('id,category_id,reason,points,created_at').order('created_at',{ascending:false}).limit(100); fail(r.error); return r.data || [];
    },
    async search(filters: { query?: string; domain?: string; category?: string; tag?: string; state?: string; page?: number }) {
      const { data, error } = await client.rpc('community_search', {
        p_query: filters.query || '', p_domain: filters.domain || '', p_category: filters.category || '',
        p_tag: filters.tag || '', p_state: filters.state || '', p_offset: ((filters.page || 1) - 1) * 20,
      });
      fail(error);
      const rows = (data || []) as CommunityProblem[];
      return { rows: rows.slice(0,20), hasMore: rows.length > 20 };
    },
    async voteCounts(problemId: string) {
      const { data, error } = await client.rpc('community_solution_vote_counts', { p_problem_id: problemId });
      fail(error); return Object.fromEntries((data || []).map((v: { solution_id: string; upvotes: number }) => [v.solution_id, Number(v.upvotes)])) as Record<string,number>;
    },
    async taxonomy() {
      const [d, c] = await Promise.all([
        client.from('community_domains').select('id,slug,name').order('name'),
        client.from('community_categories').select('id,domain_id,slug,name').order('name'),
      ]);
      fail(d.error); fail(c.error);
      return { domains: d.data as CommunityDomain[], categories: c.data as CommunityCategory[] };
    },
    async list(authorId?: string) {
      let query = client.from('community_problems').select(PROBLEM_COLUMNS);
      query = authorId ? query.eq('author_id', authorId) : query.eq('visibility', 'public');
      const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
      fail(error); return (data || []) as CommunityProblem[];
    },
    async get(id: string) {
      const { data, error } = await client.from('community_problems').select(PROBLEM_COLUMNS).eq('id', id).maybeSingle();
      fail(error); return data as CommunityProblem | null;
    },
    async save(input: CommunityProblemInput, id?: string) {
      const table = client.from('community_problems');
      const query = id ? table.update(problemPayload(input)).eq('id', id) : table.insert(problemPayload(input));
      const { data, error } = await query.select(PROBLEM_COLUMNS).maybeSingle();
      fail(error); return required(data) as CommunityProblem;
    },
    async discussion(id: string) {
      const { data, error } = await client.from('community_solutions').select(SOLUTION_COLUMNS).eq('problem_id', id).order('created_at');
      fail(error);
      const solutions = (data || []) as CommunitySolution[];
      if (!solutions.length) return { solutions, comments: [] as CommunityComment[] };
      const comments = await client.from('community_comments').select(COMMENT_COLUMNS).in('solution_id', solutions.map(s => s.id)).order('created_at');
      fail(comments.error);
      return { solutions, comments: (comments.data || []) as CommunityComment[] };
    },
    async solution(input: CommunitySolutionInput) {
      if (input.sources?.some(url => !safeSourceUrl(url))) throw new Error('Sources must be complete http or https links.');
      const { problem_id, diagnosis, steps, reasoning, verification_method, observations = '', sources = [] } = input;
      const { data, error } = await client.from('community_solutions').insert({ problem_id, diagnosis, steps, reasoning, verification_method, observations, sources }).select(SOLUTION_COLUMNS).single();
      fail(error); return required(data) as CommunitySolution;
    },
    async comment(input: CommunityCommentInput) {
      const { solution_id, kind = 'clarification', body, attempted_test = '', observation = '', verification_method = '' } = input;
      const { data, error } = await client.from('community_comments').insert({ solution_id, kind, body, attempted_test, observation, verification_method }).select(COMMENT_COLUMNS).single();
      fail(error); return required(data) as CommunityComment;
    },
    async state(id: string, state: 'open' | 'testing' | 'closed') {
      const { data, error } = await client.rpc('community_set_problem_state', { p_problem_id: id, p_state: state });
      fail(error); return required(data) as CommunityProblem;
    },
    async accept(input: CommunityAcceptanceInput) {
      const { p_problem_id, p_solution_id, p_observation, p_verification } = input;
      const { data, error } = await client.rpc('community_accept_solution', { p_problem_id, p_solution_id, p_observation, p_verification });
      fail(error); return required(data) as CommunityProblem;
    },
  };
}
export const communityApi = createCommunityApi(supabase);
