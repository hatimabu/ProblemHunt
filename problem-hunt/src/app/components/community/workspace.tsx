import {useEffect,useState} from 'react';
import {Link,Outlet,useLocation} from 'react-router';
import {LayoutDashboard,ClipboardList,MessageSquare,CheckCircle2,Trophy,Gift,Plus,RefreshCw} from 'lucide-react';
import {useAuth} from '../../contexts/AuthContext';
import {profileApi,blankProfile,type CommunityProfile} from '../../../lib/community-profile';
import {communityError} from '../../../lib/supabase-community';
import {CommunityLayout,ErrorNotice} from './shared';
import {Identity} from './account';
import {WorkspaceContext} from './workspace-context';
import {RouteTabs} from './route-tabs';
export function DashboardShell(){
 const {user}=useAuth();const location=useLocation();const [revision,setRevision]=useState(0),[data,setData]=useState<{profile:CommunityProfile}|null>(null),[error,setError]=useState('');
 const refresh=()=>setRevision(v=>v+1);
 useEffect(()=>{let active=true;setError('');profileApi.get(user!.id).then(profile=>{if(active)setData({profile:profile||blankProfile(user!.id)});}).catch(e=>{if(active)setError(communityError(e));});return()=>{active=false;};},[user!.id,revision]);
 const accepted=location.pathname==='/my-solutions'&&new URLSearchParams(location.search).get('accepted')==='1';
 const items=[{label:'Overview',to:'/dashboard',icon:LayoutDashboard},{label:'My problems',to:'/my-problems',icon:ClipboardList},{label:'My solutions',to:'/my-solutions',icon:MessageSquare},{label:'Accepted fixes',to:'/my-solutions?accepted=1',icon:CheckCircle2},{label:'Reputation history',to:'/dashboard/reputation',icon:Trophy}].map(x=>({...x,active:x.label==='Accepted fixes'?accepted:x.label==='My solutions'?location.pathname===x.to&&!accepted:location.pathname===x.to}));
 return <CommunityLayout title="Your dashboard"><WorkspaceContext.Provider value={{refresh}}><header className="workspace-heading"><div><p className="board-kicker">Mission control / community workspace</p><h1>Your dashboard</h1><p>Track your problems, contributions and tested fixes.</p></div><div className="community-actions"><button onClick={refresh}><RefreshCw size={16} aria-hidden="true"/>Refresh</button><Link className="community-action community-lime" to="/post-problem"><Plus size={16} aria-hidden="true"/>Post a problem</Link></div></header>
 {error&&<ErrorNotice error={error} retry={refresh}/>}
 <div className="workspace-grid"><aside className="workspace-sidebar">{data?<Link to="/profile" className="workspace-profile-link" aria-label="Edit your profile"><Identity profile={data.profile} compact/></Link>:<section className="board-panel community-card"><p role="status">Loading identity…</p></section>}<section className="board-panel community-card"><span className="community-icon"><Gift size={20} aria-hidden="true"/></span><p className="board-kicker">Future feature</p><h2>Tips</h2><p>Optional appreciation for helpful contributions. Planned for a later release.</p><button disabled aria-label="Tips — planned feature">Planned · unavailable</button></section></aside>
 <section className="workspace-panel" aria-label="Dashboard workspace"><RouteTabs label="Your workspace" items={items}/><div className="workspace-content"><Outlet/></div></section></div></WorkspaceContext.Provider></CommunityLayout>;
}
