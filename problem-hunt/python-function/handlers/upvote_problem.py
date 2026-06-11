"""Upvote Problem Handler"""
import logging
import azure.functions as func
from cosmos import containers
from handlers.marketplace_helpers import json_response
from utils import get_authenticated_user_id, generate_id, get_timestamp


logger = logging.getLogger(__name__)


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Upvote a problem"""
    try:
        problem_id = req.route_params.get('id')
        user_id = get_authenticated_user_id(req)
        
        if not user_id:
            return json_response({'error': 'Authentication required'}, 401)
        
        # Check if problem exists
        problems = containers['problems'].query_items(
            query="SELECT * FROM c WHERE c.id = @id",
            parameters=[{'name': '@id', 'value': problem_id}],
            enable_cross_partition_query=True
        )
        
        if not problems:
            return json_response({'error': 'Problem not found'}, 404)
        
        problem = problems[0]
        
        # Check if user already upvoted
        upvote_id = f"{problem_id}-{user_id}"
        
        upvotes = containers['upvotes'].query_items(
            query="SELECT * FROM c WHERE c.id = @id",
            parameters=[{'name': '@id', 'value': upvote_id}],
            enable_cross_partition_query=True
        )
        
        if upvotes:
            return json_response({'error': 'You already upvoted this problem'}, 409)
        
        # Create upvote record
        upvote = {
            'id': upvote_id,
            'problemId': problem_id,
            'userId': user_id,
            'createdAt': get_timestamp()
        }
        
        containers['upvotes'].create_item(body=upvote)
        
        # Increment upvote count on problem
        problem = containers['problems'].patch_item(
            item=problem_id,
            partition_key=problem_id,
            patch_operations=[{"op": "incr", "path": "/upvotes", "value": 1}],
        )

        return json_response(
            {
                'problem': problem,
                'message': 'Upvote successful'
            },
            200,
        )
    
    except Exception:
        logger.exception("Handler error")
        return json_response({'error': 'Failed to upvote problem'}, 500)
