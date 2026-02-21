"""Get Leaderboard Handler"""
import json
import azure.functions as func
from cosmos import containers


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Get top builders by reputation, accepted proposals, and tips received"""
    try:
        period = req.params.get('period', 'alltime')  # 'week' or 'alltime'
        limit = int(req.params.get('limit', 20))

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

        return func.HttpResponse(
            json.dumps({
                'leaderboard': leaderboard,
                'total': len(leaderboard),
                'period': period
            }),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        print(f"GetLeaderboard error: {str(e)}")
        return func.HttpResponse(
            json.dumps({'error': 'Failed to fetch leaderboard', 'details': str(e)}),
            status_code=500,
            mimetype="application/json"
        )
