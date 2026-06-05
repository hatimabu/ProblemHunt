import { Router } from 'express';
import { query } from '../db.js';
import { authenticate, optionalAuth } from '../auth.js';
import {
  generateId, getTimestamp, normalizeProblem, normalizeProposal,
  parseSolAmount, parseStringList, parseBudgetValue,
  getDisplayName, getPrimaryWalletAddress, getWalletAddresses,
  createNotification, buildProblemLink, insertPaymentRecord,
  getTipTotalsForProposals,
} from '../helpers.js';

const router = Router();

const VALID_CATEGORIES = ['AI/ML','Web3','Finance','Governance','Trading','Infrastructure','Security','Data Engineering','DevOps','Backend','Frontend','Mobile','Automation'];
const VALID_JOB_TYPES = ['one-time','contract','ongoing'];

async function getProblem(id) {
  const r = await query('SELECT * FROM problems WHERE id=$1', [id]);
  return r.rows[0] ? normalizeProblem(r.rows[0]) : null;
}

async function getProposal(id) {
  const r = await query('SELECT * FROM proposals WHERE id=$1', [id]);
  return r.rows[0] ? normalizeProposal(r.rows[0]) : null;
}

async function getProposalsForProblem(problemId) {
  const r = await query('SELECT * FROM proposals WHERE problem_id=$1 ORDER BY created_at DESC', [problemId]);
  return r.rows.map(normalizeProposal);
}

async function saveProblem(p) {
  await query(
    `INSERT INTO problems (id,type,title,description,requirements,category,upvotes,proposals,author,author_id,
      deadline,created_at,updated_at,budget,budget_value,budget_sol,job_type,skills_required,job_status,
      accepted_proposal_id,accepted_builder_id,accepted_builder_name,accepted_builder_wallet_address,
      completed_at,paid_at,payment_tx_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
     ON CONFLICT (id) DO UPDATE SET
       type=EXCLUDED.type, title=EXCLUDED.title, description=EXCLUDED.description,
       requirements=EXCLUDED.requirements, category=EXCLUDED.category, upvotes=EXCLUDED.upvotes,
       proposals=EXCLUDED.proposals, author=EXCLUDED.author, deadline=EXCLUDED.deadline,
       updated_at=EXCLUDED.updated_at, budget=EXCLUDED.budget, budget_value=EXCLUDED.budget_value,
       budget_sol=EXCLUDED.budget_sol, job_type=EXCLUDED.job_type, skills_required=EXCLUDED.skills_required,
       job_status=EXCLUDED.job_status, accepted_proposal_id=EXCLUDED.accepted_proposal_id,
       accepted_builder_id=EXCLUDED.accepted_builder_id, accepted_builder_name=EXCLUDED.accepted_builder_name,
       accepted_builder_wallet_address=EXCLUDED.accepted_builder_wallet_address,
       completed_at=EXCLUDED.completed_at, paid_at=EXCLUDED.paid_at, payment_tx_hash=EXCLUDED.payment_tx_hash`,
    [
      p.id, p.type, p.title, p.description,
      JSON.stringify(p.requirements || []), p.category,
      p.upvotes || 0, p.proposals || 0, p.author || 'Anonymous User', p.authorId,
      p.deadline || null, p.createdAt, p.updatedAt,
      p.budget || null, p.budgetValue || null, p.budgetSol || null,
      p.jobType || null, JSON.stringify(p.skillsRequired || []), p.jobStatus || null,
      p.acceptedProposalId || null, p.acceptedBuilderId || null,
      p.acceptedBuilderName || null, p.acceptedBuilderWalletAddress || null,
      p.completedAt || null, p.paidAt || null, p.paymentTxHash || null,
    ]
  );
}

async function saveProposal(p) {
  await query(
    `INSERT INTO proposals (id,problem_id,title,description,brief_solution,project_url,builder_id,builder_name,
       timeline,cost,expertise,status,proposed_price_sol,estimated_delivery,payment_tx_hash,created_at,updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     ON CONFLICT (id) DO UPDATE SET
       status=EXCLUDED.status, timeline=EXCLUDED.timeline, cost=EXCLUDED.cost,
       payment_tx_hash=EXCLUDED.payment_tx_hash, updated_at=EXCLUDED.updated_at`,
    [
      p.id, p.problemId, p.title, p.description,
      p.briefSolution || p.description || '',
      p.projectUrl || null, p.builderId, p.builderName,
      p.timeline || null, p.cost || null,
      JSON.stringify(p.expertise || []), p.status || 'pending',
      p.proposedPriceSol || null, p.estimatedDelivery || null,
      p.paymentTxHash || null, p.createdAt, p.updatedAt,
    ]
  );
}

