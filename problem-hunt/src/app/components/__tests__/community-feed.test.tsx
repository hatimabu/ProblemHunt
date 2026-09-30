import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { CommunityLanding } from '../community/home';
const feed = vi.hoisted(() => vi.fn());
vi.mock('../navbar', () => ({ Navbar: () => null }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: null, isLoading: false }) }));
vi.mock('../../../lib/supabase-community', () => ({ communityApi: { feed }, communityError: () => 'Feed unavailable' }));
const row = { id: 'one', title: 'Diagnosing a deployment', product: 'Azure', state: 'open', visibility: 'public', symptom: 'Gateway timeout', tags: ['azure'], accepted_solution_id: null };
beforeEach(() => { feed.mockReset(); feed.mockResolvedValue({ rows: [], hasMore: false }); });
function page(url = '/') { render(<MemoryRouter initialEntries={[url]}><CommunityLanding /></MemoryRouter>); }
it('keeps unanswered mode on pagination and resets the page when changing views', async () => {
  feed.mockImplementation(async (view, page) => ({ rows: page ? [row] : [], hasMore: view === 'unanswered' }));
  page('/?view=unanswered&page=2');
  await screen.findByText(row.title);
  expect(feed).toHaveBeenCalledWith('unanswered', 2);
  await userEvent.click(screen.getByRole('link', { name: 'Next page' }));
  await waitFor(() => expect(feed).toHaveBeenCalledWith('unanswered', 3));
  await userEvent.click(within(screen.getByRole('navigation', { name: 'Feed views' })).getByRole('link', { name: 'Latest' }));
  await waitFor(() => expect(feed).toHaveBeenCalledWith('latest', 1));
});
it('shows loading and recovers from a failed feed without hiding personal navigation', async () => {
  let reject!: (error: Error) => void;
  feed.mockImplementation((view, page) => page ? new Promise((_, r) => { reject = r; }) : Promise.resolve({ rows: [], hasMore: false }));
  page(); expect(screen.getByRole('status')).toHaveTextContent('Loading');
  reject(new Error('offline')); expect(await screen.findByRole('alert')).toHaveTextContent('Feed unavailable');
  feed.mockResolvedValue({ rows: [], hasMore: false });
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Make room for the first conversation.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Saved cases' })).toHaveAttribute('href', '/?view=saved');
});
it('ignores stale results after navigation and retains simulated outcome labels', async () => {
  let resolve!: (result: unknown) => void;
  feed.mockImplementation((view, page) => view === 'latest' && page ? new Promise(r => { resolve = r; }) : Promise.resolve({ rows: page ? [{ ...row, state: 'solved', accepted_solution_id: 's', is_example: true, resolution_observation: 'Illustrative only' }] : [], hasMore: false }));
  page(); await userEvent.click(within(screen.getByRole('navigation', { name: 'Feed views' })).getByRole('link', { name: 'Tested fixes' }));
  expect(await screen.findByText('Illustrative outcome')).toBeVisible();
  resolve({ rows: [{ ...row, title: 'Stale response' }], hasMore: false });
  await waitFor(() => expect(screen.queryByText('Stale response')).not.toBeInTheDocument());
  expect(screen.getByText('Fictional example — outcomes are simulated.')).toBeVisible();
});
