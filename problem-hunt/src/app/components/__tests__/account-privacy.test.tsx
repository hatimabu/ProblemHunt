import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach,it,expect,vi} from 'vitest';
import {AccountPrivacyControls,DeletionRequestQueue} from '../community/account-privacy';
const api=vi.hoisted(()=>({request:vi.fn(),exportAccount:vi.fn(),setRequested:vi.fn(),queue:vi.fn(),review:vi.fn()}));
const download=vi.hoisted(()=>vi.fn());
vi.mock('../../../lib/account-privacy',()=>({accountPrivacyApi:api,downloadAccountExport:download}));
const request={user_id:'alice',status:'requested',requested_at:'2026-10-02T00:00:00Z',updated_at:'2026-10-02T00:00:00Z'};
beforeEach(()=>{vi.resetAllMocks();api.request.mockResolvedValue(null);api.queue.mockResolvedValue({rows:[],hasMore:false});});
it('requires confirmation, shows successful request only after persistence and allows cancellation',async()=>{
 render(<AccountPrivacyControls userId="alice"/>);
 await waitFor(()=>expect(screen.queryByText('Loading account request…')).not.toBeInTheDocument());
 expect(screen.getByRole('button',{name:'Send deletion request'})).toBeDisabled();
 await userEvent.click(screen.getByRole('checkbox'));
 api.setRequested.mockResolvedValueOnce(request);
 await userEvent.click(screen.getByRole('button',{name:'Send deletion request'}));
 expect(await screen.findByText(/Your account and content have not been deleted/)).toBeInTheDocument();
 api.setRequested.mockResolvedValueOnce({...request,status:'cancelled'});
 await userEvent.click(screen.getByRole('button',{name:'Cancel deletion request'}));
 expect(await screen.findByText('Deletion request cancelled.')).toBeInTheDocument();
 expect(api.setRequested.mock.calls).toEqual([[true],[false]]);
});
it('does not claim a failed export or deletion request succeeded',async()=>{
 api.exportAccount.mockRejectedValue(new Error('Export unavailable'));api.setRequested.mockRejectedValue(new Error('Request unavailable'));
 render(<AccountPrivacyControls userId="alice"/>);
 await userEvent.click(screen.getByRole('button',{name:'Download my data'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Export unavailable');expect(download).not.toHaveBeenCalled();
 await userEvent.click(screen.getByRole('button',{name:'Try again'}));await waitFor(()=>expect(screen.queryByRole('alert')).not.toBeInTheDocument());
 await userEvent.click(screen.getByRole('checkbox'));await userEvent.click(screen.getByRole('button',{name:'Send deletion request'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Request unavailable');expect(screen.queryByText(/request sent for review/)).not.toBeInTheDocument();
});
it('discards an export response after the account component unmounts',async()=>{
 let resolve!:(value:unknown)=>void;api.exportAccount.mockReturnValue(new Promise(r=>{resolve=r;}));
 const view=render(<AccountPrivacyControls userId="alice"/>);await userEvent.click(screen.getByRole('button',{name:'Download my data'}));view.unmount();
 resolve({account:{id:'alice'}});await Promise.resolve();expect(download).not.toHaveBeenCalled();
});
it('shows a cancelled request race instead of pretending moderator review started',async()=>{
 api.queue.mockResolvedValue({rows:[request],hasMore:false});api.review.mockRejectedValue(new Error('Request changed; refresh the queue'));
 render(<DeletionRequestQueue/>);await userEvent.click(await screen.findByRole('button',{name:'Start review'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Request changed');
});
