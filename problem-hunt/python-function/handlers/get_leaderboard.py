"""Get Leaderboard Handler."""

import logging
import time

import azure.functions as func

from handlers.marketplace_helpers import json_response
from supabase_client import get_supabase_client


logger = logging.getLogger(__name__)
_CACHE_TTL_SECONDS = 60
_leaderboard_cache = {}


def _get_leaderboard(period: str, limit: int):
    cache_key = (period, limit)
    now = time.time()
    cached = _leaderboard_cache.get(cache_key)
    if cached and now - cached["timestamp"] < _CACHE_TTL_SECONDS:
        return cached["result"]

    sb = get_supabase_client()

    proposals_resp = sb.table('proposals').select('builder_id, builder_name, status').execute()
    proposals = proposals_resp.data or []

    try:
        tips_resp = sb.table('tips').select('builder_id, amount').execute()
        tips = tips_resp.data or []
    except Exception:
        tips = []

    builder_stats = {}

    for proposal in proposals:
        builder_id = proposal.get('builder_id')
        if not builder_id:
            continue
        if builder_id not in builder_stats:
            builder_stats[builder_id] = {
                'builderId': builder_id,
                'builderName': proposal.get('builder_name', 'Anonymous'),
                'proposalsSubmitted': 0,
                'proposalsAccepted': 0,
                'tipsReceived': 0.0,
                'reputationScore': 0,
            }
        builder_stats[builder_id]['proposalsSubmitted'] += 1
        if proposal.get('status') == 'accepted':
            builder_stats[builder_id]['proposalsAccepted'] += 1

    for tip in tips:
        builder_id = tip.get('builder_id')
        if not builder_id:
            continue
        if builder_id not in builder_stats:
            builder_stats[builder_id] = {
                'builderId': builder_id,
                'builderName': 'Anonymous',
                'proposalsSubmitted': 0,
                'proposalsAccepted': 0,
                'tipsReceived': 0.0,
                'reputationScore': 0,
            }
        builder_stats[builder_id]['tipsReceived'] += float(tip.get('amount', 0))

    for stats in builder_stats.values():
        stats['reputationScore'] = (
            stats['proposalsAccepted'] * 100
            + int(stats['tipsReceived'] * 10)
            + stats['proposalsSubmitted'] * 5
        )

    leaderboard = sorted(
        builder_stats.values(),
        key=lambda x: x['reputationScore'],
        reverse=True,
    )[:limit]

    for idx, entry in enumerate(leaderboard):
        entry['rank'] = idx + 1
        score = entry['reputationScore']
        if score >= 5000:
            entry['tier'] = 'Legend'
        elif score >= 1500:
            entry['tier'] = 'Expert'
        elif score >= 500:
            entry['tier'] = 'Senior'
        elif score >= 100:
            entry['tier'] = 'Builder'
        else:
            entry['tier'] = 'Newcomer'

    result = {'leaderboard': leaderboard, 'total': len(leaderboard), 'period': period}
    _leaderboard_cache[cache_key] = {"timestamp": now, "result": result}
    return result


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Get top builders by reputation, accepted proposals, and tips received."""
    try:
        period = req.params.get('period', 'alltime')
        limit = int(req.params.get('limit', 20))
        return json_response(_get_leaderboard(period, limit), 200)
    except Exception:
        logger.exception("Handler error")
        return json_response({'error': 'Failed to fetch leaderboard'}, 500)
