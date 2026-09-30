import { isProblemPost } from '../../../lib/community';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowUpRight, CheckCircle2, Clock3, MessageSquare, Search } from 'lucide-react';
import { communityApi, communityError } from '../../../lib/supabase-community';
import type { CommunityProblem } from '../../../lib/community';
import { CommunityLayout, ErrorNotice, StateLabel } from './shared';
import { HubShell } from './hub-shell';
import { RouteTabs } from './route-tabs';
import { PersonalLibraryProvider, usePersonalLibrary, LibraryNotice, FollowedTags, SaveCaseButton, PersonalSignIn } from './personal-library';

export function CommunityLanding() {
  return <PersonalLibraryProvider><CommunityFeed /></PersonalLibraryProvider>;
}
function CommunityFeed() {
  const library = usePersonalLibrary()!;
  const [params] = useSearchParams(), navigate = useNavigate();
  const view = params.get('view') === 'following' ? 'following' : params.get('view') === 'saved' ? 'saved' : params.get('view') === 'unanswered' ? 'unanswered' : params.get('view') === 'tested' ? 'tested' : 'latest';
  const personal = view === 'following' || view === 'saved';
  const page = Math.min(501, Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1));
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ key: string; rows: CommunityProblem[]; hasMore: boolean } | null>(null);
  const [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const key = `${view}:${page}:${personal ? library.userId || 'anon' : ''}:${library.version}`;
  useEffect(() => {
    let active = true; setResult(null); setError('');
    if (personal && (!library.userId || library.loading)) return () => { active = false; };
    (view === 'following' || view === 'saved' ? communityApi.personalFeed(view, page) : communityApi.feed(view, page)).then(r => { if (active) setResult({ ...r, key }); })
      .catch(e => { if (active) setError(communityError(e)); });
    return () => { active = false; };
  }, [view, page, key, retry, personal, library.userId, library.loading]);
  const current = result?.key === key ? result : null;
  function search(e: FormEvent) { e.preventDefault(); navigate(`/browse?q=${encodeURIComponent(input.trim())}`); }
  return <CommunityLayout title="Real problems. Tested solutions." indexable={view === 'latest' && page === 1} wide><HubShell>
    <section className="hub-welcome"><div><p className="board-kicker">The technical knowledge community</p><h1>Real problems.<br /><span>Tested solutions.</span></h1><p>Bring a symptom. Compare ideas. Share what worked.</p></div><Link className="hub-post" to="/post-problem">Post a problem <ArrowUpRight size={18} aria-hidden="true" /></Link></section>
    <form className="hub-search" role="search" onSubmit={search}><Search size={20} aria-hidden="true" /><label className="hub-sr-only" htmlFor="community-search">Search symptoms, products or tags</label><input id="community-search" type="search" placeholder="What are you troubleshooting?" value={input} maxLength={500} onChange={e => setInput(e.target.value)} /><button type="submit">Search</button></form>
    <div className="hub-feed-heading"><h2>{view === 'following' ? 'Following' : view === 'saved' ? 'Saved cases' : 'Community feed'}</h2><span>{personal ? 'Only visible to you' : 'Learn through real cases'}</span></div>
    <div className="community-actions"><Link to="/browse?type=lab">Lab write-ups</Link><Link to="/browse?type=incident">Incident reviews</Link></div>
    <LibraryNotice />
    {view === 'following' && <FollowedTags />}
    <RouteTabs label="Feed views" items={[{ label: 'Latest', to: '/', active: view === 'latest', icon: Clock3 }, { label: 'Unanswered', to: '/?view=unanswered', active: view === 'unanswered', icon: MessageSquare }, { label: 'Tested fixes', to: '/?view=tested', active: view === 'tested', icon: CheckCircle2 }]} />
    <p className="hub-feed-description">{view === 'following' ? 'Public posts matching any tag you follow, newest first.' : view === 'saved' ? 'Your saved public cases, most recently saved first. Private or hidden content is not shown.' : view === 'unanswered' ? 'Open or testing problems with no proposed solutions yet.' : view === 'tested' ? 'Solutions confirmed by their authors, most recently tested first.' : 'Newly published problems and write-ups, newest first. Every useful observation helps.'}</p>
    {personal && !library.userId && !library.loading ? <PersonalSignIn /> : error ? <ErrorNotice error={error} retry={() => setRetry(n => n + 1)} /> : !current ? <div className="hub-empty" role="status">Loading community problems…</div> : current.rows.length ? <>
      <div className="hub-feed">{current.rows.map(p => <article className="hub-case" key={p.id}>
        <div className="hub-case-meta"><span>{p.product || 'Community problem'}</span><StateLabel problem={p} /></div>
        <h2><Link to={`/problem/${p.id}`}>{p.title}</Link></h2><p className="community-preview">{p.symptom}</p>
        {p.is_example && <p className="hub-example">Fictional example — outcomes are simulated.</p>}
        {isProblemPost(p) && p.state === 'solved' && p.accepted_solution_id && <p className="hub-evidence"><CheckCircle2 size={16} aria-hidden="true" /><span><strong>{p.is_example ? 'Illustrative outcome' : 'Author-confirmed fix'}</strong>{p.resolution_observation && ` · ${p.resolution_observation}`}</span></p>}
        <div className="hub-case-footer"><div>{p.tags.map(tag => <Link key={tag} to={`/browse?tag=${encodeURIComponent(tag)}`}>#{tag}</Link>)}</div><SaveCaseButton id={p.id} /><Link to={`/problem/${p.id}`}>{isProblemPost(p) ? 'Join discussion' : 'Read write-up'} <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
      </article>)}</div>
      <nav className="community-actions" aria-label="Feed pages">{page > 1 && <Link to={`/?view=${view}&page=${page - 1}`}>Previous page</Link>}{current.hasMore && page < 501 && <Link to={`/?view=${view}&page=${page + 1}`}>Next page</Link>}</nav>
    </> : <section className="hub-empty"><MessageSquare aria-hidden="true" /><h2>{view === 'following' ? 'No matching public cases yet.' : view === 'saved' ? 'No visible saved cases here yet.' : view === 'unanswered' ? 'No unanswered problems here.' : view === 'tested' ? 'The next tested fix starts with a problem.' : 'Make room for the first conversation.'}</h2><p>{page > 1 ? 'No problems on this page. Return to the first page to explore.' : view === 'following' ? 'Follow a tag above to bring relevant problems into this feed.' : view === 'saved' ? 'Use Save case on a public problem to find it here later.' : 'Have a technical problem? Describe what you see and what you’ve tried. Give the community a place to begin.'}</p><Link to={page > 1 ? `/?view=${view}` : personal ? '/browse' : '/post-problem'}>{page > 1 ? 'First page' : personal ? 'Explore the library' : 'Start a discussion'} →</Link></section>}
  </HubShell></CommunityLayout>;
}
