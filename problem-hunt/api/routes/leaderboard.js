import { Router } from 'express';
import { supabase } from '../../lib/supabase.js';

const router = Router();

function getPeriodStart(period) {
  const now = new Date();
  switch (period) {
    case 'week':
      return new Date(now.setDate(now.getDate() - 7)).toISOString();
    case 'month':
      return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
    case 'year':
      return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
    case 'alltime':
    default:
      return null;
  }
}

// GET /api/leaderboard
router.get('/', async (req, res) => {
  try {
    const period = ['alltime', 'week', 'month', 'year'].includes(req.query.period)
      ? req.query.period
      : 'alltime';
    const requestedLimit = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 100)
      : 10;

    const periodStart = getPeriodStart(period);

    let proposalsQuery = supabase
      .from('proposals')
      .select('builder_id, builder_name, status, created_at');
    if (periodStart) {
      proposalsQuery = proposalsQuery.gte('created_at', periodStart);
    }

    let tipsQuery = supabase
      .from('tips')
      .select('builder_id, amount, created_at');
    if (periodStart) {
      tipsQuery = tipsQuery.gte('created_at', periodStart);
    }

    const [{ data: proposals, error: proposalsError }, { data: tips, error: tipsError }] = await Promise.all([
      proposalsQuery,
      tipsQuery,
    ]);

    if (proposalsError) throw proposalsError;
    if (tipsError) throw tipsError;

    const builderStats = {};

    for (const p of proposals || []) {
      const id = p.builder_id;
      if (!id) continue;
      if (!builderStats[id]) {
        builderStats[id] = {
          builderId: id,
          builderName: p.builder_name || 'Anonymous',
          proposalsSubmitted: 0,
          proposalsAccepted: 0,
          tipsReceived: 0,
          reputationScore: 0,
        };
      }
      builderStats[id].proposalsSubmitted++;
      if (p.status === 'accepted') builderStats[id].proposalsAccepted++;
    }

    for (const t of tips || []) {
      const id = t.builder_id;
      if (!id) continue;
      if (!builderStats[id]) {
        builderStats[id] = {
          builderId: id,
          builderName: 'Anonymous',
          proposalsSubmitted: 0,
          proposalsAccepted: 0,
          tipsReceived: 0,
          reputationScore: 0,
        };
      }
      builderStats[id].tipsReceived += parseFloat(t.amount || 0);
    }

    for (const stats of Object.values(builderStats)) {
      stats.reputationScore =
        stats.proposalsAccepted * 100 +
        Math.floor(stats.tipsReceived * 10) +
        stats.proposalsSubmitted * 5;
    }

    let leaderboard = Object.values(builderStats)
      .sort((a, b) => b.reputationScore - a.reputationScore)
      .slice(0, limit);

    leaderboard = leaderboard.map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
      tier:
        entry.reputationScore >= 5000
          ? 'Legend'
          : entry.reputationScore >= 1500
            ? 'Expert'
            : entry.reputationScore >= 500
              ? 'Senior'
              : entry.reputationScore >= 100
                ? 'Builder'
                : 'Newcomer',
    }));

    return res.json({ data: leaderboard });
  } catch (e) {
    console.error('Leaderboard error:', e);
    const isDev = process.env.NODE_ENV === 'development';
    return res.status(500).json({
      error: 'Failed to fetch leaderboard',
      ...(isDev ? { message: e.message } : {}),
    });
  }
});

export default router;
