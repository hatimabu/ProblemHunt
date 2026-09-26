import { supabase } from '../../lib/supabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CommunityProblem, CommunityProblemInput, CommunitySolution, CommunitySolutionInput,
  CommunityComment, CommunityCommentInput, CommunityCategory, CommunityDomain, CommunityAcceptanceInput } from './community';

export const PROBLEM_COLUMNS = 'id,author_id,category_id,title,symptom,environment,product,product_version,expected_behavior,actual_behavior,attempted_tests,observations,verification_method,tags,visibility,state,accepted_solution_id,resolution_observation,resolution_verification,solved_at,created_at,updated_at';
const SOLUTION_COLUMNS = 'id,problem_id,author_id,diagnosis,steps,reasoning,verification_method,observations,sources,created_at,updated_at';
const COMMENT_COLUMNS = 'id,solution_id,author_id,kind,body,attempted_test,observation,verification_method,created_at,updated_at';
const problemKeys = ['category_id','title','symptom','environment','product','product_version','expected_behavior','actual_behavior','attempted_tests','observations','verification_method','tags','visibility'] as const;

export function communityError(error: unknown): string {
  const e = error as { code?: string; message?: string };
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
