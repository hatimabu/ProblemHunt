import {useEffect,useRef,useState} from 'react';
import {accountPrivacyApi,downloadAccountExport,type DeletionRequest} from '../../../lib/account-privacy';
import {communityError} from '../../../lib/supabase-community';
import {ErrorNotice} from './shared';

export function AccountPrivacyControls({userId}:{userId:string}){
  const [request,setRequest]=useState<DeletionRequest|null>(null),[loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[retry,setRetry]=useState(0);
  const alive=useRef(true),lock=useRef(false);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useEffect(()=>{let active=true;setLoading(true);setError('');accountPrivacyApi.request(userId).then(value=>{if(active)setRequest(value);}).catch(e=>{if(active)setError(communityError(e));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[userId,retry]);
  async function run(action:()=>Promise<void>){
    if(lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');
    try{await action();}catch(e){if(alive.current)setError(communityError(e));}
    finally{lock.current=false;if(alive.current)setBusy(false);}
  }
  async function change(requested:boolean){
    const value=await accountPrivacyApi.setRequested(requested);
    if(alive.current){setRequest(value);setConfirm(false);setMessage(requested?'Deletion request sent for review. Your account and content have not been deleted.':'Deletion request cancelled.');}
  }
  return <section className="board-panel community-card community-stack" aria-label="Account data and deletion"><h2>Your data and account</h2>
    <p>Download your community content, profile, saved cases, follows and account records as JSON. Avatar image files and provider logs are not included; contact support if you need them.</p>
    <button disabled={busy} onClick={()=>void run(async()=>{const data=await accountPrivacyApi.exportAccount(userId);if(alive.current){downloadAccountExport(data);setMessage('Your data download is ready. Keep the file private.');}})}>Download my data</button>
    <h3>Request account deletion</h3><p>This sends a private request for review. It does not immediately delete your account or other people’s replies. You can cancel while the request is being reviewed.</p>
    {loading?<p role="status">Loading account request…</p>:request&&request.status!=='cancelled'?<><p>Request status: <strong>{request.status==='reviewing'?'Under review':'Requested'}</strong></p><button disabled={busy} onClick={()=>void run(()=>change(false))}>Cancel deletion request</button></>:<><label><input type="checkbox" checked={confirm} disabled={busy} onChange={event=>setConfirm(event.target.checked)}/> I want to request deletion of my account.</label><button disabled={!confirm||busy||!!error} onClick={()=>void run(()=>change(true))}>Send deletion request</button></>}
    {message&&<p role="status">{message}</p>}{error&&<ErrorNotice error={error} retry={()=>setRetry(value=>value+1)}/>}
  </section>;
}

export function DeletionRequestQueue(){
  const [data,setData]=useState<Awaited<ReturnType<typeof accountPrivacyApi.queue>>|null>(null),[page,setPage]=useState(1),[retry,setRetry]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{let active=true;setData(null);setError('');accountPrivacyApi.queue(page).then(value=>{if(active)setData(value);}).catch(e=>{if(active)setError(communityError(e));});return()=>{active=false;};},[page,retry]);
  async function review(id:string){setBusy(true);setError('');try{await accountPrivacyApi.review(id);setRetry(value=>value+1);}catch(e){setError(communityError(e));}finally{setBusy(false);}}
  return <section className="community-stack"><h2>Account deletion requests</h2><p>Private review queue. Starting review does not erase data. Follow the approved account-removal procedure and recheck that the request has not been cancelled before taking action.</p>
    {error&&<ErrorNotice error={error} retry={()=>setRetry(value=>value+1)}/>}{!data?!error&&<p role="status">Loading deletion requests…</p>:<>{!data.rows.length?<p>No active deletion requests on this page.</p>:data.rows.map(row=><article key={row.user_id} className="board-panel community-card"><p>Account: <code>{row.user_id}</code></p><p>{row.status==='reviewing'?'Under review':'Requested'} · {new Date(row.requested_at).toLocaleString()}</p>{row.status==='requested'&&<button disabled={busy} onClick={()=>void review(row.user_id)}>Start review</button>}</article>)}<nav aria-label="Deletion request pages"><button disabled={page===1||busy} onClick={()=>setPage(value=>value-1)}>Previous requests</button><span> Page {page} </span><button disabled={!data.hasMore||busy||page>=501} onClick={()=>setPage(value=>value+1)}>Next requests</button></nav></>}
  </section>;
}
