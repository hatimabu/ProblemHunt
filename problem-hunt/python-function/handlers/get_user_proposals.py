"""Get User Proposals Handler."""

import logging

import azure.functions as func

from handlers.marketplace_helpers import (
    _pg_proposal_to_camel,
    get_problem,
    get_tip_totals_for_proposals,
    json_response,
    normalize_proposal,
)
from supabase_client import get_supabase_client
from utils import get_authenticated_user_id


logger = logging.getLogger(__name__)


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Get all proposals submitted by the authenticated user."""
    try:
        user_id = get_authenticated_user_id(req)

        if not user_id:
            return json_response({'error': 'Authentication required'}, 401)

        sb = get_supabase_client()
        proposals_resp = (
            sb.table('proposals')
            .select('*')
            .eq('builder_id', user_id)
            .order('created_at', desc=True)
            .execute()
        )
        proposals = [
            normalize_proposal(_pg_proposal_to_camel(row))
            for row in (proposals_resp.data or [])
        ]

        tip_totals = get_tip_totals_for_proposals([proposal["id"] for proposal in proposals])
        enriched = []
        problem_cache = {}

        for proposal in proposals:
            proposal_id = proposal.get('id')
            problem_id = proposal.get('problemId')

            if problem_id and problem_id not in problem_cache:
                problem_cache[problem_id] = get_problem(problem_id) or {}

            problem = problem_cache.get(problem_id, {})
            enriched.append({
                **proposal,
                'problemTitle': problem.get('title', 'Unknown Problem'),
                'problemType': problem.get('type', 'problem'),
                'jobStatus': problem.get('jobStatus'),
                'isAcceptedBuilder': problem.get('acceptedProposalId') == proposal_id,
                'tipTotal': tip_totals.get(proposal_id, 0),
            })

        return json_response({'proposals': enriched, 'total': len(enriched)})

    except Exception:
        logger.exception("Handler error")
        return json_response({'error': 'Failed to fetch proposals'}, 500)
