import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunityDiscussion } from '../community/problem-discussion';
import { CommunityEditor } from '../community/problem-editor';
import type { CommunityProblem } from '../../../lib/community';

const api = vi.hoisted(() => ({ get: vi.fn(), discussion: vi.fn(), taxonomy: vi.fn(), save: vi.fn(), solution: vi.fn(), comment: vi.fn(), state: vi.fn(), accept: vi.fn() }));
const auth = vi.hoisted(() => ({ user: { id: 'author' } as { id: string } | null, isLoading: false }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../navbar', () => ({ Navbar: () => null }));
vi.mock('../../../lib/supabase-community', async () => ({
  ...(await vi.importActual('../../../lib/supabase-community')), communityApi: api,
}));
const problem: CommunityProblem = {
  id: 'case-1', author_id: 'author', category_id: 'category', title: 'Gateway timeout', symptom: '504 response',
  environment: { description: 'Azure test setup' }, product: 'Gateway', product_version: '1', expected_behavior: '200 response',
  actual_behavior: '504 response', attempted_tests: [], observations: '', verification_method: '', tags: [],
  visibility: 'public', state: 'open', accepted_solution_id: null, resolution_observation: null, resolution_verification: null,
  solved_at: null, created_at: '', updated_at: '',
};
const solution = { id: 'solution-1', problem_id: 'case-1', author_id: 'contributor', diagnosis: 'Wrong backend', steps: ['Correct routing'], reasoning: 'Old host is gone', verification_method: 'Repeat request', observations: '', sources: ['javascript:alert(1)'], created_at: '', updated_at: '' };
function page(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/post-problem" element={<CommunityEditor />} />
    <Route path="/problem/:id/edit" element={<CommunityEditor />} />
    <Route path="/problem/:id" element={<CommunityDiscussion />} />
  </Routes></MemoryRouter>);
}
beforeEach(() => {
  Object.values(api).forEach(m => m.mockReset()); auth.user = { id: 'author' }; auth.isLoading = false;
  api.get.mockResolvedValue({ ...problem });
  api.discussion.mockResolvedValue({ solutions: [solution], comments: [] });
  api.taxonomy.mockResolvedValue({ domains: [{ id: 'domain', name: 'Cloud Computing and DevOps' }], categories: [{ id: 'category', domain_id: 'domain', name: 'Cloud platforms' }] });
});

describe('community core journey', () => {
  it('saves incomplete private drafts and navigates to their persisted page', async () => {
    const draft = { ...problem, title: 'My draft', visibility: 'draft', symptom: '' };
    api.save.mockResolvedValue(draft); api.get.mockResolvedValue(draft);
    page('/post-problem');
    await userEvent.type(await screen.findByLabelText('Problem title'), 'My draft');
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'category');
    await userEvent.click(screen.getByRole('button', { name: 'Save private draft' }));
    expect(api.save).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'draft', title: 'My draft' }), undefined);
    expect(await screen.findByText(/Only you can see this private draft/)).toBeVisible();
  });
  it('requires diagnostic context to publish and preserves entered text after a save failure', async () => {
    page('/post-problem');
    await userEvent.type(await screen.findByLabelText('Problem title'), 'Keep my input');
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'category');
    await userEvent.click(screen.getByRole('button', { name: 'Publish problem' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Before publishing');
    expect(api.save).not.toHaveBeenCalled();
    api.save.mockRejectedValue(new Error('Network unavailable'));
    await userEvent.click(screen.getByRole('button', { name: 'Save private draft' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable');
    expect(screen.getByLabelText('Problem title')).toHaveValue('Keep my input');
  });
  it('rejects editing another user’s problem on direct navigation', async () => {
    auth.user = { id: 'contributor' };
    page('/problem/case-1/edit');
    expect(await screen.findByRole('alert')).toHaveTextContent('permission to edit');
    expect(screen.queryByRole('button', { name: 'Publish problem' })).not.toBeInTheDocument();
  });
  it('shows a private/not-found response and hides all mutation controls', async () => {
    auth.user = { id: 'contributor' }; api.get.mockResolvedValue(null);
    page('/problem/case-1');
    expect(await screen.findByRole('heading', { name: 'Problem unavailable' })).toBeVisible();
    expect(api.discussion).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Accept solution/ })).not.toBeInTheDocument();
  });
  it('contributors can propose and clarify but never see author acceptance or unsafe source links', async () => {
    auth.user = { id: 'contributor' }; api.get.mockResolvedValue({ ...problem, state: 'testing' });
    page('/problem/case-1');
    await screen.findByRole('heading', { name: 'Wrong backend' });
    expect(screen.getByRole('button', { name: 'Submit solution' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Add clarification' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /Accept solution/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'javascript:alert(1)' })).not.toBeInTheDocument();
  });
  it('author records evidence, marks Testing and confirms the tested solution', async () => {
    api.comment.mockImplementation(async input => ({ ...input, id: 'test-1', author_id: 'author' }));
    api.state.mockResolvedValue({ ...problem, state: 'testing' });
    api.accept.mockResolvedValue({ ...problem, state: 'solved', accepted_solution_id: solution.id, resolution_observation: '200 response', resolution_verification: 'Three requests' });
    page('/problem/case-1');
    await userEvent.type(await screen.findByLabelText(/What did you test/), 'Changed backend');
    await userEvent.type(screen.getByLabelText(/What did you observe/), '200 response');
    await userEvent.type(screen.getByLabelText(/How did you verify the result/), 'Three requests');
    await userEvent.click(screen.getByRole('button', { name: 'Save test result' }));
    expect(api.comment).toHaveBeenCalledWith(expect.objectContaining({ kind: 'test_result', attempted_test: 'Changed backend', observation: '200 response' }));
    await userEvent.click(screen.getByRole('button', { name: 'Mark as Testing' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Accept solution and mark Solved' }));
    expect(api.accept).toHaveBeenCalledWith({ p_problem_id: 'case-1', p_solution_id: 'solution-1', p_observation: '200 response', p_verification: 'Three requests' });
    const confirmed = await screen.findByRole('region', { name: 'Confirmed fix' });
    expect(within(confirmed).getByText('Three requests')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Accept solution and mark Solved' })).not.toBeInTheDocument();
  });
  it('reports schema failures with retry instead of pretending the problem is absent', async () => {
    api.get.mockRejectedValueOnce(new Error('Community service is not ready')).mockResolvedValueOnce(problem);
    page('/problem/case-1');
    expect(await screen.findByRole('alert')).toHaveTextContent('not ready');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Gateway timeout' })).toBeVisible();
  });
  it('requires confirmation to close an unresolved problem', async () => {
    api.state.mockResolvedValue({ ...problem, state: 'closed' });
    page('/problem/case-1');
    await userEvent.click(await screen.findByRole('button', { name: 'Close unresolved problem' }));
    expect(api.state).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm close' }));
    await waitFor(() => expect(api.state).toHaveBeenCalledWith('case-1', 'closed'));
    expect(await screen.findByText('This discussion is closed without a confirmed fix.')).toBeVisible();
  });
});
