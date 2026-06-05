import { Router } from 'express';
import { query } from '../db.js';
import { authenticate } from '../auth.js';
import { normalizeProblem, normalizeProposal, getTipTotalsForProposals, generateId, getTimestamp } from '../helpers.js';

const router = Router();

// GET /api/user/problems
router.get('/problems', authenticate, async (req, res) => {
  try {
    const { sortBy = 'newest', limit = 100, offset = 0 } = req.query;
    const result = await query('SELECT * FROM problems WHERE author_id=$1', [req.userId]);
    let problems = result.rows.map(normalizeProblem);

    if (sortBy === 'upvotes') problems.sort((a, b) => b.upvotes - a.upvotes);
    else if (sortBy === 'budget') problems.sort((a, b) => (b.budgetValue || 0) - (a.budgetValue || 0));
    else problems.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    const paginated = problems.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    return res.json({ problems: paginated, total: problems.length, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch user problems', details: e.message });
  }
});

// GET /api/user/proposals
router.get('/proposals', authenticate, async (req, res) => {
  try {
    const result = await query('SELECT * FROM proposals WHERE builder_id=$1 ORDER BY created_at DESC', [req.userId]);
    const proposals = result.rows.map(normalizeProposal);
    const tipTotals = await getTipTotalsForProposals(proposals.map(p => p.id));

    const problemIds = [...new Set(proposals.map(p => p.problemId).filter(Boolean))];
    const problemCache = {};
    for (const pid of problemIds) {
      const pr = await query('SELECT * FROM problems WHERE id=$1', [pid]);
      if (pr.rows[0]) problemCache[pid] = normalizeProblem(pr.rows[0]);
    }

    const enriched = proposals.map(proposal => {
      const problem = problemCache[proposal.problemId] || {};
      return {
        ...proposal,
        problemTitle: problem.title || 'Unknown Problem',
        problemType: problem.type || 'problem',
        jobStatus: problem.jobStatus || null,
        isAcceptedBuilder: problem.acceptedProposalId === proposal.id,
        tipTotal: tipTotals[proposal.id] || 0,
      };
    });

    return res.json({ proposals: enriched, total: enriched.length });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch proposals', details: e.message });
  }
});

// GET /api/user/wallets
router.get('/wallets', authenticate, async (req, res) => {
  try {
    const result = await query('SELECT * FROM wallets WHERE user_id=$1 ORDER BY is_primary DESC, created_at ASC', [req.userId]);
    return res.json({ wallets: result.rows });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch wallets', details: e.message });
  }
});

// POST /api/user/wallets
router.post('/wallets', authenticate, async (req, res) => {
  try {
    const { chain, address } = req.body;
    if (!chain || !address) return res.status(400).json({ error: 'chain and address are required' });

    const VALID_CHAINS = ['ethereum', 'polygon', 'arbitrum', 'solana'];
    if (!VALID_CHAINS.includes(chain)) return res.status(400).json({ error: 'Invalid chain' });

    await query('UPDATE wallets SET is_primary=false WHERE user_id=$1 AND chain=$2', [req.userId, chain]);
    await query('DELETE FROM wallets WHERE user_id=$1 AND chain=$2', [req.userId, chain]);

    const id = generateId();
    const now = getTimestamp();
    await query(
      'INSERT INTO wallets (id, user_id, chain, address, is_primary, created_at) VALUES ($1,$2,$3,$4,true,$5)',
      [id, req.userId, chain, address, now]
    );

    if (chain === 'solana') {
      await query('UPDATE users SET wallet_address=$1 WHERE id=$2', [address, req.userId]);
    }

    const result = await query('SELECT * FROM wallets WHERE id=$1', [id]);
    return res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to save wallet', details: e.message });
  }
});

// DELETE /api/user/wallets/:walletId
router.delete('/wallets/:walletId', authenticate, async (req, res) => {
  try {
    const result = await query('SELECT * FROM wallets WHERE id=$1 AND user_id=$2', [req.params.walletId, req.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Wallet not found' });
    await query('DELETE FROM wallets WHERE id=$1', [req.params.walletId]);
    return res.json({ message: 'Wallet deleted' });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to delete wallet', details: e.message });
  }
});

// GET /api/user/profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, username, full_name, bio, user_type, reputation_score, wallet_address, avatar_url, created_at FROM users WHERE id=$1',
      [req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Profile not found' });
    return res.json(result.rows[0]);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch profile', details: e.message });
  }
});

// PATCH /api/user/profile
router.patch('/profile', authenticate, async (req, res) => {
  try {
    const { full_name, bio } = req.body;
    const result = await query(
      'UPDATE users SET full_name=$1, bio=$2, updated_at=$3 WHERE id=$4 RETURNING id, email, username, full_name, bio, user_type, reputation_score, wallet_address, avatar_url, created_at',
      [full_name, bio, getTimestamp(), req.userId]
    );
    return res.json(result.rows[0]);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to update profile', details: e.message });
  }
});

// GET /api/user/notifications
router.get('/notifications', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, message, link, is_read, created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20',
      [req.userId]
    );
    return res.json({ notifications: result.rows });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch notifications', details: e.message });
  }
});

