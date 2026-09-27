import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { UserRound } from 'lucide-react';
import { Link } from 'react-router';
import { communityApi } from '../../../lib/supabase-community';

const Names = createContext<Record<string, string>>({});

export function DiscussionPeople({ ids, children }: { ids: string[]; children: ReactNode }) {
  const key = JSON.stringify([...new Set(ids)].sort());
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    setNames({});
    (async () => {
      const rows = await communityApi.publicNames(JSON.parse(key));
      if (active) setNames(Object.fromEntries(rows.map(row => [row.user_id, row.display_name.trim()])));
    })().catch(() => { /* Identity lookup must not hide an otherwise readable discussion. */ });
    return () => { active = false; };
  }, [key]);
  return <Names.Provider value={names}>{children}</Names.Provider>;
}

export function DiscussionPerson({ id, authorId, viewerId }: { id: string; authorId: string; viewerId?: string }) {
  const names = useContext(Names);
  const name = names[id] || `Member ${id.slice(0, 8)}`;
  return <Link className="discussion-person" to={`/people/${id}`}>
    <UserRound size={16} aria-hidden="true" />
    <strong>{name}</strong>{' '}<span className="discussion-person-role">{id === authorId ? 'Author' : 'Contributor'}</span>
    {id === viewerId && <>{' '}<span className="discussion-person-you">(you)</span></>}
  </Link>;
}
