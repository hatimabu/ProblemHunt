import { useEffect } from 'react';
import { recordPilotVisit } from '../../../lib/pilot-privacy';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Navbar } from '../navbar';
import type { CommunityProblem } from '../../../lib/community';
import './community.css';

export function CommunityLayout({ children }: { children: ReactNode }) {
  useEffect(() => { recordPilotVisit(); }, []);
  return <div className="board-app"><a className="community-skip" href="#main-content">Skip to content</a><Navbar /><main id="main-content" className="board-container community-page">{children}<footer className="community-stack"><Link to="/privacy">Privacy and pilot feedback</Link></footer></main></div>;
}
export function ErrorNotice({ error, retry }: { error: string; retry?: () => void }) {
  return <div role="alert" className="community-notice"><p>{error}</p>{retry && <button type="button" onClick={retry}>Try again</button>}</div>;
}
export function StateLabel({ problem }: { problem: CommunityProblem }) {
  return <span className={`board-pill community-state-${problem.state}`}>{problem.visibility === 'draft' ? 'Private draft' : problem.state[0].toUpperCase() + problem.state.slice(1)}</span>;
}
export function ProblemList({ problems }: { problems: CommunityProblem[] }) {
  return <div className="community-stack">{problems.map(p => <article key={p.id} className="board-panel community-card">
    {p.is_example && <p className="community-notice">Fictional example — outcomes are simulated.</p>}<StateLabel problem={p} /><h2><Link to={`/problem/${p.id}`}>{p.title}</Link></h2>
    <p className="community-preview">{p.symptom || 'Draft in progress'}</p>
    <p className="community-muted">{p.product} {p.product_version}</p>
    {p.state === 'solved' && <p><strong>{p.is_example ? 'Illustrative outcome:' : 'Author-confirmed fix:'}</strong> {p.resolution_observation}</p>}
    <div className="community-actions">{p.tags.map(tag => <Link key={tag} to={`/browse?tag=${encodeURIComponent(tag)}`}>#{tag}</Link>)}</div>
  </article>)}</div>;
}
export function TextField({ label, value, onChange, required = false, multiline = true, maxLength = 10000 }: {
  label: string; value: string; onChange: (s: string) => void; required?: boolean; multiline?: boolean; maxLength?: number;
}) {
  return <label className="community-field"><span>{label}{required ? ' *' : ''}</span>{multiline
    ? <textarea value={value} onChange={e => onChange(e.target.value)} required={required} maxLength={maxLength} rows={3} />
    : <input value={value} onChange={e => onChange(e.target.value)} required={required} maxLength={maxLength} />}</label>;
}
export const lines = (value: string) => value.split('\n').map(s => s.trim()).filter(Boolean);
export const contributorLabel = (authorId: string, problemAuthorId: string, userId?: string) =>
  authorId === userId ? 'You' : authorId === problemAuthorId ? 'Problem author' : `Contributor ${authorId.slice(0, 8)}`;