// PATCH /api/user/notifications/:id
router.patch('/notifications/:id', authenticate, async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to update notification', details: e.message });
  }
});

// POST /api/user/link-email — update email (and optionally password) for the authenticated user
router.post('/link-email', authenticate, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email address' });

    if (password) {
      const { hashPassword } = await import('../auth.js');
      const hash = await hashPassword(password);
      await query('UPDATE users SET email=$1, password_hash=$2, updated_at=$3 WHERE id=$4', [email, hash, getTimestamp(), req.userId]);
    } else {
      await query('UPDATE users SET email=$1, updated_at=$2 WHERE id=$3', [email, getTimestamp(), req.userId]);
    }
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to update email', details: e.message });
  }
});

// GET /api/user/wallets/:userId — get primary wallet for another user (for payment)
router.get('/wallets/:userId', async (req, res) => {
  try {
    const { chain } = req.query;
    let sql = 'SELECT address, chain, is_primary FROM wallets WHERE user_id=$1';
    const params = [req.params.userId];
    if (chain) { sql += ' AND chain=$2 AND is_primary=true'; params.push(chain); }
    sql += ' ORDER BY is_primary DESC LIMIT 1';
    const result = await query(sql, params);
    if (!result.rows[0]) return res.status(404).json({ error: 'No wallet found' });
    return res.json(result.rows[0]);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch wallet', details: e.message });
  }
});

// GET /api/user/orders — use tips table for orders (matches schema)
router.get('/orders', authenticate, async (req, res) => {
  try {
    const result = await query(
      "SELECT id, chain, amount, currency AS token_symbol, to_wallet AS receiving_address, message AS description, 'pending' AS status, created_at FROM tips WHERE tipper_id=$1 ORDER BY created_at DESC LIMIT 10",
      [req.userId]
    );
    return res.json({ orders: result.rows });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch orders', details: e.message });
  }
});

// POST /api/user/orders
router.post('/orders', authenticate, async (req, res) => {
  try {
    const { chain, amount, token_symbol, receiving_address, description, recipient_user_id } = req.body;
    if (!chain || !amount || !receiving_address) return res.status(400).json({ error: 'chain, amount, receiving_address are required' });

    const id = generateId();
    const now = getTimestamp();
    await query(
      `INSERT INTO tips (id, proposal_id, builder_id, tipper_id, amount, message, currency, chain, to_wallet, created_at)
       VALUES ($1,'direct-payment',$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, recipient_user_id || req.userId, req.userId, amount, description || '', token_symbol || 'SOL', chain, receiving_address, now]
    );
    return res.status(201).json({ id, chain, amount, token_symbol, receiving_address, description, status: 'pending', created_at: now });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to create order', details: e.message });
  }
});

// POST /api/user/orders/verify
router.post('/orders/verify', authenticate, async (req, res) => {
  try {
    const { order_id, tx_hash } = req.body;
    if (!order_id || !tx_hash) return res.status(400).json({ error: 'order_id and tx_hash are required' });
    const result = await query('SELECT * FROM tips WHERE id=$1 AND tipper_id=$2', [order_id, req.userId]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Order not found' });
    await query('UPDATE tips SET tx_hash=$1 WHERE id=$2', [tx_hash, order_id]);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to verify payment', details: e.message });
  }
});

export default router;
