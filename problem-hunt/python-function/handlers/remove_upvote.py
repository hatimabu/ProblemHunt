"""Remove Upvote Handler."""

import json
import logging

import azure.functions as func

from handlers.marketplace_helpers import _pg_problem_to_camel, json_response, normalize_problem
from supabase_client import get_supabase_client
from utils import get_authenticated_user_id


logger = logging.getLogger(__name__)


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Remove an upvote from a problem."""
    try:
        problem_id = req.route_params.get('id')
        user_id = get_authenticated_user_id(req)

        if not user_id:
            return json_response({'error': 'Authentication required'}, 401)

        sb = get_supabase_client()
        upvote_id = f"{problem_id}-{user_id}"

        # Check upvote exists
        upvote_resp = sb.table('upvotes').select('id').eq('id', upvote_id).limit(1).execute()
        if not upvote_resp.data:
            return json_response({'error': 'Upvote not found'}, 404)

        # Delete upvote
        sb.table('upvotes').delete().eq('id', upvote_id).execute()

        # Atomic counter decrement
        rpc_resp = sb.rpc('decrement_problem_upvotes', {'pid': problem_id}).execute()
        rpc_data = rpc_resp.data
        updated_row = (rpc_data[0] if isinstance(rpc_data, list) else rpc_data) if rpc_data else None
        updated_problem = normalize_problem(_pg_problem_to_camel(updated_row)) if updated_row else None

        return json_response({'problem': updated_problem, 'message': 'Upvote removed successfully'}, 200)

    except Exception:
        logger.exception("Handler error")
        return json_response({'error': 'Failed to remove upvote'}, 500)
