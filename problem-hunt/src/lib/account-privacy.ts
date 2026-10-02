import {supabase} from '../../lib/supabaseClient';
import {communityError} from './supabase-community';
export interface DeletionRequest {user_id:string;status:'requested'|'reviewing'|'cancelled';requested_at:string;updated_at:string}
export interface AccountExport {format_version:number;account:{id:string;email:string};[key:string]:unknown}
function checked<T>(result:{data:T;error:unknown}):T {
  if(result.error)throw new Error(communityError(result.error));
  return result.data;
}
export const accountPrivacyApi={
  async exportAccount(userId:string):Promise<AccountExport>{
    const data=checked(await supabase.rpc('community_export_account')) as AccountExport;
    if(data?.account?.id!==userId)throw new Error('Your account changed. Refresh before downloading your data.');
    return data;
  },
  async request(userId:string):Promise<DeletionRequest|null>{
    return checked(await supabase.from('community_deletion_requests').select('user_id,status,requested_at,updated_at').eq('user_id',userId).maybeSingle());
  },
  async setRequested(requested:boolean):Promise<DeletionRequest|null>{
    return checked(await supabase.rpc('community_set_deletion_request',{p_requested:requested}));
  },
  async review(userId:string):Promise<DeletionRequest>{
    return checked(await supabase.rpc('community_review_deletion_request',{p_user_id:userId}));
  },
  async queue(page:number):Promise<{rows:DeletionRequest[];hasMore:boolean}>{
    const offset=(Math.max(1,Math.min(501,Math.floor(page)))-1)*20;
    const rows=checked(await supabase.from('community_deletion_requests').select('user_id,status,requested_at,updated_at').in('status',['requested','reviewing']).order('requested_at').order('user_id').range(offset,offset+20)) as DeletionRequest[];
    return {rows:rows.slice(0,20),hasMore:rows.length>20};
  },
};
export function downloadAccountExport(data:AccountExport){
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='problemhunt-account-data.json';
  document.body.appendChild(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
