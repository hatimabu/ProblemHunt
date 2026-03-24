"""Get Problems Handler."""

import azure.functions as func

from handlers.marketplace_helpers import json_response, normalize_problem, query_items


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

        problems = [normalize_problem(problem) for problem in query_items("problems", "SELECT * FROM c")]

        filtered = [
            problem for problem in problems
            if budget_min <= float(problem.get('budgetValue', 0) or 0) <= budget_max
        ]

        if category != 'all':
            filtered = [problem for problem in filtered if problem.get('category') == category]

        if post_type in ('problem', 'job'):
            filtered = [problem for problem in filtered if problem.get('type') == post_type]

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
            'offset': offset
        })

    except Exception as exc:
        return json_response({'error': 'Failed to fetch problems', 'details': str(exc)}, 500)
