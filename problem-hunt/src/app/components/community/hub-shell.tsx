import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { AudioLines, ArrowUpRight, Bookmark, Hash, CheckCircle2, Cloud, Compass, LayoutDashboard, MessageSquare, Trophy } from 'lucide-react';
import { communityApi } from '../../../lib/supabase-community';
import { isProblemPost, type CommunityProblem } from '../../../lib/community';
import './hub.css';

export function HubShell({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation();
  const view = new URLSearchParams(search).get('view');
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 900px)');
    const sync = () => { if (menu.current) menu.current.open = media.matches; };
    sync(); media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  const [fixes, setFixes] = useState<CommunityProblem[] | null>(null);
  const [failed, setFailed] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true; setFailed(false); setFixes(null);
    communityApi.feed('tested').then(r => { if (active) setFixes(r.rows.filter(p => isProblemPost(p) && p.state === 'solved' && p.accepted_solution_id).slice(0, 3)); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [retry]);
  const links = [
    { to: '/', label: 'Community feed', icon: Compass },
    { to: '/?view=following', label: 'Following', icon: Hash },
    { to: '/?view=saved', label: 'Saved cases', icon: Bookmark },
    { to: '/browse', label: 'Knowledge library', icon: MessageSquare },
    { to: '/domains/cloud-devops', label: 'Cloud & DevOps', icon: Cloud },
    { to: '/domains/professional-av', label: 'AV & Audio', icon: AudioLines },
    { to: '/leaderboard', label: 'Reputation', icon: Trophy },
    { to: '/dashboard', label: 'My workspace', icon: LayoutDashboard },
  ];
  return <div className="hub-grid">
    <aside className="hub-left" aria-label="Community navigation">
      <details className="hub-menu" ref={menu} open><summary>Explore the community</summary>
        <nav aria-label="Community sections">{links.map(({ to, label, icon: Icon }) => <Link key={to} to={to} aria-current={(to.includes('?') ? pathname === '/' && to === `/?view=${view}` : pathname === to && !(pathname === '/' && ['following','saved'].includes(view || ''))) ? 'page' : undefined}><Icon size={18} aria-hidden="true" />{label}</Link>)}</nav>
      </details>
      <div className="hub-left-note"><span className="board-kicker">Built on evidence</span><p>A useful observation can be the start of someone else’s solution.</p><Link to="/post-problem">Share your problem <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
    </aside>
    <div className="hub-content">{children}</div>
    <aside className="hub-right" aria-label="Community context">
      <section className="hub-panel hub-principle"><CheckCircle2 aria-hidden="true" /><h2>Test it. Then share it.</h2><p>Votes mean helpful. Acceptance means the author tested a solution and confirmed it worked.</p><Link to="/post-problem">Post a problem <ArrowUpRight size={16} aria-hidden="true" /></Link></section>
      <section className="hub-panel"><p className="board-kicker">From the library</p><h2>Recently tested fixes</h2>
        {failed ? <><p>Tested fixes couldn’t load.</p><button type="button" onClick={() => setRetry(n => n + 1)}>Retry tested fixes</button></> : fixes === null ? <p>Loading tested fixes…</p> : fixes.length ? <ul className="hub-fixes">{fixes.map(p => <li key={p.id}><Link to={`/problem/${p.id}`}>{p.title}</Link><span>{p.is_example ? 'Simulated example' : 'Author-confirmed'}{p.product ? ` · ${p.product}` : ''}</span></li>)}</ul> : <p>No tested fixes yet. When authors confirm what worked, you’ll find it here.</p>}
        <Link className="hub-text-link" to="/?view=tested">Explore tested fixes →</Link>
      </section>
      <section className="hub-panel hub-guide"><p className="board-kicker">A better first post</p><h2>Give others a starting point.</h2><ol><li>Describe the symptom and environment.</li><li>Include what you tried and observed.</li><li>Remove secrets and private details.</li></ol><Link to="/privacy">Community privacy</Link></section>
    </aside>
  </div>;
}
