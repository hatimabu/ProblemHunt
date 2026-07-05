import { Router } from 'express';
import { query } from '../db.js';
import { authenticate } from '../auth.js';
import { generateId, getTimestamp, getPrimaryWalletAddress, insertTipTransactionRecord } from '../helpers.js';

const router = Router();

const VALID_TIP_CHAINS = ['ethereum', 'polygon', 'arbitrum', 'solana'];

// POST /api/proposals/:id/tip
router.post('/:id/tip', authenticate, async (req, res) => {
  try {
    const proposalId = req.params.id;
    const userId = req.userId;
    const data = req.body;

    const amount = parseFloat(data.amount || 0);
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount is required' });

    const pr = await query('SELECT * FROM proposals WHERE id=$1', [proposalId]);
    const proposal = pr.rows[0];
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

    const chain = String(data.chain || 'solana').trim().toLowerCase();
    if (!VALID_TIP_CHAINS.includes(chain)) return res.status(400).json({ error: 'Unsupported chain' });

    const currency = String(data.currency || chain.toUpperCase()).trim().toUpperCase();
    const txHash = String(data.txHash || data.tx_hash || '').trim() || null;
    const fallbackWallet = await getPrimaryWalletAddress(proposal.builder_id, chain);
    const toWallet = String(data.toWallet || '').trim() || fallbackWallet || null;

    const tip = {
      id: generateId(),
      proposalId, problemId: proposal.problem_id,
      builderId: proposal.builder_id, tipperId: userId,
      amount, message: data.message || null,
      currency, chain, txHash, toWallet,
      createdAt: getTimestamp(),
    };

    await query(
      `INSERT INTO tips (id, proposal_id, problem_id, builder_id, tipper_id, amount, message, currency, chain, tx_hash, to_wallet, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [tip.id, tip.proposalId, tip.problemId, tip.builderId, tip.tipperId, tip.amount, tip.message, tip.currency, tip.chain, tip.txHash, tip.toWallet, tip.createdAt]
    );

    if (txHash) {
      await insertTipTransactionRecord({
        proposalId, problemId: proposal.problem_id, builderId: proposal.builder_id,
        tipperId: userId, amount, currency, chain, txHash, toWalletAddress: toWallet,
        message: data.message || null,
      });
    }

    return res.status(201).json(tip);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error', details: e.message });
  }
});

export default router;
