"""Get Problem By ID Handler."""

import azure.functions as func

from handlers.marketplace_helpers import get_problem, json_response


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Get a problem or job by ID."""
    try:
        problem_id = req.route_params.get('id')

        if not problem_id:
            return json_response({'error': 'Problem ID is required'}, 400)

        problem = get_problem(problem_id)
        if not problem:
            return json_response({'error': 'Problem not found'}, 404)

        return json_response(problem)

    except Exception as exc:
        return json_response({'error': 'Failed to fetch problem', 'details': str(exc)}, 500)