// GET /api/problems
router.get('/', async (req, res) => {
  try {
    const { category = 'all', sortBy = 'upvotes', type: postType = 'all', budgetMin = 0, budgetMax = 999999999, limit = 100, offset = 0 } = req.query;
    const rows = await query('SELECT * FROM problems', []);
    let problems = rows.rows.map(normalizeProblem);

    problems = problems.filter(p =>
      parseFloat(p.budgetValue || 0) >= parseFloat(budgetMin) &&
      parseFloat(p.budgetValue || 0) <= parseFloat(budgetMax)
    );
    if (category !== 'all') problems = problems.filter(p => p.category === category);
    if (postType === 'problem' || postType === 'job') problems = problems.filter(p => p.type === postType);

    if (sortBy === 'newest') problems.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    else if (sortBy === 'budget') problems.sort((a, b) => (b.budgetValue || 0) - (a.budgetValue || 0));
    else if (sortBy === 'proposals') problems.sort((a, b) => (b.proposals || 0) - (a.proposals || 0));
    else problems.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));

    const paginated = problems.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    return res.json({ problems: paginated, total: problems.length, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to fetch problems', details: e.message });
  }
});

// GET /api/problems/search
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim().toLowerCase();
    if (!q) return res.status(400).json({ error: 'Search term is required' });
    const rows = await query('SELECT * FROM problems', []);
    const results = rows.rows.map(normalizeProblem).filter(p =>
      (p.title || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
    );
    return res.json({ results, total: results.length, searchTerm: q });
  } catch (e) {
    return res.status(500).json({ error: 'Search failed', details: e.message });
  }
});

// POST /api/problems
router.post('/', authenticate, async (req, res) => {
  try {
    const data = req.body;
    const userId = req.userId;
    if (!data.title || !data.description || !data.category) {
      return res.status(400).json({ error: 'Missing required fields: title, description, category' });
    }
    if (!VALID_CATEGORIES.includes(data.category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const type = (data.type || '').toLowerCase() === 'job' ? 'job' : 'problem';
    const now = getTimestamp();
    const problem = {
      id: generateId(), type, title: data.title.trim(), description: data.description.trim(),
      requirements: parseStringList(data.requirements || []),
      category: data.category, upvotes: 0, proposals: 0,
      author: data.author || 'Anonymous User', authorId: userId,
      deadline: data.deadline || null, createdAt: now, updatedAt: now,
    };

    if (type === 'job') {
      const budgetSol = parseSolAmount(data.budgetSol || data.budget_sol || data.budget);
      const jobType = (data.jobType || data.job_type || '').trim().toLowerCase();
      if (budgetSol == null || !data.deadline || !VALID_JOB_TYPES.includes(jobType)) {
        return res.status(400).json({ error: 'Jobs require budgetSol, deadline, and jobType (one-time, contract, or ongoing)' });
      }
      Object.assign(problem, {
        budget: data.budget || `${budgetSol} SOL`, budgetSol, budgetValue: budgetSol,
        jobType, skillsRequired: parseStringList(data.skillsRequired || data.skills_required),
        jobStatus: 'open', acceptedProposalId: null,
      });
    } else {
      const budget = String(data.budget || '').trim();
      if (!budget) return res.status(400).json({ error: 'Problem posts require a budget' });
      Object.assign(problem, { budget, budgetValue: parseBudgetValue(budget) });
    }

    await saveProblem(problem);
    return res.status(201).json(problem);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to create post', details: e.message });
  }
});

// GET /api/problems/:id
router.get('/:id', async (req, res) => {
  try {
    const problem = await getProblem(req.params.id);
    if (!problem) return res.status(404).json({ error: 'Problem not found' });
    return res.json(problem);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch problem', details: e.message });
  }
});

// DELETE /api/problems/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const problem = await getProblem(req.params.id);
    if (!problem) return res.status(404).json({ error: 'Problem not found' });
    if (problem.authorId !== req.userId) return res.status(403).json({ error: 'You can only delete your own problems' });

    await query('DELETE FROM proposals WHERE problem_id=$1', [req.params.id]);
    await query('DELETE FROM upvotes WHERE problem_id=$1', [req.params.id]);
    await query('DELETE FROM tips WHERE problem_id=$1', [req.params.id]);
    await query('DELETE FROM problems WHERE id=$1', [req.params.id]);
    return res.json({ message: 'Problem deleted successfully', id: req.params.id });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to delete problem', details: e.message });
  }
});

// POST /api/problems/:id/upvote
router.post('/:id/upvote', authenticate, async (req, res) => {
  try {
    const problemId = req.params.id;
    const userId = req.userId;
    const problem = await getProblem(problemId);
    if (!problem) return res.status(404).json({ error: 'Problem not found' });

    const upvoteId = `${problemId}-${userId}`;
    const existing = await query('SELECT id FROM upvotes WHERE id=$1', [upvoteId]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'You already upvoted this problem' });

    await query('INSERT INTO upvotes (id, problem_id, user_id, created_at) VALUES ($1,$2,$3,$4)', [upvoteId, problemId, userId, getTimestamp()]);
    problem.upvotes += 1;
    problem.updatedAt = getTimestamp();
    await saveProblem(problem);
    return res.json({ problem, message: 'Upvote successful' });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to upvote problem', details: e.message });
  }
});

