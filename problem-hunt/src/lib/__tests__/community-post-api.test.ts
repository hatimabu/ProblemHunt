import { createClient } from '@supabase/supabase-js';
import { expect, it, vi } from 'vitest';
import { createCommunityApi } from '../supabase-community';

it('sends type-filtered search and prevents protected fields or type updates in saves', async () => {
  const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ id: 'one' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  const client = createClient('https://example.supabase.co', 'test-key', { global: { fetch: fetcher }, auth: { persistSession: false, autoRefreshToken: false } });
  const api = createCommunityApi(client);
  const input = { category_id: 'category', title: 'Local lab', post_type: 'lab' as const, lessons: 'Check inputs', state: 'solved', accepted_solution_id: 'bad' };
  await api.save(input);
  let body = JSON.parse(String(fetcher.mock.calls.at(-1)![1]!.body));
  expect(body).toEqual({ category_id: 'category', title: 'Local lab', post_type: 'lab', lessons: 'Check inputs' });
  await api.save(input, 'one');
  body = JSON.parse(String(fetcher.mock.calls.at(-1)![1]!.body));
  expect(body.post_type).toBeUndefined(); expect(body.lessons).toBe('Check inputs');
  fetcher.mockResolvedValueOnce(new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }));
  await api.search({ postType: 'incident', page: 2, tag: 'azure' });
  body = JSON.parse(String(fetcher.mock.calls.at(-1)![1]!.body));
  expect(body).toMatchObject({ p_post_type: 'incident', p_offset: 20, p_tag: 'azure' });
});
