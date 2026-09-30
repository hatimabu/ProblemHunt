import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter,Routes,Route} from 'react-router';
import {expect,it,vi} from 'vitest';
import {CommunityLanding} from '../community/home';
import {CommunityDiscovery} from '../community/discovery';
vi.mock('../navbar',()=>({Navbar:()=>null}));
vi.mock('../../contexts/AuthContext',()=>({useAuth:()=>({user:null,isLoading:false})}));
const search=vi.hoisted(()=>vi.fn(async()=>({rows:[],hasMore:false})));
vi.mock('../../../lib/supabase-community',async()=>({...await vi.importActual('../../../lib/supabase-community'),communityApi:{search,feed:async()=>({rows:[],hasMore:false}),taxonomy:async()=>({domains:[{id:'cloud',slug:'cloud-devops',name:'Cloud / DevOps'},{id:'av',slug:'professional-av',name:'Professional AV'}],categories:[]})}}));
it('renders the community feed with an honest empty state and working navigation',async()=>{
 search.mockClear();const {container}=render(<MemoryRouter><CommunityLanding/></MemoryRouter>);
 expect(await screen.findByText('Make room for the first conversation.')).toBeVisible();expect(screen.getByRole('navigation',{name:'Feed views'})).toBeVisible();expect(container.querySelector('h1')).toHaveTextContent('Real problems.');expect(search).not.toHaveBeenCalled();
});
it('preserves Browse shell and filters across domain routes with visible active links',async()=>{
 render(<MemoryRouter initialEntries={['/browse?q=audio']}><Routes><Route element={<CommunityDiscovery/>}><Route path="/browse" element={null}/><Route path="/domains/:domain" element={null}/></Route></Routes></MemoryRouter>);
 await screen.findByText('No matching public posts. Try fewer words or clear the filters.');
 const shell=screen.getByRole('navigation',{name:'Knowledge domains'}),form=screen.getByRole('search');
 await userEvent.click(screen.getByRole('link',{name:'Professional AV'}));
 await waitFor(()=>expect(search).toHaveBeenLastCalledWith(expect.objectContaining({domain:'professional-av',query:'audio'})));
 expect(screen.getByRole('navigation',{name:'Knowledge domains'})).toBe(shell);expect(screen.getByRole('search')).toBe(form);
 expect(screen.getByRole('link',{name:'Professional AV'})).toHaveAttribute('aria-current','page');
 const all=screen.getByRole('link',{name:'All domains'});all.focus();await userEvent.keyboard('{ArrowRight}');expect(screen.getByRole('link',{name:'Cloud / DevOps'})).toHaveFocus();
});
