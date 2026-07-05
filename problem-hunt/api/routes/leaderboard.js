import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/leaderboard
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || 20);

    const [proposalsResult, tipsResult] = await Promise.all([
      query('SELECT builder_id, builder_name, status FROM proposals', []),
      query('SELECT builder_id, amount FROM tips', []),
    ]);

    const builderStats = {};

    for (const p of proposalsResult.rows) {
      const id = p.builder_id;
      if (!id) continue;
      if (!builderStats[id]) {
        builderStats[id] = {
          builderId: id, builderName: p.builder_name || 'Anonymous',
          proposalsSubmitted: 0, proposalsAccepted: 0, tipsReceived: 0, reputationScore: 0,
        };
      }
      builderStats[id].proposalsSubmitted++;
      if (p.status === 'accepted') builderStats[id].proposalsAccepted++;
    }

    for (const t of tipsResult.rows) {
      const id = t.builder_id;
      if (!id) continue;
      if (!builderStats[id]) {
        builderStats[id] = {
          builderId: id, builderName: 'Anonymous',
          proposalsSubmitted: 0, proposalsAccepted: 0, tipsReceived: 0, reputationScore: 0,
        };
      }
      builderStats[id].tipsReceived += parseFloat(t.amount || 0);
    }

    for (const stats of Object.values(builderStats)) {
      stats.reputationScore = stats.proposalsAccepted * 100 + Math.floor(stats.tipsReceived * 10) + stats.proposalsSubmitted * 5;
    }

    let leaderboard = Object.values(builderStats)
      .sort((a, b) => b.reputationScore - a.reputationScore)
      .slice(0, limit);

    leaderboard = leaderboard.map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
      tier: entry.reputationScore >= 5000 ? 'Legend' :
            entry.reputationScore >= 1500 ? 'Expert' :
            entry.reputationScore >= 500 ? 'Senior' :
            entry.reputationScore >= 100 ? 'Builder' : 'Newcomer',
    }));

    return res.json({ leaderboard, total: leaderboard.length, period: req.query.period || 'alltime' });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch leaderboard', details: e.message });
  }
});

export default router;
