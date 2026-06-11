"""Get Leaderboard Handler"""
import logging
import time
import azure.functions as func
from cosmos import containers
from handlers.marketplace_helpers import json_response


logger = logging.getLogger(__name__)
_CACHE_TTL_SECONDS = 60
_leaderboard_cache = {}


def _get_leaderboard(period: str, limit: int):
    cache_key = (period, limit)
    now = time.time()
    cached = _leaderboard_cache.get(cache_key)
    if cached and now - cached["timestamp"] < _CACHE_TTL_SECONDS:
        return cached["result"]

    # Fetch all proposals
    proposals = list(containers['proposals'].query_items(
        query="SELECT c.builderId, c.builderName, c.status FROM c",
        parameters=[],
        enable_cross_partition_query=True
    ))

    # Fetch all tips
    try:
        tips = list(containers['tips'].query_items(
            query="SELECT c.builderId, c.amount, c.createdAt FROM c",
            parameters=[],
            enable_cross_partition_query=True
        ))
    except Exception:
        tips = []

    # Aggregate stats per builder
    builder_stats = {}

    for proposal in proposals:
        builder_id = proposal.get('builderId')
        if not builder_id:
            continue
        if builder_id not in builder_stats:
            builder_stats[builder_id] = {
                'builderId': builder_id,
                'builderName': proposal.get('builderName', 'Anonymous'),
                'proposalsSubmitted': 0,
                'proposalsAccepted': 0,
                'tipsReceived': 0.0,
                'reputationScore': 0,
            }
        builder_stats[builder_id]['proposalsSubmitted'] += 1
        if proposal.get('status') == 'accepted':
            builder_stats[builder_id]['proposalsAccepted'] += 1

    for tip in tips:
        builder_id = tip.get('builderId')
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

    # Calculate reputation score: accepted * 100 + tips * 10 + submitted * 5
    for stats in builder_stats.values():
        stats['reputationScore'] = (
            stats['proposalsAccepted'] * 100
            + int(stats['tipsReceived'] * 10)
            + stats['proposalsSubmitted'] * 5
        )

    # Sort by reputation score descending, take top N
    leaderboard = sorted(
        builder_stats.values(),
        key=lambda x: x['reputationScore'],
        reverse=True
    )[:limit]

    # Add rank
    for idx, entry in enumerate(leaderboard):
        entry['rank'] = idx + 1
        # Determine tier
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

    result = {
        'leaderboard': leaderboard,
        'total': len(leaderboard),
        'period': period
    }
    _leaderboard_cache[cache_key] = {"timestamp": now, "result": result}
    return result


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Get top builders by reputation, accepted proposals, and tips received"""
    try:
        period = req.params.get('period', 'alltime')  # 'week' or 'alltime'
        limit = int(req.params.get('limit', 20))
        return json_response(_get_leaderboard(period, limit), 200)

    except Exception:
        logger.exception("Handler error")
        return json_response({'error': 'Failed to fetch leaderboard'}, 500)
