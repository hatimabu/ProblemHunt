import { createClient } from '@supabase/supabase-js';
import { expect, it, vi } from 'vitest';
import { createCommunityApi } from '../supabase-community';
function setup(data: unknown[], status = 200) {
  const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }));
  const client = createClient('https://example.supabase.co', 'test-key', { global: { fetch: fetcher }, auth: { persistSession: false, autoRefreshToken: false } });
  return { api: createCommunityApi(client), request: () => new URL(String(fetcher.mock.calls[0][0])) };
}
it('filters unanswered in the server request before pagination and excludes nonpublic/hidden content', async () => {
  const { api, request } = setup([]); await api.feed('unanswered', 2); const q = request().searchParams;
  expect(q.get('answers')).toBe('is.null'); expect(q.get('select')).toContain('community_solutions!community_solutions_problem_id_fkey()');
  expect(q.get('post_type')).toBe('eq.problem');
  expect(q.get('state')).toBe('in.(open,testing)'); expect(q.get('visibility')).toBe('eq.public'); expect(q.get('is_hidden')).toBe('eq.false');
  expect(q.get('offset')).toBe('20'); expect(q.get('limit')).toBe('21'); expect(q.get('order')).toBe('created_at.desc,id.desc');
});
it('uses a lookahead row and requires author acceptance for tested fixes', async () => {
  const { api, request } = setup(Array.from({ length: 21 }, (_, id) => ({ id })));
  const result = await api.feed('tested'); expect(result.rows).toHaveLength(20); expect(result.hasMore).toBe(true);
  expect(request().searchParams.get('accepted_solution_id')).toBe('not.is.null'); expect(request().searchParams.get('order')).toBe('solved_at.desc,id.desc');
  expect(request().searchParams.get('post_type')).toBe('eq.problem');
});
it('does not turn service failures into empty feeds', async () => {
  const { api } = setup([], 500); await expect(api.feed()).rejects.toThrow();
});
