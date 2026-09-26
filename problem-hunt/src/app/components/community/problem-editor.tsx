import { recordPilotMetric } from '../../../lib/pilot-privacy';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { communityApi, communityError } from '../../../lib/supabase-community';
import type { AttemptedTest, CommunityCategory, CommunityDomain, CommunityProblem, CommunityVisibility } from '../../../lib/community';
import { CommunityLayout, ErrorNotice, TextField } from './shared';

export function CommunityEditor() {
  const { id } = useParams();
  const { user, isLoading } = useAuth();
  if (isLoading) return <CommunityLayout><p role="status">Loading account…</p></CommunityLayout>;
  if (!user) return <CommunityLayout><Link to="/auth">Sign in to post a problem</Link></CommunityLayout>;
  return <Editor key={`${user.id}:${id || 'new'}`} id={id} userId={user.id} />;
}

function Editor({ id, userId }: { id?: string; userId: string }) {
  const navigate = useNavigate();
  const [initial, setInitial] = useState<CommunityProblem | null>(null);
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [domains, setDomains] = useState<CommunityDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: '', category_id: '', symptom: '', environment: '', product: '', product_version: '', expected_behavior: '', actual_behavior: '', observations: '', verification_method: '', tags: '' });
  const [attempts, setAttempts] = useState<AttemptedTest[]>([]);
  const field = (key: keyof typeof form) => (value: string) => setForm(prev => ({ ...prev, [key]: value }));
  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError('');
    Promise.all([communityApi.taxonomy(), id ? communityApi.get(id) : Promise.resolve(null)]).then(([taxonomy, p]) => {
      if (!active) return;
      if (id && (!p || p.author_id !== userId)) throw new Error('This problem is unavailable or you do not have permission to edit it.');
      if (p?.state === 'solved') throw new Error('Confirmed solutions and solved problems are preserved as tested evidence.');
      setInitial(p); setCategories(taxonomy.categories); setDomains(taxonomy.domains);
      if (p) {
        setForm({ title: p.title, category_id: p.category_id, symptom: p.symptom,
          environment: typeof p.environment.description === 'string' ? p.environment.description : JSON.stringify(p.environment, null, 2),
          product: p.product, product_version: p.product_version, expected_behavior: p.expected_behavior,
          actual_behavior: p.actual_behavior, observations: p.observations, verification_method: p.verification_method, tags: p.tags.join(', ') });
        setAttempts(p.attempted_tests);
      }
    }).catch(e => { if (active) setLoadError(communityError(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, userId, retry]);

  async function save(visibility: CommunityVisibility) {
    if (busy) return;
    setError('');
    if (!form.title.trim() || !form.category_id) { setError('Add a title and choose a category, even for a draft.'); return; }
    if (visibility === 'public' && [form.symptom, form.environment, form.expected_behavior, form.actual_behavior].some(v => !v.trim())) {
      setError('Before publishing, describe the symptom, environment, expected result and actual result.'); return;
    }
    if (attempts.some(a => !a.test.trim() || !a.observation.trim())) { setError('Each attempted test needs both a test and an observation. Remove an unused test.'); return; }
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (tags.length > 20) { setError('Use no more than 20 tags.'); return; }
    setBusy(true);
    try {
      const p = await communityApi.save({ ...form, title: form.title.trim(),
        environment: form.environment.trim() ? { ...initial?.environment, description: form.environment.trim() } : {},
        attempted_tests: attempts.map(a => ({ test: a.test.trim(), observation: a.observation.trim(), ...(a.verification_method?.trim() ? { verification_method: a.verification_method.trim() } : {}) })),
        tags, visibility }, id);
      if (visibility === 'public' && initial?.visibility !== 'public') recordPilotMetric('publishedProblems');
      navigate(`/problem/${p.id}`);
    } catch (e) { setError(communityError(e)); } finally { setBusy(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); void save('public'); }
  return <CommunityLayout><h1>{id ? 'Edit problem' : 'Post a problem'}</h1>
    <p className="community-muted">Describe what happened and what you tried. Remove credentials, customer names and private logs before publishing.</p>
    {loading ? <p role="status">Loading editor…</p> : loadError ? <ErrorNotice error={loadError} retry={() => setRetry(n => n + 1)} /> :
      <form onSubmit={submit} className="board-panel community-card">
        <fieldset disabled={busy}>
          <TextField label="Problem title" value={form.title} onChange={field('title')} multiline={false} maxLength={200} />
          <label className="community-field"><span>Category</span><select aria-label="Category" value={form.category_id} onChange={e => field('category_id')(e.target.value)}>
            <option value="">Choose a category</option>{domains.map(d => <optgroup key={d.id} label={d.name}>
              {categories.filter(c => c.domain_id === d.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>)}
          </select></label>
          <TextField label="Symptom" value={form.symptom} onChange={field('symptom')} />
          <TextField label="Environment and setup" value={form.environment} onChange={field('environment')} />
          <div className="community-grid"><TextField label="Product or model" value={form.product} onChange={field('product')} multiline={false} maxLength={200} />
            <TextField label="Version" value={form.product_version} onChange={field('product_version')} multiline={false} maxLength={200} /></div>
          <TextField label="Expected result" value={form.expected_behavior} onChange={field('expected_behavior')} />
          <TextField label="Actual result" value={form.actual_behavior} onChange={field('actual_behavior')} />
          <h2>Tests already attempted</h2>
          {attempts.map((attempt, i) => <div key={i} className="community-comments">
            <TextField label={`Test ${i + 1}`} value={attempt.test} onChange={test => setAttempts(prev => prev.map((a,j) => j === i ? { ...a, test } : a))} />
            <TextField label={`Observation ${i + 1}`} value={attempt.observation} onChange={observation => setAttempts(prev => prev.map((a,j) => j === i ? { ...a, observation } : a))} />
            <button type="button" onClick={() => setAttempts(prev => prev.filter((_, j) => j !== i))}>Remove test {i + 1}</button>
          </div>)}
          <div className="community-actions"><button type="button" disabled={attempts.length >= 100} onClick={() => setAttempts(prev => [...prev, { test: '', observation: '' }])}>Add attempted test</button></div>
          <TextField label="Additional observations" value={form.observations} onChange={field('observations')} maxLength={20000} />
          <TextField label="How will you verify a fix?" value={form.verification_method} onChange={field('verification_method')} />
          <TextField label="Tags (comma-separated)" value={form.tags} onChange={field('tags')} multiline={false} />
          {error && <ErrorNotice error={error} />}
          <div className="community-actions">
            {initial?.visibility !== 'public' && <button type="button" onClick={() => void save('draft')}>Save private draft</button>}
            <button type="submit">{initial?.visibility === 'public' ? 'Save published changes' : 'Publish problem'}</button>
            <Link to={id ? `/problem/${id}` : '/dashboard'}>Cancel</Link>
          </div>
        </fieldset>{busy && <p role="status">Saving problem…</p>}
      </form>}
  </CommunityLayout>;
}
