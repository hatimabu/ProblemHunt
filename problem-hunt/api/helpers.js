import { v4 as uuidv4 } from 'uuid';
import { query } from './db.js';

export function generateId() {
  return uuidv4();
}

export function getTimestamp() {
  return new Date().toISOString();
}

export function parseSolAmount(raw) {
  if (raw == null || raw === '') return null;
  const val = parseFloat(raw);
  if (isNaN(val) || val <= 0) return null;
  return Math.round(val * 1e6) / 1e6;
}

export function parseStringList(raw) {
  if (Array.isArray(raw)) return raw.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof raw === 'string') {
    return raw.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
  }
  return [];
}

export function parseBudgetValue(str) {
  const match = String(str || '').match(/\$?(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

export function normalizeProblem(p) {
  const type = (p.type || 'problem').toLowerCase() === 'job' ? 'job' : 'problem';
  return {
    ...p,
    type,
    requirements: parseStringList(p.requirements),
    upvotes: parseInt(p.upvotes) || 0,
    proposals: parseInt(p.proposals) || 0,
    deadline: p.deadline || null,
    acceptedProposalId: p.acceptedProposalId || p.accepted_proposal_id || null,
    createdAt: p.createdAt || p.created_at || getTimestamp(),
    updatedAt: p.updatedAt || p.updated_at || p.createdAt || getTimestamp(),
    jobType: p.jobType || p.job_type || null,
    budgetSol: parseSolAmount(p.budgetSol || p.budget_sol) || null,
    skillsRequired: parseStringList(p.skillsRequired || p.skills_required),
    jobStatus: type === 'job' ? (p.jobStatus || p.job_status || 'open') : (p.jobStatus || null),
  };
}

export function normalizeProposal(p) {
  const status = ['pending', 'accepted', 'rejected'].includes(p.status) ? p.status : 'pending';
  return {
    ...p,
    status,
    briefSolution: p.briefSolution || p.description || '',
    expertise: parseStringList(p.expertise),
    timeline: p.timeline || null,
    cost: p.cost || null,
    estimatedDelivery: p.estimatedDelivery || p.estimated_delivery || null,
    proposedPriceSol: parseSolAmount(p.proposedPriceSol || p.proposed_price_sol) || null,
    createdAt: p.createdAt || p.created_at || getTimestamp(),
    updatedAt: p.updatedAt || p.updated_at || p.createdAt || getTimestamp(),
  };
}

export async function getProfile(userId) {
  try {
    const result = await query(
      'SELECT id, username, full_name, wallet_address, avatar_url FROM users WHERE id = $1',
      [userId]
    );
    if (!result.rows[0]) return null;
    const r = result.rows[0];
    return { user_id: r.id, username: r.username, full_name: r.full_name, wallet_address: r.wallet_address };
  } catch (e) {
    console.warn('getProfile failed:', e.message);
    return null;
  }
}

export async function getDisplayName(userId, fallback) {
  const profile = await getProfile(userId);
  return (profile && (profile.full_name || profile.username)) || fallback || 'Anonymous Builder';
}

export async function getPrimaryWalletAddress(userId, chain = 'solana') {
  try {
    if (chain === 'solana') {
      const profile = await getProfile(userId);
      if (profile?.wallet_address) return profile.wallet_address;
    }
    const result = await query(
      `SELECT address FROM wallets WHERE user_id = $1 AND chain = $2 ORDER BY is_primary DESC, created_at ASC LIMIT 1`,
      [userId, chain]
    );
    return result.rows[0]?.address || null;
  } catch (e) {
    console.warn('getPrimaryWalletAddress failed:', e.message);
    return null;
  }
}

export async function getWalletAddresses(userId) {
  const wallets = {};
  try {
    const profile = await getProfile(userId);
    if (profile?.wallet_address) wallets['solana'] = profile.wallet_address;

    const result = await query(
      `SELECT chain, address FROM wallets WHERE user_id = $1 ORDER BY is_primary DESC, created_at ASC`,
      [userId]
    );
    for (const row of result.rows) {
      if (!wallets[row.chain]) wallets[row.chain] = row.address;
    }
  } catch (e) {
    console.warn('getWalletAddresses failed:', e.message);
  }
  return wallets;
}

export async function createNotification(userId, message, link = null) {
  try {
    await query(
      'INSERT INTO notifications (id, user_id, message, link) VALUES ($1, $2, $3, $4)',
      [generateId(), userId, message, link]
    );
  } catch (e) {
    console.warn('createNotification failed:', e.message);
  }
}

export async function insertPaymentRecord({ jobId, fromUserId, toUserId, amountSol, txHash, fromWalletAddress, toWalletAddress }) {
  try {
    const id = generateId();
    const result = await query(
      `INSERT INTO payments (id, job_id, from_user_id, to_user_id, amount_sol, tx_hash, from_wallet_address, to_wallet_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, jobId, fromUserId, toUserId, amountSol, txHash, fromWalletAddress || null, toWalletAddress || null]
    );
    return result.rows[0];
  } catch (e) {
    console.warn('insertPaymentRecord failed:', e.message);
    return { jobId, fromUserId, toUserId, amountSol, txHash };
  }
}

export async function insertTipTransactionRecord({ proposalId, problemId, builderId, tipperId, amount, currency, chain, txHash, toWalletAddress, message }) {
  if (!txHash) return null;
  try {
    const id = generateId();
    const result = await query(
      `INSERT INTO tip_transactions (id, proposal_id, problem_id, builder_id, tipper_id, amount, currency, chain, tx_hash, to_wallet_address, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [id, proposalId, problemId || null, builderId || null, tipperId, amount, currency, chain, txHash, toWalletAddress || null, message || null]
    );
    return result.rows[0];
  } catch (e) {
    console.warn('insertTipTransactionRecord failed:', e.message);
    return null;
  }
}

export function buildProblemLink(problemId) {
  return `/problem/${problemId}`;
}

export async function getTipTotalsForProposals(proposalIds) {
  const ids = proposalIds.filter(Boolean);
  if (ids.length === 0) return {};
  try {
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const result = await query(
      `SELECT proposal_id, SUM(amount) as total FROM tips WHERE proposal_id IN (${placeholders}) GROUP BY proposal_id`,
      ids
    );
    const totals = {};
    for (const row of result.rows) {
      totals[row.proposal_id] = parseFloat(row.total) || 0;
    }
    return totals;
  } catch (e) {
    console.warn('getTipTotalsForProposals failed:', e.message);
    return {};
  }
}
