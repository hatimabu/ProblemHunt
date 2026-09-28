import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { Bookmark, Check, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { communityApi, communityError } from '../../../lib/supabase-community';

type Library = {
  userId?: string; loading: boolean; error: string; busy: boolean; tags: string[]; saved: string[]; version: number;
  retry: () => void; follow: (tag: string, next: boolean) => Promise<boolean>; save: (id: string, next: boolean) => Promise<boolean>;
};
const Context = createContext<Library | null>(null);
export const usePersonalLibrary = () => useContext(Context);

export function PersonalLibraryProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  // Remount on identity changes; no previous user's private state can render for the next account.
  return <LibrarySession key={user?.id || 'anon'} userId={user?.id} authLoading={isLoading}>{children}</LibrarySession>;
}
function LibrarySession({ children, userId, authLoading }: { children: ReactNode; userId?: string; authLoading: boolean }) {
  const [data, setData] = useState<{ tags: string[]; saved: string[] }>({ tags: [], saved: [] });
  const [loading, setLoading] = useState(!!userId), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0), [retry, setRetry] = useState(0);
  const alive = useRef(true), locked = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!userId || authLoading) return;
    let active = true; setLoading(true); setError('');
    (async () => {
      try { const result = await communityApi.preferences(userId); if (active) setData(result); }
      catch (e) { if (active) setError(communityError(e)); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [userId, authLoading, retry]);
  async function mutate(action: () => Promise<void>) {
    if (!userId || loading || locked.current) return false;
    locked.current = true; setBusy(true); setError('');
    try {
      await action(); const result = await communityApi.preferences(userId);
      if (alive.current) { setData(result); setVersion(n => n + 1); }
      return true;
    } catch (e) { if (alive.current) setError(communityError(e)); return false; }
    finally { if (alive.current) setBusy(false); locked.current = false; }
  }
  return <Context.Provider value={{ userId, loading: authLoading || loading, error, busy, ...data, version,
    retry: () => { setRetry(n => n + 1); setVersion(n => n + 1); },
    follow: (tag, next) => mutate(() => communityApi.followTag(userId!, tag, next)),
    save: (id, next) => mutate(() => communityApi.saveCase(userId!, id, next)),
  }}>{children}</Context.Provider>;
}
function SignInLink({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <Link to={`/auth?returnTo=${encodeURIComponent(location.pathname + location.search)}`}>{children}</Link>;
}
export function LibraryNotice() {
  const library = usePersonalLibrary();
  return library?.error ? <div className="community-notice" role="alert"><p>Your private library couldn’t be updated: {library.error}</p><button onClick={library.retry} disabled={library.busy}>Retry private library</button></div> : null;
}
export function SaveCaseButton({ id }: { id: string }) {
  const library = usePersonalLibrary(); if (!library) return null;
  if (!library.userId) return <SignInLink>Sign in to save</SignInLink>;
  const saved = library.saved.includes(id);
  return <button className="library-save" type="button" aria-pressed={saved} disabled={library.loading || library.busy || !!library.error}
    onClick={() => void library.save(id, !saved)}><Bookmark size={15} aria-hidden="true" />{library.loading ? 'Loading save…' : saved ? 'Saved · remove' : 'Save case'}</button>;
}
export function FollowTagButton({ tag }: { tag: string }) {
  const library = usePersonalLibrary(); if (!library) return null;
  if (!library.userId) return <SignInLink>Sign in to follow #{tag}</SignInLink>;
  const followed = library.tags.includes(tag.trim().toLowerCase());
  return <button type="button" className="library-follow" aria-pressed={followed} disabled={library.loading || library.busy || !!library.error}
    onClick={() => void library.follow(tag, !followed)}>{followed ? <Check size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}{followed ? `Unfollow #${tag}` : `Follow #${tag}`}</button>;
}
export function FollowedTags() {
  const library = usePersonalLibrary(), [input, setInput] = useState('');
  if (!library?.userId) return null;
  async function submit(e: FormEvent) { e.preventDefault(); if (await library!.follow(input, true)) setInput(''); }
  return <section className="library-tags" aria-label="Your followed tags"><h2>Follow your interests</h2><p>Tags and saved cases are private to your account.</p>
    <form onSubmit={submit} className="library-tag-form"><label htmlFor="follow-tag">Tag to follow</label><div><input id="follow-tag" value={input} onChange={e => setInput(e.target.value)} placeholder="e.g. docker" required maxLength={80} /><button type="submit" disabled={library.loading || library.busy || !!library.error || !input.trim()}>Follow tag</button></div></form>
    {library.loading ? <p role="status">Loading followed tags…</p> : <div className="library-tag-list">{library.tags.map(tag => <FollowTagButton key={tag} tag={tag} />)}</div>}
  </section>;
}
export function PersonalSignIn() { return <section className="hub-empty"><h2>Your own corner of the community.</h2><p>Sign in to follow tags and keep cases for later. Your selections stay private.</p><SignInLink>Sign in to continue</SignInLink></section>; }
