import { Fragment, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { communityApi, communityError } from '../../../lib/supabase-community';
import type { CommunityProblem } from '../../../lib/community';
import { CommunityLayout, ErrorNotice, TextField } from './shared';

export function VoteControl({ problemId, solutionId, own, signedIn, closed }: {problemId:string;solutionId:string;own:boolean;signedIn:boolean;closed:boolean}) {
  const [info,setInfo]=useState<{count:number;voted:boolean}|null>(null), [error,setError]=useState(''), [busy,setBusy]=useState(false), [retry,setRetry]=useState(0);
  useEffect(()=>{let active=true;setInfo(null);(async()=>{try{const v=await communityApi.voteInfo(problemId,solutionId,signedIn);if(active)setInfo(v);}catch(e){if(active)setError(communityError(e));}})();return()=>{active=false;};},[problemId,solutionId,signedIn,retry]);
  async function toggle(){if(!info)return;setBusy(true);setError('');try{await communityApi.vote(solutionId,info.voted);setInfo(await communityApi.voteInfo(problemId,solutionId,signedIn));}catch(e){setError(communityError(e));}finally{setBusy(false);}}
  return <div className="community-actions"><p>{info ? info.count ? `${info.count} community upvote${info.count===1?'':'s'}` : 'No community upvotes yet' : 'Loading upvotes…'}</p>
    {signedIn && !own && info && (!closed || info.voted) && <button disabled={busy} aria-pressed={info.voted} onClick={()=>void toggle()}>{info.voted?'Remove upvote':'Upvote solution'}</button>}
    {own && <p>You cannot upvote your own solution.</p>}{!signedIn && <Link to={`/auth?returnTo=${encodeURIComponent(`/problem/${problemId}`)}`}>Sign in to upvote</Link>}
    {error && <ErrorNotice error={error} retry={()=>{setError('');setRetry(n=>n+1);}}/>}</div>;
}
export function ReverseAcceptance({problem,onReversed}:{problem:CommunityProblem;onReversed:(p:CommunityProblem)=>void}){
 const [reason,setReason]=useState(''),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);try{onReversed(await communityApi.reverse(problem.id,reason.trim()));}catch(e){setError(communityError(e));}finally{setBusy(false);}}
 return <div>{!show?<button onClick={()=>setShow(true)}>Reopen for testing</button>:<form onSubmit={submit}><p>This withdraws acceptance and its reputation award. Previous evidence remains in the history.</p><fieldset disabled={busy}><TextField label="Why did the fix stop working?" value={reason} onChange={setReason} required maxLength={1000}/><button type="submit">Confirm acceptance reversal</button><button type="button" onClick={()=>setShow(false)}>Cancel</button></fieldset></form>}{error&&<ErrorNotice error={error}/>}</div>;
}
export function AcceptanceHistory({id,version}:{id:string;version:string}){
 const [rows,setRows]=useState<Awaited<ReturnType<typeof communityApi.history>>>([]),[error,setError]=useState('');
 useEffect(()=>{let active=true;(async()=>{try{const r=await communityApi.history(id);if(active)setRows(r);}catch(e){if(active)setError(communityError(e));}})();return()=>{active=false;};},[id,version]);
 return <section aria-label="Acceptance history">{rows.length>0&&<><h2>Acceptance history</h2>{rows.map(r=><details key={r.id}><summary>{r.action==='accepted'?'Author accepted':'Acceptance withdrawn'} · {new Date(r.created_at).toLocaleDateString()}</summary><p>{r.reason}</p><p>Previous observation: {r.observation}</p><p>Verification: {r.verification}</p></details>)}</>}{error&&<p>Acceptance history is unavailable. Refresh to retry.</p>}</section>;
}
export function ReputationPage({embedded=false}:{embedded?:boolean}){ const Frame=embedded?Fragment:CommunityLayout;const Title=embedded?"h2":"h1";
 const {user}=useAuth();const [data,setData]=useState<{rows:Awaited<ReturnType<typeof communityApi.reputation>>;categories:Record<string,string>;ledger:Awaited<ReturnType<typeof communityApi.ledger>>}|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setData(null);setError('');(async()=>{try{const [rows,t,ledger]=await Promise.all([communityApi.reputation(),communityApi.taxonomy(),user?communityApi.ledger():Promise.resolve([])]);if(active)setData({rows,categories:Object.fromEntries(t.categories.map(c=>[c.id,c.name])),ledger});}catch(e){if(active)setError(communityError(e));}})();return()=>{active=false;};},[user?.id,retry]);
 return <Frame><Title>Category reputation</Title><p>+2 for an upvote and +10 for author acceptance. Removing a vote or acceptance reverses its award. Examples earn no points. Reputation reflects community activity, not professional certification.</p>
 {error?<ErrorNotice error={error} retry={()=>setRetry(n=>n+1)}/>:!data?<p role="status">Loading reputation…</p>:<><h2>Public contributions</h2>{!data.rows.length?<p>No reputation awards yet.</p>:<ul>{data.rows.map(r=><li key={`${r.user_id}:${r.category_id}`}>Contributor {r.user_id.slice(0,8)} · {data.categories[r.category_id]}: {r.points} points</li>)}</ul>}{user&&<><h2>Your event history</h2><p>Latest 100 events, including compensating reversals. Public totals include only currently public cases.</p>{!data.ledger.length?<p>No events yet.</p>:<ul>{data.ledger.map(e=><li key={e.id}>{data.categories[e.category_id]} · {e.reason.replaceAll('_',' ')}: {e.points>0?'+':''}{e.points}</li>)}</ul>}</>}</>}
 </Frame>;
}
