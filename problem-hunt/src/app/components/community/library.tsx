import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { communityApi, communityError } from '../../../lib/supabase-community';
import type { CommunityProblem } from '../../../lib/community';
import { CommunityLayout, ErrorNotice, ProblemList } from './shared';

export function CommunityLibrary({ mine = false, home = false }: { mine?: boolean; home?: boolean }) {
  const { user, isLoading } = useAuth();
  const [snapshot, setSnapshot] = useState<{ key: string; rows: CommunityProblem[] } | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const key = `${mine}:${user?.id || 'anon'}`;
  useEffect(() => {
    if (isLoading || (mine && !user)) return;
    let active = true;
    setSnapshot(null); setError('');
    communityApi.list(mine ? user!.id : undefined).then(rows => {
      if (active) setSnapshot({ key, rows });
    }).catch(e => { if (active) setError(communityError(e)); });
    return () => { active = false; };
  }, [key, isLoading, retry]);
  const rows = snapshot?.key === key ? snapshot.rows : null;
  return <CommunityLayout>
    <p className="board-kicker">Cloud / DevOps · Professional AV</p>
    <h1>{home ? 'Real problems. Tested solutions.' : mine ? 'Your problems and drafts' : 'Community problems'}</h1>
    <p>{mine ? 'Private drafts are visible only to you. Publish when you are ready for others to help.' : 'Share the symptoms. Compare explanations. Test a solution and record the fix that worked.'}</p>
    <div className="community-actions"><Link className="community-action" to="/post-problem">Post a problem</Link>
      {!mine && <><Link to="/domains/cloud-devops">Cloud / DevOps</Link><Link to="/domains/professional-av">Professional AV</Link><Link to="/browse">Search the library</Link></>}
      {mine && <Link to="/moderation">Moderator review</Link>}{mine ? <Link to="/browse">Browse published problems</Link> : user && <Link to="/dashboard">Your drafts and problems</Link>}</div>
    {error ? <ErrorNotice error={error} retry={() => setRetry(n => n + 1)} /> : rows === null
      ? <p role="status">Loading problems…</p>
      : rows.length ? <><ProblemList problems={rows} /><p className="community-muted">Showing up to 100 recent problems.</p></>
        : <p>{mine ? 'No problems yet. Start with a private draft.' : 'No published problems yet. Start the first discussion.'}</p>}
  </CommunityLayout>;
}
export const CommunityHome = () => <CommunityLibrary home />;
export const CommunityDashboard = () => <CommunityLibrary mine />;
