import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { notificationApi, notificationLink } from '../../../lib/community-notifications';
import { communityError } from '../../../lib/supabase-community';
import { CommunityLayout, ErrorNotice } from './shared';

export function FollowDiscussion({ id }: { id: string }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Link to={`/auth?returnTo=${encodeURIComponent(`/problem/${id}`)}`}>Sign in for reply notifications</Link>;
  return <FollowControl key={`${user.id}:${id}`} id={id} userId={user.id} />;
}
function FollowControl({ id, userId }: { id: string; userId: string }) {
  const [followed, setFollowed] = useState(false), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const alive = useRef(true), lock = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { let active = true; setLoading(true); setError(''); notificationApi.follows(userId,id).then(value => { if(active) setFollowed(value); }).catch(e => { if(active) setError(communityError(e)); }).finally(() => { if(active) setLoading(false); }); return () => { active = false; }; }, [id,userId,retry]);
  async function toggle() {
    if(lock.current || loading) return; lock.current = true; setBusy(true); setError('');
    try { await notificationApi.follow(userId,id,!followed); const value = await notificationApi.follows(userId,id); if(alive.current) setFollowed(value); }
    catch(e) { if(alive.current) setError(communityError(e)); }
    finally { lock.current = false; if(alive.current) setBusy(false); }
  }
  return <div><button aria-pressed={followed} disabled={loading || busy || !!error} onClick={() => void toggle()}>{loading ? 'Loading reply preferences…' : followed ? 'Following replies · unfollow' : 'Follow replies'}</button>{error && <ErrorNotice error={error} retry={() => setRetry(n => n+1)} />}</div>;
}
export function NotificationsPage() {
  const { user, isLoading } = useAuth();
  return <CommunityLayout title="Reply notifications"><h1>Reply notifications</h1>{isLoading ? <p role="status">Loading account…</p> : !user ? <Link to="/auth?returnTo=%2Fnotifications">Sign in to view notifications</Link> : <Inbox key={user.id} userId={user.id} />}</CommunityLayout>;
}
function Inbox({ userId }: { userId: string }) {
  const [page, setPage] = useState(1), [followPage, setFollowPage] = useState(1), [revision, setRevision] = useState(0);
  const [data, setData] = useState<{ inbox: Awaited<ReturnType<typeof notificationApi.inbox>>; follows: Awaited<ReturnType<typeof notificationApi.following>> } | null>(null);
  const [error,setError] = useState(''), [busy,setBusy] = useState(false); const alive = useRef(true), lock = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { let active = true; setData(null); setError(''); Promise.all([notificationApi.inbox(userId,page),notificationApi.following(userId,followPage)]).then(([inbox,follows]) => { if(active) setData({inbox,follows}); }).catch(e => { if(active) setError(communityError(e)); }); return () => { active = false; }; }, [userId,page,followPage,revision]);
  async function change(action: () => Promise<void>) {
    if(lock.current) return; lock.current = true; setBusy(true); setError('');
    try { await action(); if(alive.current) setRevision(n => n+1); } catch(e) { if(alive.current) setError(communityError(e)); }
    finally { lock.current = false; if(alive.current) setBusy(false); }
  }
  return <><p>Follow a problem to receive private in-app updates for new solutions and replies from other people. Delivery may take a moment. Unfollowing stops pending updates and removes that discussion from this inbox.</p>
    <button disabled={busy} onClick={() => setRevision(n => n+1)}>Refresh notifications</button>
    {error && <ErrorNotice error={error} retry={() => setRevision(n => n+1)} />}
    {!data ? !error && <p role="status">Loading notifications…</p> : <>
      <section aria-label="Your notifications" className="community-stack"><h2>Your inbox</h2>{!data.inbox.rows.length && <p>No visible reply notifications on this page.</p>}
        {data.inbox.rows.map(n => <article className="board-panel community-card" key={n.id}><p><strong>{n.is_read ? 'Read' : 'Unread'}</strong> · {new Date(n.created_at).toLocaleString()}</p><p>{n.message}</p><div className="community-actions">{notificationLink(n.link) && <Link to={notificationLink(n.link)!}>View reply</Link>}<button disabled={busy} onClick={() => void change(() => notificationApi.read(userId,n.id,!n.is_read))}>{n.is_read ? 'Mark unread' : 'Mark read'}</button></div></article>)}
        <nav aria-label="Notification pages" className="community-actions"><button disabled={page===1 || busy} onClick={() => setPage(p=>p-1)}>Previous notifications</button><span>Page {page}</span><button disabled={!data.inbox.hasMore || busy || page>=501} onClick={() => setPage(p=>p+1)}>Next notifications</button></nav>
      </section>
      <section aria-label="Followed discussions" className="community-stack"><h2>Followed discussions</h2>{!data.follows.rows.length && <p>No followed discussions on this page. Open a public problem and choose Follow replies.</p>}
        {data.follows.rows.map(f => <article key={f.problem_id} className="board-panel community-card">{f.problem?.visibility==='public' && !f.problem.is_hidden ? <Link to={`/problem/${f.problem_id}`}>{f.problem.title}</Link> : <p>Unavailable discussion</p>}<div><button disabled={busy} onClick={() => void change(() => notificationApi.follow(userId,f.problem_id,false))}>Unfollow discussion</button></div></article>)}
        <nav aria-label="Followed discussion pages" className="community-actions"><button disabled={followPage===1 || busy} onClick={() => setFollowPage(p=>p-1)}>Previous discussions</button><span>Page {followPage}</span><button disabled={!data.follows.hasMore || busy || followPage>=501} onClick={() => setFollowPage(p=>p+1)}>Next discussions</button></nav>
      </section>
    </>}
  </>;
}
