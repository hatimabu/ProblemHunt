import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { CommunityDiscovery } from '../community/discovery';
const api=vi.hoisted(()=>({taxonomy:vi.fn(),search:vi.fn()}));
vi.mock('../navbar',()=>({Navbar:()=>null}));
vi.mock('../../../lib/supabase-community',()=>({communityApi:api,communityError:()=> 'Search unavailable'}));
const row={id:'one',title:'Example case',state:'solved',visibility:'public',symptom:'Dropouts',product:'Mixer',tags:['audio'],resolution_observation:'Clock synchronized'};
function page(path='/browse') {return render(<MemoryRouter initialEntries={[path]}><Routes><Route path='/browse' element={<CommunityDiscovery/>}/><Route path='/domains/:domain' element={<CommunityDiscovery/>}/></Routes></MemoryRouter>);}
beforeEach(()=>{vi.resetAllMocks();api.taxonomy.mockResolvedValue({domains:[{id:'av',slug:'professional-av',name:'Professional AV and Audio'}],categories:[{id:'audio',domain_id:'av',slug:'audio-rf',name:'Audio and RF'}]});api.search.mockResolvedValue({rows:[row],hasMore:false});});
it('restores domain and all filters from direct URL and preserves filters on pagination',async()=>{
 page('/domains/professional-av?q=dropouts&category=audio-rf&tag=audio&state=solved');
 expect(await screen.findByText('Example case')).toBeVisible();
 expect(api.search).toHaveBeenCalledWith({domain:'professional-av',query:'dropouts',category:'audio-rf',tag:'audio',state:'solved',page:1});
 expect(screen.getByLabelText('Search symptoms, products or tags')).toHaveValue('dropouts');
 api.search.mockResolvedValue({rows:[row],hasMore:true});
 await userEvent.selectOptions(screen.getByLabelText('Status'),'open');
 await userEvent.click(await screen.findByRole('link',{name:'Next page'}));
 await waitFor(()=>expect(api.search).toHaveBeenLastCalledWith(expect.objectContaining({page:2,state:'open',tag:'audio',query:'dropouts'})));
});
it('shows loading, errors with retry and useful empty results',async()=>{
 let reject!: (e:Error)=>void; api.search.mockImplementationOnce(()=>new Promise((_,r)=>{reject=r;}));page();
 expect(screen.getByRole('status')).toHaveTextContent('Searching');
 reject(new Error('offline'));expect(await screen.findByRole('alert')).toHaveTextContent('Search unavailable');
 api.search.mockResolvedValue({rows:[],hasMore:false});await userEvent.click(screen.getByRole('button',{name:'Try again'}));
 expect(await screen.findByText(/No matching public problems/)).toBeVisible();expect(screen.getByRole('link',{name:'Post a problem'})).toBeVisible();
});
it('ignores stale search responses after a filter changes',async()=>{
 let resolve!: (r:unknown)=>void;api.search.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));page();
 await userEvent.type(screen.getByLabelText('Search symptoms, products or tags'),'audio');
 await userEvent.click(screen.getByRole('button',{name:'Search'}));expect(await screen.findByText('Example case')).toBeVisible();
 resolve({rows:[{...row,title:'Stale result'}],hasMore:false});
 await waitFor(()=>expect(screen.queryByText('Stale result')).not.toBeInTheDocument());
});