// DELETE /api/problems/:id/upvote
router.delete('/:id/upvote', authenticate, async (req, res) => {
  try {
    const problemId = req.params.id;
    const userId = req.userId;
    const upvoteId = `${problemId}-${userId}`;
    const existing = await query('SELECT id FROM upvotes WHERE id=$1', [upvoteId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Upvote not found' });

    await query('DELETE FROM upvotes WHERE id=$1', [upvoteId]);
    const problem = await getProblem(problemId);
    if (problem) {
      problem.upvotes = Math.max(0, problem.upvotes - 1);
      problem.updatedAt = getTimestamp();
      await saveProblem(problem);
    }
    return res.json({ problem, message: 'Upvote removed successfully' });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to remove upvote', details: e.message });
  }
});

// GET /api/problems/:id/proposals
router.get('/:id/proposals', async (req, res) => {
  try {
    const proposals = await getProposalsForProblem(req.params.id);
    const tipTotals = await getTipTotalsForProposals(proposals.map(p => p.id));
    const walletCache = {};
    const enriched = [];
    for (const proposal of proposals) {
      const builderId = proposal.builderId;
      if (builderId && !walletCache[builderId]) walletCache[builderId] = await getWalletAddresses(builderId);
      enriched.push({
        ...proposal,
        builderWalletAddress: (walletCache[builderId] || {}).solana || null,
        builderWallets: walletCache[builderId] || {},
        tipTotal: tipTotals[proposal.id] || 0,
      });
    }
    return res.json({ proposals: enriched, total: enriched.length });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch proposals', details: e.message });
  }
});

// POST /api/problems/:id/proposals
router.post('/:id/proposals', authenticate, async (req, res) => {
  try {
    const problemId = req.params.id;
    const userId = req.userId;
    const data = req.body;

    if (!data.title || !data.description) return res.status(400).json({ error: 'Missing required fields: title, description' });
    const problem = await getProblem(problemId);
    if (!problem) return res.status(404).json({ error: 'Problem not found' });

    const builderName = await getDisplayName(userId, data.builderName);
    const proposedPriceSol = parseSolAmount(data.proposedPriceSol || data.proposed_price_sol);
    const estimatedDelivery = (data.estimatedDelivery || data.estimated_delivery || '').trim() || null;

    if (problem.type === 'job' && (proposedPriceSol == null || !estimatedDelivery)) {
      return res.status(400).json({ error: 'Job proposals require proposedPriceSol and estimatedDelivery' });
    }

    const now = getTimestamp();
    const proposal = normalizeProposal({
      id: generateId(), problemId, title: data.title.trim(), description: data.description.trim(),
      projectUrl: data.projectUrl || null, builderId: userId, builderName,
      briefSolution: (data.briefSolution || data.description).trim(),
      timeline: data.timeline || estimatedDelivery,
      cost: data.cost || (proposedPriceSol ? `${proposedPriceSol} SOL` : null),
      expertise: parseStringList(data.expertise || []),
      status: 'pending', proposedPriceSol, estimatedDelivery,
      createdAt: now, updatedAt: now,
    });

    await saveProposal(proposal);
    problem.proposals = (problem.proposals || 0) + 1;
    problem.updatedAt = getTimestamp();
    await saveProblem(problem);

    if (problem.type === 'job') {
      await createNotification(problem.authorId, `New proposal received on ${problem.title}`, buildProblemLink(problemId));
    }

    return res.status(201).json(proposal);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to create proposal', details: e.message });
  }
});

// POST /api/problems/:id/proposals/:proposalId/accept
router.post('/:id/proposals/:proposalId/accept', authenticate, async (req, res) => {
  try {
    const { id: problemId, proposalId } = req.params;
    const userId = req.userId;

    const problem = await getProblem(problemId);
    if (!problem) return res.status(404).json({ error: 'Job not found' });
    if (problem.type !== 'job') return res.status(400).json({ error: 'Only job posts support proposal acceptance' });
    if (problem.authorId !== userId) return res.status(403).json({ error: 'Only the job owner can accept a proposal' });
    if (problem.jobStatus !== 'open') return res.status(400).json({ error: 'Only open jobs can accept a proposal' });

    const acceptedProposal = await getProposal(proposalId);
    if (!acceptedProposal || acceptedProposal.problemId !== problemId) return res.status(404).json({ error: 'Proposal not found for this job' });

    const timestamp = getTimestamp();
    const proposals = await getProposalsForProblem(problemId);
    for (const proposal of proposals) {
      proposal.status = proposal.id === proposalId ? 'accepted' : 'rejected';
      proposal.updatedAt = timestamp;
      await saveProposal(proposal);
    }

    problem.acceptedProposalId = proposalId;
    problem.acceptedBuilderId = acceptedProposal.builderId;
    problem.acceptedBuilderName = acceptedProposal.builderName;
    problem.acceptedBuilderWalletAddress = await getPrimaryWalletAddress(acceptedProposal.builderId, 'solana');
    problem.jobStatus = 'in_progress';
    problem.updatedAt = timestamp;
    await saveProblem(problem);

    await createNotification(acceptedProposal.builderId, 'Your proposal was accepted! Get to work 🚀', buildProblemLink(problemId));
    return res.json({ job: problem, acceptedProposal: await getProposal(proposalId) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to accept proposal', details: e.message });
  }
});

// POST /api/problems/:id/complete
router.post('/:id/complete', authenticate, async (req, res) => {
  try {
    const problemId = req.params.id;
    const userId = req.userId;
    const problem = await getProblem(problemId);
    if (!problem) return res.status(404).json({ error: 'Job not found' });
    if (problem.type !== 'job') return res.status(400).json({ error: 'Only job posts can be completed' });
    if (problem.jobStatus !== 'in_progress') return res.status(400).json({ error: 'Only in-progress jobs can be completed' });

    const acceptedProposal = problem.acceptedProposalId ? await getProposal(problem.acceptedProposalId) : null;
    if (!acceptedProposal) return res.status(400).json({ error: 'Accepted proposal not found' });
    if (acceptedProposal.builderId !== userId) return res.status(403).json({ error: 'Only the accepted builder can mark this job complete' });

    const timestamp = getTimestamp();
    problem.jobStatus = 'completed';
    problem.completedAt = timestamp;
    problem.updatedAt = timestamp;
    await saveProblem(problem);

    const builderName = acceptedProposal.builderName || 'The builder';
    await createNotification(problem.authorId, `${builderName} marked the job done - review and pay`, buildProblemLink(problemId));
    return res.json({ job: problem });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to mark job complete', details: e.message });
  }
});

// POST /api/problems/:id/payments
router.post('/:id/payments', authenticate, async (req, res) => {
  try {
    const problemId = req.params.id;
    const userId = req.userId;
    const data = req.body;

    const txHash = String(data.txHash || data.tx_hash || '').trim();
    if (!txHash) return res.status(400).json({ error: 'txHash is required' });

    const problem = await getProblem(problemId);
    if (!problem) return res.status(404).json({ error: 'Job not found' });
    if (problem.type !== 'job') return res.status(400).json({ error: 'Only job posts support payout recording' });
    if (problem.authorId !== userId) return res.status(403).json({ error: 'Only the job owner can record payment' });
    if (problem.jobStatus !== 'completed') return res.status(400).json({ error: 'Jobs must be completed before payment is recorded' });

    const acceptedProposal = problem.acceptedProposalId ? await getProposal(problem.acceptedProposalId) : null;
    if (!acceptedProposal) return res.status(400).json({ error: 'Accepted proposal not found' });

    const agreedAmount = acceptedProposal.proposedPriceSol || problem.budgetSol;
    if (agreedAmount == null) return res.status(400).json({ error: 'Agreed SOL amount is missing' });

    const builderWallet = await getPrimaryWalletAddress(acceptedProposal.builderId, 'solana');
    if (!builderWallet) return res.status(400).json({ error: 'The accepted builder has not linked a Solana wallet' });

    const providedAmount = parseSolAmount(data.amountSol || data.amount_sol) || agreedAmount;
    const fromWallet = String(data.fromWalletAddress || data.from_wallet_address || '').trim() || null;

    const payment = await insertPaymentRecord({
      jobId: problemId, fromUserId: userId, toUserId: acceptedProposal.builderId,
      amountSol: providedAmount, txHash, fromWalletAddress: fromWallet, toWalletAddress: builderWallet,
    });

    const timestamp = getTimestamp();
    problem.jobStatus = 'paid';
    problem.paidAt = timestamp;
    problem.paymentTxHash = txHash;
    problem.updatedAt = timestamp;
    await saveProblem(problem);

    acceptedProposal.paymentTxHash = txHash;
    acceptedProposal.updatedAt = timestamp;
    await saveProposal(acceptedProposal);

    await createNotification(acceptedProposal.builderId, `Payment received for ${problem.title} ✅`, buildProblemLink(problemId));
    return res.json({ payment, job: problem });
  } catch (e) {
    const status = e.message?.includes('duplicate') ? 409 : 500;
    return res.status(status).json({ error: 'Failed to record payment', details: e.message });
  }
});

export default router;
