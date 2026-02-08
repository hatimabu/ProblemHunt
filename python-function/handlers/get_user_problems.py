"""Get User Problems Handler"""
import json
import azure.functions as func
from cosmos import containers
from utils import get_authenticated_user_id


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Get problems created by the authenticated user"""
    try:
        user_id = get_authenticated_user_id(req)
        
        if not user_id:
            return func.HttpResponse(
                json.dumps({'error': 'Authentication required'}),
                status_code=401,
                mimetype="application/json"
            )
        
        # Parse query parameters
        sort_by = req.params.get('sortBy', 'newest')  # newest, upvotes, budget
        limit = int(req.params.get('limit', 100))
        offset = int(req.params.get('offset', 0))
        
        # Query problems by user
        user_problems = containers['problems'].query_items(
            query="SELECT * FROM c WHERE c.authorId = @authorId",
            parameters=[{'name': '@authorId', 'value': user_id}],
            enable_cross_partition_query=True
        )
        
        # Sort
        if sort_by == 'upvotes':
            user_problems = sorted(user_problems, key=lambda x: x.get('upvotes', 0), reverse=True)
        elif sort_by == 'budget':
            user_problems = sorted(user_problems, key=lambda x: x.get('budgetValue', 0), reverse=True)
        else:  # newest
            user_problems = sorted(user_problems, key=lambda x: x.get('createdAt', ''), reverse=True)
        
        # Apply pagination
        paginated = user_problems[offset:offset + limit]
        
        return func.HttpResponse(
            json.dumps({
                'problems': paginated,
                'total': len(user_problems),
                'limit': limit,
                'offset': offset
            }),
            status_code=200,
            mimetype="application/json"
        )
    
    except Exception as e:
        print(f"GetUserProblems error: {str(e)}")
        return func.HttpResponse(
            json.dumps({'error': 'Failed to fetch user problems', 'details': str(e)}),
            status_code=500,
            mimetype="application/json"
        )
