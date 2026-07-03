"""Delete Problem Handler."""

import logging

import azure.functions as func

from handlers.marketplace_helpers import delete_problem_related_documents, get_problem, json_response
from supabase_client import get_supabase_client
from utils import get_authenticated_user_id


logger = logging.getLogger(__name__)


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Delete a problem/job and cascade-delete related proposals, upvotes, and tips."""
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

        # Explicitly delete tips first (no cascade from problems → tips)
        delete_problem_related_documents(problem_id)

        # Deleting the problem cascades to proposals and upvotes via FK ON DELETE CASCADE
        sb = get_supabase_client()
        sb.table('problems').delete().eq('id', problem_id).execute()

        return json_response({'message': 'Problem deleted successfully', 'id': problem_id})

    except Exception:
        logger.exception("Handler error")
        return json_response({'error': 'Failed to delete problem'}, 500)
