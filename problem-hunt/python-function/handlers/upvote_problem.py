"""Upvote Problem Handler"""
import json
import azure.functions as func
from cosmos import containers
from utils import get_authenticated_user_id, generate_id, get_timestamp


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Upvote a problem"""
    try:
        problem_id = req.route_params.get('id')
        user_id = get_authenticated_user_id(req)
        
        if not user_id:
            return func.HttpResponse(
                json.dumps({'error': 'Authentication required'}),
                status_code=401,
                mimetype="application/json"
            )
        
        # Check if problem exists
        problems = containers['problems'].query_items(
            query="SELECT * FROM c WHERE c.id = @id",
            parameters=[{'name': '@id', 'value': problem_id}],
            enable_cross_partition_query=True
        )
        
        if not problems:
            return func.HttpResponse(
                json.dumps({'error': 'Problem not found'}),
                status_code=404,
                mimetype="application/json"
            )
        
        problem = problems[0]
        
        # Check if user already upvoted
        upvote_id = f"{problem_id}-{user_id}"
        
        upvotes = containers['upvotes'].query_items(
            query="SELECT * FROM c WHERE c.id = @id",
            parameters=[{'name': '@id', 'value': upvote_id}],
            enable_cross_partition_query=True
        )
        
        if upvotes:
            return func.HttpResponse(
                json.dumps({'error': 'You already upvoted this problem'}),
                status_code=409,
                mimetype="application/json"
            )
        
        # Create upvote record
        upvote = {
            'id': upvote_id,
            'problemId': problem_id,
            'userId': user_id,
            'createdAt': get_timestamp()
        }
        
        containers['upvotes'].create_item(body=upvote)
        
        # Increment upvote count on problem
        problem['upvotes'] = problem.get('upvotes', 0) + 1
        problem['updatedAt'] = get_timestamp()
        
        containers['problems'].replace_item(problem['id'], problem)
        
        return func.HttpResponse(
            json.dumps({
                'problem': problem,
                'message': 'Upvote successful'
            }),
            status_code=200,
            mimetype="application/json"
        )
    
    except Exception as e:
        print(f"UpvoteProblem error: {str(e)}")
        return func.HttpResponse(
            json.dumps({'error': 'Failed to upvote problem', 'details': str(e)}),
            status_code=500,
            mimetype="application/json"
        )
