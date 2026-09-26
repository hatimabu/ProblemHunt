import { ReportControl } from './moderation';
import { VoteControl, ReverseAcceptance, AcceptanceHistory } from './reputation';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { communityApi, communityError, safeSourceUrl } from '../../../lib/supabase-community';
import type { CommunityProblem, CommunitySolution, CommunityComment } from '../../../lib/community';
import { CommunityLayout, ErrorNotice, StateLabel, TextField, lines, contributorLabel } from './shared';

export function CommunityDiscussion() {
  const { id = '' } = useParams();
  const { user, isLoading } = useAuth();
  if (isLoading) return <CommunityLayout><p role="status">Loading account…</p></CommunityLayout>;
  return <Discussion key={`${id}:${user?.id || 'anon'}`} id={id} userId={user?.id} />;
}

function Discussion({ id, userId }: { id: string; userId?: string }) {
  const { hash } = useLocation();
  const [problem, setProblem] = useState<CommunityProblem | null>(null);
  const [solutions, setSolutions] = useState<CommunitySolution[]>([]);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  useEffect(() => {
    if (!loading && /^#solution-[a-zA-Z0-9-]+$/.test(hash)) document.getElementById(hash.slice(1))?.scrollIntoView?.();
  }, [loading, hash]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setProblem(null); setSolutions([]); setComments([]);
    (async () => {
      const p = await communityApi.get(id);
      if (!p) { if (active) setProblem(null); return; }
      const discussion = await communityApi.discussion(id);
      if (active) { setProblem(p); setSolutions(discussion.solutions); setComments(discussion.comments); }
    })().catch(e => { if (active) setError(communityError(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, retry]);

  async function changeState(state: 'testing' | 'closed') {
    setBusy(true); setActionError(''); setMessage('');
    try { setProblem(await communityApi.state(id, state)); setConfirmClose(false); setMessage(state === 'testing' ? 'Marked as Testing. Record your observations below.' : 'Closed without a confirmed fix.'); }
    catch (e) { setActionError(communityError(e)); } finally { setBusy(false); }
  }
  if (loading) return <CommunityLayout><p role="status">Loading discussion…</p></CommunityLayout>;
  if (error) return <CommunityLayout><ErrorNotice error={error} retry={() => setRetry(n => n + 1)} /></CommunityLayout>;
  if (!problem) return <CommunityLayout><h1>Problem unavailable</h1><p>This problem does not exist or is private to its author.</p>
    {!userId && <Link to={`/auth?returnTo=${encodeURIComponent(`/problem/${id}`)}`}>Sign in to check your access</Link>}<p><Link to="/browse">Browse public problems</Link></p></CommunityLayout>;
  const owner = problem.author_id === userId;
  const eligible = problem.visibility === 'public' && ['open','testing'].includes(problem.state);
  const accepted = solutions.find(s => s.id === problem.accepted_solution_id);
  const ordered = [...solutions].sort((a,b) => Number(b.id === problem.accepted_solution_id) - Number(a.id === problem.accepted_solution_id));
  return <CommunityLayout>
    <Link to="/browse">← Community problems</Link><div className="community-actions"><StateLabel problem={problem} />
      {owner && problem.state !== 'solved' && <Link to={`/problem/${id}/edit`}>Edit problem</Link>}
      <button onClick={() => setRetry(n => n + 1)} disabled={busy}>Refresh discussion</button></div>
    <h1>{problem.title}</h1>{userId && problem.visibility === 'public' && <ReportControl target={{problem_id:id}} label="problem" />}
    {problem.visibility === 'draft' && <p className="community-notice">Only you can see this private draft. <Link to={`/problem/${id}/edit`}>Edit and publish</Link> when it is ready.</p>}
    {problem.state === 'solved' && <section className="community-card community-confirmed" aria-label="Confirmed fix">
      <h2>Confirmed fix</h2><p>The problem author tested and accepted this solution for this case.</p>
      {accepted && <p><a href={`#solution-${accepted.id}`}>{accepted.diagnosis}</a></p>}
      <h3>What worked</h3><p className="community-copy">{problem.resolution_observation}</p>
      <h3>How it was verified</h3><p className="community-copy">{problem.resolution_verification}</p>
    </section>}
    <section className="board-panel community-card community-stack" aria-label="Problem context">
      <div><h2>Symptom</h2><p className="community-copy">{problem.symptom || 'Not added yet.'}</p></div>
      <div><h2>Environment</h2>{Object.entries(problem.environment).map(([key,value]) => <p key={key} className="community-copy">{key === 'description' ? '' : `${key}: `}{typeof value === 'string' ? value : JSON.stringify(value)}</p>)}
        <p>{problem.product} {problem.product_version}</p></div>
      <div className="community-grid"><div><h3>Expected result</h3><p className="community-copy">{problem.expected_behavior || 'Not added yet.'}</p></div>
        <div><h3>Actual result</h3><p className="community-copy">{problem.actual_behavior || 'Not added yet.'}</p></div></div>
      <div><h2>Tests already attempted</h2>{problem.attempted_tests.length ? <ol>{problem.attempted_tests.map((a,i) => <li key={i}><strong>{a.test}</strong><p>{a.observation}</p>{a.verification_method && <p>Verification: {a.verification_method}</p>}</li>)}</ol> : <p>No tests recorded yet.</p>}</div>
      {problem.observations && <div><h3>Additional observations</h3><p className="community-copy">{problem.observations}</p></div>}
      {problem.verification_method && <div><h3>Planned verification</h3><p className="community-copy">{problem.verification_method}</p></div>}
      <div className="community-actions">{problem.tags.map(tag => <Link key={tag} to={`/browse?tag=${encodeURIComponent(tag)}`}>#{tag}</Link>)}</div>
    </section>
    {actionError && <ErrorNotice error={actionError} />}{message && <p role="status">{message}</p>}
    {owner && problem.state !== 'solved' && problem.state !== 'closed' && <div className="community-actions">
      {eligible && problem.state !== 'testing' && <button disabled={busy} onClick={() => void changeState('testing')}>Mark as Testing</button>}
      {!confirmClose ? <button disabled={busy} onClick={() => setConfirmClose(true)}>Close unresolved problem</button>
        : <><p>Close this discussion without a confirmed fix?</p><button disabled={busy} onClick={() => void changeState('closed')}>Confirm close</button><button disabled={busy} onClick={() => setConfirmClose(false)}>Keep open</button></>}
    </div>}
    {problem.state === 'closed' && <p className="community-notice">This discussion is closed without a confirmed fix.</p>}
    <AcceptanceHistory id={id} version={problem.updated_at} />{owner && problem.state === 'solved' && <ReverseAcceptance problem={problem} onReversed={setProblem} />}<h2 className="community-stack">Proposed solutions ({solutions.length})</h2>
    <p>Accepted means the author confirmed a fix. Community upvotes indicate usefulness, not verification.</p>
    {!solutions.length && <p>No solutions yet.{eligible && !owner ? ' Share a diagnosis and steps to verify it.' : ''}</p>}
    <div className="community-stack">{ordered.map(s => <SolutionCard key={s.id} solution={s} problem={problem} userId={userId}
      comments={comments.filter(c => c.solution_id === s.id)} onComment={c => setComments(prev => [...prev, c])}
      onAccepted={p => { setProblem(p); setMessage('Solution accepted. This problem is now Solved.'); }} />)}</div>
    {eligible && userId && !owner && <SolutionForm problemId={id} onSaved={s => setSolutions(prev => [...prev, s])} />}
    {eligible && !userId && <p className="community-notice"><Link to={`/auth?returnTo=${encodeURIComponent(`/problem/${id}`)}`}>Sign in to propose a solution or ask a contributor for clarification</Link>.</p>}
  </CommunityLayout>;
}

function VoteSummary({ problemId, solutions }: { problemId: string; solutions: CommunitySolution[] }) {
  const [counts, setCounts] = useState<Record<string,number> | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    (async () => { try { const data = await communityApi.voteCounts(problemId); if (active) setCounts(data); }
      catch { if (active) setError('Community upvote counts are unavailable.'); } })();
    return () => { active = false; };
  }, [problemId]);
  return <aside aria-label="Community feedback"><p>Accepted means the author confirmed a fix. Community upvotes indicate usefulness, not verification.</p>
    {error ? <p>{error}</p> : counts === null ? <p role="status">Loading community feedback…</p> : <ul>{solutions.map(s => <li key={s.id}><a href={`#solution-${s.id}`}>{s.diagnosis}</a>: {(counts[s.id] || 0) > 0 ? `${counts[s.id]} community upvote${counts[s.id] === 1 ? '' : 's'}` : 'No community upvotes yet'}</li>)}</ul>}
  </aside>;
}

function SolutionForm({ problemId, onSaved }: { problemId: string; onSaved: (s: CommunitySolution) => void }) {
  const [form, setForm] = useState({ diagnosis: '', steps: '', reasoning: '', verification_method: '', sources: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [saved, setSaved] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setSaved(false);
    if ([form.diagnosis,form.reasoning,form.verification_method].some(s => !s.trim()) || !lines(form.steps).length) { setError('Complete the diagnosis, steps, reasoning and verification method.'); return; }
    setBusy(true);
    try { onSaved(await communityApi.solution({ ...form, problem_id: problemId, steps: lines(form.steps), sources: lines(form.sources) }));
      setForm({ diagnosis: '', steps: '', reasoning: '', verification_method: '', sources: '' }); setSaved(true);
    } catch (e) { setError(communityError(e)); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="board-panel community-card community-stack" aria-label="Propose a solution"><h2>Propose a solution</h2><fieldset disabled={busy}>
    <TextField label="Diagnosis" value={form.diagnosis} onChange={diagnosis => setForm(p => ({...p, diagnosis}))} required />
    <TextField label="Steps (one per line)" value={form.steps} onChange={steps => setForm(p => ({...p, steps}))} required maxLength={50000} />
    <TextField label="Why this should work" value={form.reasoning} onChange={reasoning => setForm(p => ({...p, reasoning}))} required />
    <TextField label="How to verify the solution" value={form.verification_method} onChange={verification_method => setForm(p => ({...p, verification_method}))} required />
    <TextField label="Sources (http or https links, one per line)" value={form.sources} onChange={sources => setForm(p => ({...p, sources}))} />
    {error && <ErrorNotice error={error} />}<button type="submit">{busy ? 'Submitting…' : 'Submit solution'}</button>
  </fieldset>{saved && <p role="status">Solution submitted.</p>}</form>;
}

function SolutionCard({ solution: s, problem, userId, comments, onComment, onAccepted }: {
  solution: CommunitySolution; problem: CommunityProblem; userId?: string; comments: CommunityComment[];
  onComment: (c: CommunityComment) => void; onAccepted: (p: CommunityProblem) => void;
}) {
  const owner = problem.author_id === userId;
  const accepted = problem.accepted_solution_id === s.id;
  const [body, setBody] = useState(''); const [test, setTest] = useState('');
  const [observation, setObservation] = useState(''); const [verification, setVerification] = useState('');
  const [acceptObservation, setAcceptObservation] = useState(''); const [acceptVerification, setAcceptVerification] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  async function addComment(e: FormEvent) {
    e.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try {
      onComment(await communityApi.comment({ solution_id: s.id, kind: 'clarification', body: body.trim() })); setBody(''); setMessage('Clarification added.');
    } catch (e) { setError(communityError(e)); } finally { setBusy(false); }
  }
  async function recordTest(e: FormEvent) {
    e.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try {
      onComment(await communityApi.comment({ solution_id: s.id, kind: 'test_result', body: 'Author test result', attempted_test: test.trim(), observation: observation.trim(), verification_method: verification.trim() }));
      setAcceptObservation(observation); setAcceptVerification(verification); setTest(''); setObservation(''); setVerification(''); setMessage('Test result saved.');
    } catch (e) { setError(communityError(e)); } finally { setBusy(false); }
  }
  async function accept(e: FormEvent) {
    e.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try { onAccepted(await communityApi.accept({ p_problem_id: problem.id, p_solution_id: s.id, p_observation: acceptObservation.trim(), p_verification: acceptVerification.trim() })); }
    catch (e) { setError(communityError(e)); } finally { setBusy(false); }
  }
  return <article id={`solution-${s.id}`} className={`board-panel community-card ${accepted ? 'community-confirmed' : ''}`}>
    <p className="community-muted">{contributorLabel(s.author_id, problem.author_id, userId)}{accepted ? ' · Accepted by the author' : ' · Proposed solution'}</p>
    <Link to={`/problem/${problem.id}#solution-${s.id}`}>Link to this solution</Link>
    <VoteControl problemId={problem.id} solutionId={s.id} own={s.author_id === userId} signedIn={!!userId} closed={problem.state === 'closed'} /><h3>{s.diagnosis}</h3>{userId && problem.visibility === 'public' && <ReportControl target={{solution_id:s.id}} label="solution" />}<ol>{s.steps.map((step,i) => <li key={i}>{step}</li>)}</ol>
    <h3>Reasoning</h3><p className="community-copy">{s.reasoning}</p>
    <h3>Verification method</h3><p className="community-copy">{s.verification_method}</p>
    {s.observations && <p className="community-copy">{s.observations}</p>}
    {s.sources.map((source,i) => { const url = safeSourceUrl(source); return url ? <p key={i}><a href={url} target="_blank" rel="noreferrer noopener">{source}</a></p> : <p key={i}>{source}</p>; })}
    <h3>Clarifications and test results</h3>
    {!comments.length && <p className="community-muted">No clarifications or test results yet.</p>}
    {comments.map(c => <div key={c.id} className="community-comments"><p className="community-muted">{contributorLabel(c.author_id, problem.author_id, userId)}</p>
      <p className="community-copy">{c.body}</p>{userId && problem.visibility === 'public' && <ReportControl target={{comment_id:c.id}} label="comment" />}{c.kind === 'test_result' && <><p><strong>Test:</strong> {c.attempted_test}</p><p><strong>Observed:</strong> {c.observation}</p><p><strong>Verified:</strong> {c.verification_method || 'Not recorded'}</p></>}
    </div>)}
    {error && <ErrorNotice error={error} />}{message && <p role="status">{message}</p>}
    {userId && problem.visibility === 'public' && problem.state !== 'closed' && <form onSubmit={addComment} aria-label={`Clarify ${s.diagnosis}`}>
      <fieldset disabled={busy}><TextField label="Ask or answer a clarification" value={body} onChange={setBody} required />
        <button type="submit">Add clarification</button></fieldset></form>}
    {owner && problem.visibility === 'public' && ['open','testing'].includes(problem.state) && <>
      <form onSubmit={recordTest} className="community-stack" aria-label={`Record test for ${s.diagnosis}`}><h3>Record what you tested</h3><fieldset disabled={busy}>
        <TextField label="What did you test?" value={test} onChange={setTest} required />
        <TextField label="What did you observe?" value={observation} onChange={setObservation} required />
        <TextField label="How did you verify the result?" value={verification} onChange={setVerification} required />
        <button type="submit">Save test result</button></fieldset></form>
      {problem.state === 'testing' ? <form onSubmit={accept} className="community-stack" aria-label={`Accept ${s.diagnosis}`}><h3>Confirm this solution worked</h3>
        <p>Accept only after testing. Your confirmation and this solution will be preserved as the solved case.</p><fieldset disabled={busy}>
          <TextField label="Confirmed observation" value={acceptObservation} onChange={setAcceptObservation} required maxLength={20000} />
          <TextField label="Confirmed verification" value={acceptVerification} onChange={setAcceptVerification} required />
          <button type="submit">Accept solution and mark Solved</button>
        </fieldset></form> : <p className="community-muted">Mark the problem as Testing before accepting a solution.</p>}
    </>}
  </article>;
}
