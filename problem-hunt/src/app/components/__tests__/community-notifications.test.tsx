import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { FollowDiscussion, NotificationsPage } from '../community/notifications';
const api=vi.hoisted(()=>({follows:vi.fn(),follow:vi.fn(),inbox:vi.fn(),following:vi.fn(),read:vi.fn()}));
const auth=vi.hoisted(()=>({user:{id:'alice'} as {id:string}|null,isLoading:false}));
vi.mock('../../contexts/AuthContext',()=>({useAuth:()=>auth}));
vi.mock('../navbar',()=>({Navbar:()=>null}));
vi.mock('../../../lib/community-notifications',async()=>({...await vi.importActual('../../../lib/community-notifications'),notificationApi:api}));
const n={id:'n1',message:'New reply in a discussion you follow.',link:'/problem/00000000-0000-0000-0000-000000000001#solution-00000000-0000-0000-0000-000000000002',is_read:false,created_at:'2026-09-28T12:00:00Z'};
beforeEach(()=>{vi.resetAllMocks();auth.user={id:'alice'};api.follows.mockResolvedValue(false);api.follow.mockResolvedValue(undefined);api.read.mockResolvedValue(undefined);api.inbox.mockResolvedValue({rows:[n],hasMore:false});api.following.mockResolvedValue({rows:[],hasMore:false});});
it('follows and unfollows only after server confirmation',async()=>{
 render(<MemoryRouter><FollowDiscussion id="p1"/></MemoryRouter>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Follow replies'})).toBeEnabled());
 api.follows.mockResolvedValue(true);await userEvent.click(screen.getByRole('button',{name:'Follow replies'}));
 expect(await screen.findByRole('button',{name:'Following replies · unfollow'})).toHaveAttribute('aria-pressed','true');
 expect(api.follow).toHaveBeenCalledWith('alice','p1',true);
 api.follows.mockResolvedValue(false);await userEvent.click(screen.getByRole('button',{name:'Following replies · unfollow'}));
 await waitFor(()=>expect(api.follow).toHaveBeenLastCalledWith('alice','p1',false));
});
it('recovers preference load failures and never claims a failed follow succeeded',async()=>{
 api.follows.mockRejectedValueOnce(new Error('Offline'));render(<MemoryRouter><FollowDiscussion id="p1"/></MemoryRouter>);
 expect(await screen.findByRole('alert')).toHaveTextContent('Offline');await userEvent.click(screen.getByRole('button',{name:'Try again'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Follow replies'})).toBeEnabled());api.follow.mockRejectedValue(new Error('Write failed'));
 await userEvent.click(screen.getByRole('button',{name:'Follow replies'}));expect(await screen.findByRole('alert')).toHaveTextContent('Write failed');
 expect(screen.getByRole('button',{name:'Follow replies'})).toHaveAttribute('aria-pressed','false');
});
it('drops previous account preference responses on account switch',async()=>{
 let resolve!:(value:boolean)=>void;api.follows.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
 const view=render(<MemoryRouter><FollowDiscussion id="p1"/></MemoryRouter>);auth.user={id:'bob'};view.rerender(<MemoryRouter><FollowDiscussion id="p1"/></MemoryRouter>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Follow replies'})).toBeEnabled());resolve(true);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Follow replies'})).toHaveAttribute('aria-pressed','false'));expect(api.follows).toHaveBeenLastCalledWith('bob','p1');
});
it('marks notifications read and removes unavailable followed discussions without exposing titles',async()=>{
 api.following.mockResolvedValue({rows:[{problem_id:'hidden',problem:{title:'Hidden private title',visibility:'public',is_hidden:true}}],hasMore:false});
 render(<MemoryRouter><NotificationsPage/></MemoryRouter>);expect(await screen.findByText(n.message)).toBeVisible();
 expect(screen.queryByText('Hidden private title')).not.toBeInTheDocument();expect(screen.getByRole('link',{name:'View reply'})).toHaveAttribute('href',n.link);
 api.inbox.mockResolvedValue({rows:[{...n,is_read:true}],hasMore:false});await userEvent.click(screen.getByRole('button',{name:'Mark read'}));
 expect(await screen.findByRole('button',{name:'Mark unread'})).toBeVisible();expect(api.read).toHaveBeenCalledWith('alice','n1',true);
 api.following.mockResolvedValue({rows:[],hasMore:false});await userEvent.click(screen.getByRole('button',{name:'Unfollow discussion'}));
 await waitFor(()=>expect(api.follow).toHaveBeenCalledWith('alice','hidden',false));
});
it('shows errors honestly, paginates and refuses external notification links',async()=>{
 api.inbox.mockRejectedValueOnce(new Error('Offline'));render(<MemoryRouter><NotificationsPage/></MemoryRouter>);
 expect(await screen.findByRole('alert')).toHaveTextContent('Offline');api.inbox.mockResolvedValue({rows:[{...n,link:'https://evil.example'}],hasMore:true});
 await userEvent.click(screen.getByRole('button',{name:'Try again'}));await screen.findByText(n.message);expect(screen.queryByRole('link',{name:'View reply'})).not.toBeInTheDocument();
 await userEvent.click(screen.getByRole('button',{name:'Next notifications'}));await waitFor(()=>expect(api.inbox).toHaveBeenLastCalledWith('alice',2));
});
it('never retains inbox content after sign-out or reads it anonymously',async()=>{
 const view=render(<MemoryRouter><NotificationsPage/></MemoryRouter>);await screen.findByText(n.message);auth.user=null;view.rerender(<MemoryRouter><NotificationsPage/></MemoryRouter>);
 expect(screen.queryByText(n.message)).not.toBeInTheDocument();expect(screen.getByRole('link',{name:'Sign in to view notifications'})).toHaveAttribute('href','/auth?returnTo=%2Fnotifications');
 expect(api.inbox).toHaveBeenCalledTimes(1);
});
