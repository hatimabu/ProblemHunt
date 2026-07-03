"""Get Problems Handler."""

import logging

import azure.functions as func

from handlers.marketplace_helpers import _pg_problem_to_camel, json_response, normalize_problem
from supabase_client import get_supabase_client


logger = logging.getLogger(__name__)


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Get all problems/jobs with filtering and sorting."""
    try:
        category = req.params.get('category', 'all')
        sort_by = req.params.get('sortBy', 'upvotes')
        post_type = (req.params.get('type') or req.params.get('postType') or 'all').lower()
        budget_min = float(req.params.get('budgetMin', 0) or 0)
        budget_max = float(req.params.get('budgetMax', 999999999) or 999999999)
        limit = int(req.params.get('limit', 100))
        offset = int(req.params.get('offset', 0))

        sb = get_supabase_client()
        resp = sb.table('problems').select('*').execute()
        problems = [normalize_problem(_pg_problem_to_camel(row)) for row in (resp.data or [])]

        filtered = [
            problem for problem in problems
            if budget_min <= float(problem.get('budgetValue', 0) or 0) <= budget_max
        ]

        if category != 'all':
            filtered = [p for p in filtered if p.get('category') == category]

        if post_type in ('problem', 'job'):
            filtered = [p for p in filtered if p.get('type') == post_type]

        if sort_by == 'newest':
            filtered.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        elif sort_by == 'budget':
            filtered.sort(key=lambda x: x.get('budgetValue', 0), reverse=True)
        elif sort_by == 'proposals':
            filtered.sort(key=lambda x: x.get('proposals', 0), reverse=True)
        else:
            filtered.sort(key=lambda x: x.get('upvotes', 0), reverse=True)

        paginated = filtered[offset:offset + limit]

        return json_response({
            'problems': paginated,
            'total': len(filtered),
            'limit': limit,
            'offset': offset,
        })

    except Exception:
        logger.exception("Handler error")
        return json_response({'error': 'Failed to fetch problems'}, 500)
