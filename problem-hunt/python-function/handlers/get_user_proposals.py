"""Get User Proposals Handler."""

import azure.functions as func

from handlers.marketplace_helpers import (
    get_tip_totals_for_proposals,
    json_response,
    normalize_problem,
    normalize_proposal,
    query_items,
)
from utils import get_authenticated_user_id


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Get all proposals submitted by the authenticated user."""
    try:
        user_id = get_authenticated_user_id(req)

        if not user_id:
            return json_response({'error': 'Authentication required'}, 401)

        proposals = [
            normalize_proposal(proposal)
            for proposal in query_items(
                "proposals",
                "SELECT * FROM c WHERE c.builderId = @userId ORDER BY c.createdAt DESC",
                [{'name': '@userId', 'value': user_id}],
            )
        ]

        tip_totals = get_tip_totals_for_proposals([proposal["id"] for proposal in proposals])
        enriched = []
        problem_cache = {}
        for proposal in proposals:
            proposal_id = proposal.get('id')
            problem_id = proposal.get('problemId')

            if problem_id and problem_id not in problem_cache:
                problems = query_items(
                    "problems",
                    "SELECT * FROM c WHERE c.id = @id",
                    [{'name': '@id', 'value': problem_id}],
                )
                problem_cache[problem_id] = normalize_problem(problems[0]) if problems else {}

            problem = problem_cache.get(problem_id, {})
            enriched_proposal = {
                **proposal,
                'problemTitle': problem.get('title', 'Unknown Problem'),
                'problemType': problem.get('type', 'problem'),
                'jobStatus': problem.get('jobStatus'),
                'isAcceptedBuilder': problem.get('acceptedProposalId') == proposal_id,
                'tipTotal': tip_totals.get(proposal_id, 0),
            }
            enriched.append(enriched_proposal)

        return json_response({'proposals': enriched, 'total': len(enriched)})

    except Exception as exc:
        return json_response({'error': 'Failed to fetch proposals', 'details': str(exc)}, 500)
