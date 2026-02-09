"""Update Problem Handler"""
import json
import azure.functions as func
from cosmos import containers
from utils import (
    get_authenticated_user_id, parse_budget_value, get_timestamp,
    parse_requirements
)


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Update a problem"""
    try:
        problem_id = req.route_params.get('id')
        user_id = get_authenticated_user_id(req)
        
        if not user_id:
            return func.HttpResponse(
                json.dumps({'error': 'Authentication required'}),
                status_code=401,
                mimetype="application/json"
            )
        
        # Parse request body
        try:
            updates = req.get_json()
        except ValueError:
            return func.HttpResponse(
                json.dumps({'error': 'Invalid JSON'}),
                status_code=400,
                mimetype="application/json"
            )
        
        # Get existing problem
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
                json.dumps({'error': 'You can only edit your own problems'}),
                status_code=403,
                mimetype="application/json"
            )
        
        # Update fields
        if 'title' in updates:
            problem['title'] = updates['title'].strip()
        if 'description' in updates:
            problem['description'] = updates['description'].strip()
        if 'category' in updates:
            problem['category'] = updates['category']
        if 'budget' in updates:
            problem['budget'] = updates['budget']
            problem['budgetValue'] = parse_budget_value(updates['budget'])
        if 'requirements' in updates:
            problem['requirements'] = parse_requirements(updates['requirements'])
        if 'deadline' in updates:
            problem['deadline'] = updates.get('deadline')
        
        problem['updatedAt'] = get_timestamp()
        
        # Save to database
        containers['problems'].replace_item(problem['id'], problem)
        
        return func.HttpResponse(
            json.dumps(problem),
            status_code=200,
            mimetype="application/json"
        )
    
    except Exception as e:
        print(f"UpdateProblem error: {str(e)}")
        return func.HttpResponse(
            json.dumps({'error': 'Failed to update problem', 'details': str(e)}),
            status_code=500,
            mimetype="application/json"
        )
