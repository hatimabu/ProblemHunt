import { supabase } from '../../lib/supabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';
import { communityError } from './supabase-community';
export interface ReplyNotification { id: string; message: string; link: string; is_read: boolean; created_at: string }
export interface DiscussionFollow { problem_id: string; problem: { title: string; visibility: string; is_hidden: boolean } | null }
function fail(error: unknown) { if (error) throw new Error(communityError(error)); }
const range = (page: number) => (Math.min(501, Math.max(1, Math.floor(page) || 1)) - 1) * 20;
export function notificationLink(link: string) { return /^\/problem\/[a-f0-9-]{36}#solution-[a-f0-9-]{36}$/i.test(link) ? link : null; }
export function createNotificationApi(client: SupabaseClient) {
  return {
    async follows(userId: string, problemId: string) {
      const r = await client.from('community_discussion_follows').select('problem_id').eq('user_id', userId).eq('problem_id', problemId).maybeSingle(); fail(r.error); return !!r.data;
    },
    async follow(userId: string, problemId: string, enabled: boolean) {
      const table = client.from('community_discussion_follows');
      const r = enabled ? await table.upsert({ user_id: userId, problem_id: problemId }, { onConflict: 'user_id,problem_id', ignoreDuplicates: true }) : await table.delete().eq('user_id', userId).eq('problem_id', problemId);
      fail(r.error);
    },
    async following(userId: string, page = 1) {
      const start = range(page);
      const r = await client.from('community_discussion_follows').select('problem_id,problem:community_problems(title,visibility,is_hidden)').eq('user_id', userId).order('created_at', { ascending: false }).order('problem_id').range(start, start + 20);
      fail(r.error); const rows = (r.data || []) as unknown as DiscussionFollow[]; return { rows: rows.slice(0,20), hasMore: rows.length > 20 };
    },
    async inbox(userId: string, page = 1) {
      const start = range(page);
      const r = await client.from('notifications').select('id,message,link,is_read,created_at').eq('user_id', userId).not('community_event_id', 'is', null).order('created_at', { ascending: false }).order('id', { ascending: false }).range(start, start + 20);
      fail(r.error); const rows = (r.data || []) as ReplyNotification[]; return { rows: rows.slice(0,20), hasMore: rows.length > 20 };
    },
    async read(userId: string, id: string, read: boolean) {
      const r = await client.from('notifications').update({ is_read: read }).eq('user_id', userId).eq('id', id).not('community_event_id', 'is', null).select('id').maybeSingle();
      fail(r.error); if (!r.data) throw new Error('This notification is no longer available. Refresh your inbox.');
    },
  };
}
export const notificationApi = createNotificationApi(supabase);
