"""Upvote Problem Handler."""

import logging

import azure.functions as func

from handlers.marketplace_helpers import _pg_problem_to_camel, json_response, normalize_problem
from supabase_client import get_supabase_client
from utils import get_authenticated_user_id


logger = logging.getLogger(__name__)


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Upvote a problem."""
    try:
        problem_id = req.route_params.get('id')
        user_id = get_authenticated_user_id(req)

        if not user_id:
            return json_response({'error': 'Authentication required'}, 401)

        sb = get_supabase_client()

        # Check problem exists
        prob_resp = sb.table('problems').select('id').eq('id', problem_id).limit(1).execute()
        if not prob_resp.data:
            return json_response({'error': 'Problem not found'}, 404)

        # Insert upvote — unique constraint on (problem_id, user_id) rejects duplicates
        upvote_id = f"{problem_id}-{user_id}"
        try:
            sb.table('upvotes').insert({
                'id': upvote_id,
                'problem_id': problem_id,
                'user_id': user_id,
            }).execute()
        except Exception as e:
            err = str(e).lower()
            if '23505' in str(e) or 'unique' in err or 'duplicate' in err:
                return json_response({'error': 'You already upvoted this problem'}, 409)
            raise

        # Atomic counter increment
        rpc_resp = sb.rpc('increment_problem_upvotes', {'pid': problem_id}).execute()
        rpc_data = rpc_resp.data
        updated_row = (rpc_data[0] if isinstance(rpc_data, list) else rpc_data) if rpc_data else None
        updated_problem = normalize_problem(_pg_problem_to_camel(updated_row)) if updated_row else None

        return json_response({'problem': updated_problem, 'message': 'Upvote successful'}, 200)

    except Exception:
        logger.exception("Handler error")
        return json_response({'error': 'Failed to upvote problem'}, 500)
