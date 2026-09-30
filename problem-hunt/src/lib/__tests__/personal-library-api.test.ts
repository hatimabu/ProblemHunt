import { createClient } from '@supabase/supabase-js';
import { expect, it, vi } from 'vitest';
import { createCommunityApi } from '../supabase-community';
function setup(handler: (url: URL, init?: RequestInit) => unknown = () => []) {
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => new Response(JSON.stringify(handler(new URL(String(input)), init)), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  const client = createClient('https://example.supabase.co', 'test-key', { global: { fetch: fetcher }, auth: { persistSession: false, autoRefreshToken: false } });
  return { api: createCommunityApi(client), fetcher };
}
it('normalizes follows and uses identity-scoped idempotent writes and deletes', async () => {
  const { api, fetcher } = setup(); await api.followTag('alice', ' Docker ', true);
  const [url, init] = fetcher.mock.calls[0];
  expect(JSON.parse(String(init?.body))).toEqual({ user_id: 'alice', tag: 'docker' });
  expect(new URL(String(url)).searchParams.get('on_conflict')).toBe('user_id,tag');
  expect(new Headers(init?.headers).get('prefer')).toContain('resolution=ignore-duplicates');
  await api.saveCase('alice', 'case', false);
  const [deletedUrl, deletedInit] = fetcher.mock.calls[1];
  expect(deletedInit?.method).toBe('DELETE'); expect(new URL(String(deletedUrl)).searchParams.get('user_id')).toBe('eq.alice');
  expect(new URL(String(deletedUrl)).searchParams.get('problem_id')).toBe('eq.case');
  await expect(api.followTag('alice', ' ', true)).rejects.toThrow(); expect(fetcher).toHaveBeenCalledTimes(2);
});
it('reads preference batches without dropping tags after the first page', async () => {
  const { api, fetcher } = setup(url => url.pathname.endsWith('community_saved_cases') ? [{ problem_id: 'saved' }] : url.searchParams.get('offset') === '500' ? [{ tag: 'last' }] : Array.from({ length: 500 }, (_, n) => ({ tag: `tag-${n}` })));
  const result = await api.preferences('alice'); expect(result.tags).toHaveLength(501); expect(result.tags.at(-1)).toBe('last'); expect(result.saved).toEqual(['saved']);
  for (const [url] of fetcher.mock.calls) expect(new URL(String(url)).searchParams.get('user_id')).toBe('eq.alice');
});
it('personal pagination uses a server-owned identity and one lookahead row', async () => {
  const { api, fetcher } = setup(() => Array.from({ length: 21 }, (_, id) => ({ id })));
  const result = await api.personalFeed('saved', 2); expect(result.rows).toHaveLength(20); expect(result.hasMore).toBe(true);
  expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({ p_view: 'saved', p_offset: 20 });
});
