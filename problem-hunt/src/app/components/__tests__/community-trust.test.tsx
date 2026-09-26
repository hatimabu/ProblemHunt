import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router';
import {beforeEach,it,expect,vi} from 'vitest';
import {VoteControl,ReverseAcceptance} from '../community/reputation';
import {ReportControl,ModeratorPage} from '../community/moderation';
const api=vi.hoisted(()=>({voteInfo:vi.fn(),vote:vi.fn(),reverse:vi.fn(),report:vi.fn(),moderator:vi.fn(),reports:vi.fn(),reviews:vi.fn(),review:vi.fn()}));
vi.mock('../../../lib/supabase-community',()=>({communityApi:api,communityError:()=> 'Request rejected'}));
vi.mock('../../contexts/AuthContext',()=>({useAuth:()=>({user:{id:'user'}})}));
vi.mock('../navbar',()=>({Navbar:()=>null}));
beforeEach(()=>{vi.resetAllMocks();});
it('adds then removes an upvote without optimistic score forging',async()=>{
 api.voteInfo.mockResolvedValueOnce({count:0,voted:false}).mockResolvedValueOnce({count:1,voted:true}).mockResolvedValueOnce({count:0,voted:false});api.vote.mockResolvedValue(undefined);
 render(<MemoryRouter><VoteControl problemId='p' solutionId='s' own={false} signedIn closed={false}/></MemoryRouter>);
 await userEvent.click(await screen.findByRole('button',{name:'Upvote solution'}));expect(await screen.findByText('1 community upvote')).toBeVisible();
 await userEvent.click(screen.getByRole('button',{name:'Remove upvote'}));expect(await screen.findByText('No community upvotes yet')).toBeVisible();expect(api.vote.mock.calls).toEqual([['s',false],['s',true]]);
});
it('keeps acceptance when a reversal is denied',async()=>{
 api.reverse.mockRejectedValue(new Error());const changed=vi.fn();render(<ReverseAcceptance problem={{id:'p'} as never} onReversed={changed}/>);
 await userEvent.click(screen.getByText('Reopen for testing'));await userEvent.type(screen.getByLabelText(/Why did the fix/),'Regression');await userEvent.click(screen.getByText('Confirm acceptance reversal'));
 expect(await screen.findByRole('alert')).toHaveTextContent('Request rejected');expect(changed).not.toHaveBeenCalled();
});
it('submits a private report and renders unsafe text as text in moderator review',async()=>{
 api.report.mockResolvedValue(undefined);render(<ReportControl target={{problem_id:'p'}} label='problem'/>);
 await userEvent.click(screen.getByText('Report problem'));await userEvent.type(screen.getByLabelText(/Report reason/),'Unsafe instructions');await userEvent.click(screen.getByText('Send report'));
 expect(await screen.findByText(/Report sent privately/)).toBeVisible();expect(api.report).toHaveBeenCalledWith({problem_id:'p'},'Unsafe instructions','');
});
it('denies nonmoderators before loading private report data',async()=>{
 api.moderator.mockResolvedValue(false);render(<MemoryRouter><ModeratorPage/></MemoryRouter>);
 expect(await screen.findByText('You do not have moderator permission.')).toBeVisible();expect(api.reports).not.toHaveBeenCalled();
});
it('renders report payload without creating executable HTML',async()=>{
 api.moderator.mockResolvedValue(true);api.reports.mockResolvedValue([{id:'r',reason:'<img src=x onerror=alert(1)>',details:'<script>alert(1)</script>',target_excerpt:'Synthetic case'}]);api.reviews.mockResolvedValue([]);
 const {container}=render(<MemoryRouter><ModeratorPage/></MemoryRouter>);await screen.findByText('<script>alert(1)</script>');expect(container.querySelector('script,img')).toBeNull();
});
