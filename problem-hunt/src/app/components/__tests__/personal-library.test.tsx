import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { CommunityLanding } from '../community/home';
const api = vi.hoisted(() => ({ feed: vi.fn(), personalFeed: vi.fn(), preferences: vi.fn(), followTag: vi.fn(), saveCase: vi.fn() }));
const auth = vi.hoisted(() => ({ user: { id: 'alice' } as { id: string } | null, isLoading: false }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../navbar', () => ({ Navbar: () => null }));
vi.mock('../../../lib/supabase-community', () => ({ communityApi: api, communityError: () => 'Service unavailable' }));
const row = { id: 'p', title: 'Docker network troubleshooting', product: 'Docker', state: 'open', visibility: 'public', symptom: 'Timeout', tags: ['docker'], accepted_solution_id: null };
let tags: string[], saved: string[];
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset()); auth.user = { id: 'alice' }; auth.isLoading = false; tags = []; saved = [];
  api.feed.mockImplementation(async (_view, page) => ({ rows: page ? [row] : [], hasMore: false }));
  api.preferences.mockImplementation(async () => ({ tags: [...tags], saved: [...saved] }));
  api.followTag.mockImplementation(async (_user, tag, next) => { tags = next ? [tag.trim().toLowerCase()] : []; });
  api.saveCase.mockImplementation(async (_user, id, next) => { saved = next ? [id] : []; });
  api.personalFeed.mockImplementation(async view => ({ rows: (view === 'following' ? tags.length : saved.length) ? [row] : [], hasMore: false }));
});
function page(path = '/') { return render(<MemoryRouter initialEntries={[path]}><CommunityLanding /></MemoryRouter>); }
it('follows/unfollows tags and reloads server-confirmed state on remount', async () => {
  const first = page('/?view=following');
  await userEvent.type(screen.getByLabelText('Tag to follow'), ' Docker ');
  await userEvent.click(screen.getByRole('button', { name: 'Follow tag' }));
  expect(await screen.findByRole('button', { name: 'Unfollow #docker' })).toHaveAttribute('aria-pressed', 'true');
  expect(await screen.findByText(row.title)).toBeVisible(); first.unmount(); page('/?view=following');
  const remove = await screen.findByRole('button', { name: 'Unfollow #docker' });
  await userEvent.click(remove); expect(await screen.findByText('No matching public cases yet.')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Unfollow #docker' })).not.toBeInTheDocument();
});
it('saves a case, finds it after refresh, and removes it from the private saved list', async () => {
  const first = page(); const save = await screen.findByRole('button', { name: 'Save case' });
  await waitFor(() => expect(save).toBeEnabled()); await userEvent.click(save);
  expect(await screen.findByRole('button', { name: 'Saved · remove' })).toHaveAttribute('aria-pressed', 'true');
  first.unmount(); page('/?view=saved');
  await userEvent.click(await screen.findByRole('button', { name: 'Saved · remove' }));
  expect(await screen.findByText('No visible saved cases here yet.')).toBeVisible();
  expect(api.saveCase).toHaveBeenLastCalledWith('alice', 'p', false);
});
it('keeps failed writes unconfirmed and recovers by reloading preferences', async () => {
  api.saveCase.mockRejectedValueOnce(new Error('offline')); page();
  const save = await screen.findByRole('button', { name: 'Save case' }); await waitFor(() => expect(save).toBeEnabled());
  await userEvent.click(save); expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable');
  expect(screen.queryByRole('button', { name: 'Saved · remove' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Retry private library' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save case' })).toBeEnabled());
});
it('clears private state on account switch and ignores a delayed previous-account response', async () => {
  let resolve!: (data: unknown) => void;
  api.preferences.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const view = page('/?view=following'); auth.user = { id: 'bob' };
  view.rerender(<MemoryRouter initialEntries={['/?view=following']}><CommunityLanding /></MemoryRouter>);
  await screen.findByText('No matching public cases yet.'); resolve({ tags: ['alice-private-tag'], saved: ['p'] });
  await waitFor(() => expect(screen.queryByText(/alice-private-tag/)).not.toBeInTheDocument());
  expect(api.preferences).toHaveBeenCalledWith('bob');
});
it('requires sign-in for personal feeds and preserves their return route without private requests', async () => {
  auth.user = null; page('/?view=saved');
  expect(screen.getByRole('link', { name: 'Sign in to continue' })).toHaveAttribute('href', '/auth?returnTo=%2F%3Fview%3Dsaved');
  expect(api.personalFeed).not.toHaveBeenCalled(); expect(api.preferences).not.toHaveBeenCalled();
});
it('keeps the saved view on pagination and resets pagination when following is selected', async () => {
  api.personalFeed.mockResolvedValue({ rows: [row], hasMore: true }); page('/?view=saved&page=2');
  await screen.findByText(row.title); await userEvent.click(screen.getByRole('link', { name: 'Next page' }));
  await waitFor(() => expect(api.personalFeed).toHaveBeenLastCalledWith('saved', 3));
  await userEvent.click(within(screen.getByRole('navigation', { name: 'Community sections' })).getByRole('link', { name: 'Following' }));
  await waitFor(() => expect(api.personalFeed).toHaveBeenLastCalledWith('following', 1));
});
