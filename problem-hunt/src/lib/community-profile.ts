import { supabase } from '../../lib/supabaseClient';
import { communityError } from './supabase-community';

export interface CommunityProfile { user_id:string; display_name:string; username?:string; bio:string; expertise:string[]; is_public:boolean; avatar_path:string|null }
export interface Contribution { id:string; problem_id:string; title:string; summary:string; state:string; visibility:string; accepted:boolean; is_example:boolean; created_at:string }
export type ContributionKind = 'problems'|'solutions'|'accepted';
export const blankProfile = (id:string):CommunityProfile => ({user_id:id,display_name:'',username:'',bio:'',expertise:[],is_public:false,avatar_path:null});
function result<T>(r:{data:T;error:unknown}):T { if(r.error)throw new Error(communityError(r.error));return r.data; }
export const profileApi = {
 async get(id:string):Promise<CommunityProfile|null> { return result(await supabase.from('community_profiles').select('user_id,display_name,username,bio,expertise,is_public,avatar_path').eq('user_id',id).maybeSingle()); },
 async save(p:CommunityProfile) {
  const fields={display_name:p.display_name.trim(),username:(p.username||'').trim().toLowerCase(),bio:p.bio.trim(),expertise:p.expertise,is_public:p.is_public,avatar_path:p.avatar_path};
  const existing=await this.get(p.user_id);
  const query=existing?supabase.from('community_profiles').update(fields).eq('user_id',p.user_id):supabase.from('community_profiles').insert({user_id:p.user_id,...fields});
  const saved=await query.select().single();if(saved.error?.code==='23505')throw new Error('That username is already in use.');return result(saved) as CommunityProfile;
 },
 async contributions(id:string,kind:ContributionKind,state='',offset=0,publicOnly=true):Promise<Contribution[]> {
  return result(await supabase.rpc('community_contributions',{p_user_id:id,p_kind:kind,p_state:state,p_offset:offset,p_public:publicOnly}));
 },
 async activeCount(id:string):Promise<number> {const r=await supabase.from('community_problems').select('id',{count:'exact',head:true}).eq('author_id',id).eq('visibility','public').eq('is_hidden',false).in('state',['open','testing']);if(r.error)throw new Error(communityError(r.error));return r.count||0;},
 async counts(id:string,publicOnly=true):Promise<{problems:number;solutions:number;accepted:number}> {
  return result(await supabase.rpc('community_contribution_counts',{p_user_id:id,p_public:publicOnly}))[0];
 },
 async avatar(path:string):Promise<string> { const r=await supabase.storage.from('community-avatars').createSignedUrl(path,60);if(r.error)throw new Error(communityError(r.error));return r.data!.signedUrl; },
 async replaceAvatar(p:CommunityProfile,file:File):Promise<CommunityProfile> {
  const blob=await prepareAvatar(file),path=`${p.user_id}/${crypto.randomUUID()}.webp`;
  result(await supabase.storage.from('community-avatars').upload(path,blob,{contentType:'image/webp',upsert:false,cacheControl:'0'}));
  let saved:CommunityProfile;
  try { saved=await this.save({...p,avatar_path:path}); }
  catch(e) { await supabase.storage.from('community-avatars').remove([path]);throw e; }
  if(p.avatar_path) await supabase.storage.from('community-avatars').remove([p.avatar_path]);
  return saved;
 },
 async removeAvatar(p:CommunityProfile):Promise<CommunityProfile> {
  const saved=await this.save({...p,avatar_path:null});
  if(p.avatar_path) result(await supabase.storage.from('community-avatars').remove([p.avatar_path]));
  return saved;
 }
};
export function validateAvatar(file:Pick<File,'type'|'size'>) {
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Choose a PNG, JPEG or WebP image. SVG and animated formats are not supported.');
 if(file.size===0||file.size>5*1024*1024)throw new Error('Choose a non-empty image of 5 MB or smaller.');
}
export async function prepareAvatar(file:File):Promise<Blob> {
 validateAvatar(file);
 let bitmap:ImageBitmap;
 try { bitmap=await createImageBitmap(file); } catch { throw new Error('This file could not be decoded as an image.'); }
 try {
  if(bitmap.width>4096||bitmap.height>4096)throw new Error('Image dimensions must be 4096 pixels or smaller.');
  const scale=Math.min(1,512/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image processing is unavailable in this browser.');
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  // Re-encoding drops original metadata; only a still WebP is uploaded.
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',.85));
  if(!blob||blob.type!=='image/webp'||blob.size>2*1024*1024)throw new Error('Could not create a WebP picture under 2 MB.');
  return blob;
 } finally {bitmap.close();}
}
