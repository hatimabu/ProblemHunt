"""Remove Upvote Handler"""
import json
import azure.functions as func
from cosmos import containers
from utils import get_authenticated_user_id, get_timestamp


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Remove an upvote from a problem"""
    try:
        problem_id = req.route_params.get('id')
        user_id = get_authenticated_user_id(req)
        
        if not user_id:
            return func.HttpResponse(
                json.dumps({'error': 'Authentication required'}),
                status_code=401,
                mimetype="application/json"
            )
        
        upvote_id = f"{problem_id}-{user_id}"
        
        # Check if upvote exists
        upvotes = containers['upvotes'].query_items(
            query="SELECT * FROM c WHERE c.id = @id",
            parameters=[{'name': '@id', 'value': upvote_id}],
            enable_cross_partition_query=True
        )
        
        if not upvotes:
            return func.HttpResponse(
                json.dumps({'error': 'Upvote not found'}),
                status_code=404,
                mimetype="application/json"
            )
        
        # Delete upvote
        containers['upvotes'].delete_item(upvote_id, upvote_id)
        
        # Decrement upvote count
        problems = containers['problems'].query_items(
            query="SELECT * FROM c WHERE c.id = @id",
            parameters=[{'name': '@id', 'value': problem_id}],
            enable_cross_partition_query=True
        )
        
        if problems:
            problem = problems[0]
            problem['upvotes'] = max(0, problem.get('upvotes', 0) - 1)
            problem['updatedAt'] = get_timestamp()
            containers['problems'].replace_item(problem['id'], problem)
        
        return func.HttpResponse(
            json.dumps({
                'problem': problem if problems else None,
                'message': 'Upvote removed successfully'
            }),
            status_code=200,
            mimetype="application/json"
        )
    
    except Exception as e:
        print(f"RemoveUpvote error: {str(e)}")
        return func.HttpResponse(
            json.dumps({'error': 'Failed to remove upvote', 'details': str(e)}),
            status_code=500,
            mimetype="application/json"
        )
