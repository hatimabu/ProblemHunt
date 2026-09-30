import { createClient } from '@supabase/supabase-js';
import { expect, it, vi } from 'vitest';
import { createNotificationApi, notificationLink } from '../community-notifications';
it('scopes inbox, following and read writes to the user and community events',async()=>{
 const fetcher=vi.fn(async(_input:RequestInfo|URL,_init?:RequestInit)=>new Response('[]',{status:200,headers:{'Content-Type':'application/json'}}));
 const api=createNotificationApi(createClient('https://example.supabase.co','test-key',{global:{fetch:fetcher},auth:{persistSession:false,autoRefreshToken:false}}));
 await api.inbox('alice',2);let url=new URL(String(fetcher.mock.calls.at(-1)![0]));expect(url.searchParams.get('user_id')).toBe('eq.alice');expect(url.searchParams.get('community_event_id')).toBe('not.is.null');expect(url.searchParams.get('offset')).toBe('20');expect(url.searchParams.get('limit')).toBe('21');
 await api.follow('alice','p1',true);expect(JSON.parse(String(fetcher.mock.calls.at(-1)![1]!.body))).toEqual({user_id:'alice',problem_id:'p1'});
 await api.follow('alice','p1',false);url=new URL(String(fetcher.mock.calls.at(-1)![0]));expect(url.searchParams.get('user_id')).toBe('eq.alice');expect(url.searchParams.get('problem_id')).toBe('eq.p1');
 fetcher.mockResolvedValueOnce(new Response(JSON.stringify({id:'n1'}),{status:200,headers:{'Content-Type':'application/json'}}));
 await api.read('alice','n1',true);url=new URL(String(fetcher.mock.calls.at(-1)![0]));expect(url.searchParams.get('user_id')).toBe('eq.alice');expect(url.searchParams.get('community_event_id')).toBe('not.is.null');expect(JSON.parse(String(fetcher.mock.calls.at(-1)![1]!.body))).toEqual({is_read:true});
});
it('rejects unsafe links',()=>{for(const link of ['//example.org','javascript:alert(1)','/problem/id#solution-x','https://example.org'])expect(notificationLink(link)).toBeNull();});
