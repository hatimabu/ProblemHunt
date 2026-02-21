"""Get User Proposals Handler"""
import json
import azure.functions as func
from cosmos import containers
from utils import get_authenticated_user_id


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Get all proposals submitted by the authenticated user"""
    try:
        user_id = get_authenticated_user_id(req)

        if not user_id:
            return func.HttpResponse(
                json.dumps({'error': 'Authentication required'}),
                status_code=401,
                mimetype="application/json"
            )

        # Query proposals by builderId
        proposals = list(containers['proposals'].query_items(
            query="SELECT * FROM c WHERE c.builderId = @userId ORDER BY c.createdAt DESC",
            parameters=[{'name': '@userId', 'value': user_id}],
            enable_cross_partition_query=True
        ))

        # Fetch tip totals per proposal from tips container
        tip_totals = {}
        try:
            tips = list(containers['tips'].query_items(
                query="SELECT c.proposalId, c.amount FROM c WHERE c.builderId = @userId",
                parameters=[{'name': '@userId', 'value': user_id}],
                enable_cross_partition_query=True
            ))
            for tip in tips:
                pid = tip.get('proposalId')
                if pid:
                    tip_totals[pid] = tip_totals.get(pid, 0) + float(tip.get('amount', 0))
        except Exception:
            pass  # Tips are optional; continue without them

        # Enrich proposals with tip totals and problem titles
        enriched = []
        problem_cache = {}
        for proposal in proposals:
            proposal_id = proposal.get('id')
            problem_id = proposal.get('problemId')

            # Fetch problem title (with cache)
            if problem_id and problem_id not in problem_cache:
                try:
                    problems = list(containers['problems'].query_items(
                        query="SELECT c.id, c.title FROM c WHERE c.id = @id",
                        parameters=[{'name': '@id', 'value': problem_id}],
                        enable_cross_partition_query=True
                    ))
                    problem_cache[problem_id] = problems[0] if problems else {}
                except Exception:
                    problem_cache[problem_id] = {}

            problem = problem_cache.get(problem_id, {})
            enriched_proposal = {
                **proposal,
                'problemTitle': problem.get('title', 'Unknown Problem'),
                'tipTotal': tip_totals.get(proposal_id, 0),
            }
            enriched.append(enriched_proposal)

        return func.HttpResponse(
            json.dumps({
                'proposals': enriched,
                'total': len(enriched)
            }),
            status_code=200,
            mimetype="application/json"
        )

    except Exception as e:
        print(f"GetUserProposals error: {str(e)}")
        return func.HttpResponse(
            json.dumps({'error': 'Failed to fetch proposals', 'details': str(e)}),
            status_code=500,
            mimetype="application/json"
        )
