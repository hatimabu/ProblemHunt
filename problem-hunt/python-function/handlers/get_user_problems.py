"""Get User Problems Handler."""

import azure.functions as func

from handlers.marketplace_helpers import json_response, normalize_problem, query_items
from utils import get_authenticated_user_id


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Get problems/jobs created by the authenticated user."""
    try:
        user_id = get_authenticated_user_id(req)

        if not user_id:
            return json_response({'error': 'Authentication required'}, 401)

        sort_by = req.params.get('sortBy', 'newest')
        limit = int(req.params.get('limit', 100))
        offset = int(req.params.get('offset', 0))

        user_problems = [
            normalize_problem(problem)
            for problem in query_items(
                "problems",
                "SELECT * FROM c WHERE c.authorId = @authorId",
                [{'name': '@authorId', 'value': user_id}],
            )
        ]

        if sort_by == 'upvotes':
            user_problems = sorted(user_problems, key=lambda x: x.get('upvotes', 0), reverse=True)
        elif sort_by == 'budget':
            user_problems = sorted(user_problems, key=lambda x: x.get('budgetValue', 0), reverse=True)
        else:
            user_problems = sorted(user_problems, key=lambda x: x.get('createdAt', ''), reverse=True)

        paginated = user_problems[offset:offset + limit]

        return json_response({
            'problems': paginated,
            'total': len(user_problems),
            'limit': limit,
            'offset': offset
        })

    except Exception as exc:
        return json_response({'error': 'Failed to fetch user problems', 'details': str(exc)}, 500)
