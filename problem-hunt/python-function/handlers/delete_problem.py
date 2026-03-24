"""Delete Problem Handler."""

import azure.functions as func

from cosmos import containers
from handlers.marketplace_helpers import delete_problem_related_documents, get_problem, json_response
from utils import get_authenticated_user_id


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Delete a problem or job and its related Cosmos documents."""
    try:
        problem_id = req.route_params.get('id')
        user_id = get_authenticated_user_id(req)

        if not user_id:
            return json_response({'error': 'Authentication required'}, 401)

        problem = get_problem(problem_id)
        if not problem:
            return json_response({'error': 'Problem not found'}, 404)

        if problem.get('authorId') != user_id:
            return json_response({'error': 'You can only delete your own problems'}, 403)

        delete_problem_related_documents(problem_id)
        containers['problems'].delete_item(problem_id, problem_id)

        return json_response({
            'message': 'Problem deleted successfully',
            'id': problem_id
        })

    except Exception as exc:
        return json_response({'error': 'Failed to delete problem', 'details': str(exc)}, 500)
