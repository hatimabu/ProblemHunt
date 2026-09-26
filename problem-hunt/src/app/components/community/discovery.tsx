import { recordPilotMetric } from '../../../lib/pilot-privacy';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { communityApi, communityError } from '../../../lib/supabase-community';
import type { CommunityCategory, CommunityDomain, CommunityProblem } from '../../../lib/community';
import { CommunityLayout, ErrorNotice, ProblemList } from './shared';

export function CommunityDiscovery() {
  const { domain = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '', category = params.get('category') || '', tag = params.get('tag') || '', state = params.get('state') || '';
  const page = Math.min(501, Math.max(1, Number.parseInt(params.get('page') || '1',10) || 1));
  const [input, setInput] = useState(query);
  const [taxonomy, setTaxonomy] = useState<{ domains: CommunityDomain[]; categories: CommunityCategory[] }>({ domains: [], categories: [] });
  const [result, setResult] = useState<{ key: string; rows: CommunityProblem[]; hasMore: boolean } | null>(null);
  const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  const key = JSON.stringify([domain,query,category,tag,state,page]);
  useEffect(() => setInput(query), [query]);
  useEffect(() => {
    let active = true; setResult(null); setError('');
    Promise.all([communityApi.taxonomy(), communityApi.search({ domain, query, category, tag, state, page })]).then(([t,r]) => {
      if (active) { setTaxonomy(t); setResult({ ...r, key }); }
    }).catch(e => { if (active) setError(communityError(e)); });
    return () => { active = false; };
  }, [key,retry]);
  function update(name: string, value: string) {
    const next = new URLSearchParams(params); next.delete('page');
    if (value) next.set(name,value); else next.delete(name); setParams(next);
  }
  function submit(e: FormEvent) { e.preventDefault(); recordPilotMetric('searches'); update('q',input.trim()); }
  const selectedDomain = taxonomy.domains.find(d => d.slug === domain);
  const current = result?.key === key ? result : null;
  const invalidDomain = domain && !['cloud-devops','professional-av'].includes(domain);
  return <CommunityLayout>
    <nav aria-label="Knowledge domains" className="community-actions"><Link to="/browse">All domains</Link><Link to="/domains/cloud-devops">Cloud / DevOps</Link><Link to="/domains/professional-av">Professional AV</Link></nav>
    <h1>{invalidDomain ? 'Domain unavailable' : selectedDomain?.name || 'Search the knowledge library'}</h1>
    <p>Find symptoms, products and tags. Solved cases show what the author tested and confirmed; proposed answers still need testing.</p>
    {!invalidDomain && <><form onSubmit={submit} role="search" className="board-panel community-card">
      <label className="community-field"><span>Search symptoms, products or tags</span><input type="search" value={input} maxLength={500} onChange={e => setInput(e.target.value)} /></label>
      <button type="submit">Search</button>
      <div className="community-grid community-stack">
        <label className="community-field"><span>Category</span><select aria-label="Category" value={category} onChange={e => update('category',e.target.value)}><option value="">All categories</option>{taxonomy.categories.filter(c => !domain || c.domain_id === selectedDomain?.id).map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></label>
        <label className="community-field"><span>Status</span><select aria-label="Status" value={state} onChange={e => update('state',e.target.value)}><option value="">All states</option><option value="open">Open</option><option value="solved">Solved</option></select></label>
      </div>
      {tag && <p>Tag: <strong>#{tag}</strong> <button type="button" onClick={() => update('tag','')}>Remove tag</button></p>}
      <Link to={domain ? `/domains/${domain}` : '/browse'}>Clear filters</Link>
    </form>
    {error ? <ErrorNotice error={error} retry={() => setRetry(n => n+1)} /> : !current ? <p role="status">Searching public problems…</p> : <>
      <p role="status">{current.rows.length ? `Page ${page} · ${current.rows.length} results` : 'No matching public problems. Try fewer words or clear the filters.'}</p>
      <ProblemList problems={current.rows} />
      {!current.rows.length && <Link to="/post-problem">Post a problem</Link>}
      <nav aria-label="Search pages" className="community-actions">
        {page > 1 && <Link to={`?${new URLSearchParams({ ...Object.fromEntries(params), page: String(page-1) })}`}>Previous page</Link>}
        {current.hasMore && page < 501 && <Link to={`?${new URLSearchParams({ ...Object.fromEntries(params), page: String(page+1) })}`}>Next page</Link>}
      </nav>
    </>}
    </>}
  </CommunityLayout>;
}
