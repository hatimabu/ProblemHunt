"""Delete Problem Handler"""
import json
import azure.functions as func
from cosmos import containers
from utils import get_authenticated_user_id


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Delete a problem"""
    try:
        problem_id = req.route_params.get('id')
        user_id = get_authenticated_user_id(req)
        
        if not user_id:
            return func.HttpResponse(
                json.dumps({'error': 'Authentication required'}),
                status_code=401,
                mimetype="application/json"
            )
        
        # Get problem to verify ownership
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
        
        # Check ownership
        if problem.get('authorId') != user_id:
            return func.HttpResponse(
                json.dumps({'error': 'You can only delete your own problems'}),
                status_code=403,
                mimetype="application/json"
            )
        
        # Delete problem
        containers['problems'].delete_item(problem_id, problem_id)
        
        # TODO: Also delete associated upvotes and proposals
        
        return func.HttpResponse(
            json.dumps({
                'message': 'Problem deleted successfully',
                'id': problem_id
            }),
            status_code=200,
            mimetype="application/json"
        )
    
    except Exception as e:
        print(f"DeleteProblem error: {str(e)}")
        return func.HttpResponse(
            json.dumps({'error': 'Failed to delete problem', 'details': str(e)}),
            status_code=500,
            mimetype="application/json"
        )
