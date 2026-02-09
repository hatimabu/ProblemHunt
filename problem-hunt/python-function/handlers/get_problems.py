"""Get Problems Handler"""
import json
import azure.functions as func
from cosmos import containers
from utils import create_response


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Get all problems with filtering and sorting"""
    try:
        # Parse query parameters
        category = req.params.get('category', 'all')
        sort_by = req.params.get('sortBy', 'upvotes')  # upvotes, newest, budget
        budget_min = int(req.params.get('budgetMin', 0))
        budget_max = int(req.params.get('budgetMax', 999999))
        limit = int(req.params.get('limit', 100))
        offset = int(req.params.get('offset', 0))
        
        # Query all problems
        problems = containers['problems'].query_items(
            query="SELECT * FROM c",
            enable_cross_partition_query=True
        )
        
        # Filter by budget
        filtered = [p for p in problems 
                   if budget_min <= p.get('budgetValue', 0) <= budget_max]
        
        # Filter by category
        if category != 'all':
            filtered = [p for p in filtered if p.get('category') == category]
        
        # Sort
        if sort_by == 'newest':
            filtered.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        elif sort_by == 'budget':
            filtered.sort(key=lambda x: x.get('budgetValue', 0), reverse=True)
        else:  # upvotes
            filtered.sort(key=lambda x: x.get('upvotes', 0), reverse=True)
        
        # Apply pagination
        paginated = filtered[offset:offset + limit]
        
        return func.HttpResponse(
            json.dumps({
                'problems': paginated,
                'total': len(filtered),
                'limit': limit,
                'offset': offset
            }),
            status_code=200,
            mimetype="application/json"
        )
    
    except Exception as e:
        print(f"GetProblems error: {str(e)}")
        return func.HttpResponse(
            json.dumps({'error': 'Failed to fetch problems', 'details': str(e)}),
            status_code=500,
            mimetype="application/json"
        )
