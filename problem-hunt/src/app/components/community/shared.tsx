import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Navbar } from '../navbar';
import type { CommunityProblem } from '../../../lib/community';
import './community.css';

export function CommunityLayout({ children }: { children: ReactNode }) {
  return <div className="board-app"><Navbar /><main className="board-container community-page">{children}</main></div>;
}
export function ErrorNotice({ error, retry }: { error: string; retry?: () => void }) {
  return <div role="alert" className="community-notice"><p>{error}</p>{retry && <button type="button" onClick={retry}>Try again</button>}</div>;
}
export function StateLabel({ problem }: { problem: CommunityProblem }) {
  return <span className={`board-pill community-state-${problem.state}`}>{problem.visibility === 'draft' ? 'Private draft' : problem.state[0].toUpperCase() + problem.state.slice(1)}</span>;
}
export function ProblemList({ problems }: { problems: CommunityProblem[] }) {
  return <div className="community-stack">{problems.map(p => <article key={p.id} className="board-panel community-card">
    <StateLabel problem={p} /><h2><Link to={`/problem/${p.id}`}>{p.title}</Link></h2>
    <p className="community-preview">{p.symptom || 'Draft in progress'}</p>
    <p className="community-muted">{p.product} {p.product_version}</p>
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
