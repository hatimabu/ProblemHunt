"""Create Problem Handler"""
import json
import azure.functions as func
from cosmos import containers
from utils import (
    create_response, error_response, get_authenticated_user_id, 
    generate_id, validate_required, parse_budget_value, get_timestamp,
    parse_requirements
)


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Create a new problem"""
    try:
        # Get authenticated user
        user_id = get_authenticated_user_id(req)
        if not user_id:
            return func.HttpResponse(
                json.dumps({'error': 'Authentication required'}),
                status_code=401,
                mimetype="application/json"
            )
        
        # Parse request body
        try:
            data = req.get_json()
        except ValueError:
            return func.HttpResponse(
                json.dumps({'error': 'Invalid JSON'}),
                status_code=400,
                mimetype="application/json"
            )
        
        # Validate required fields
        validation_error = validate_required(data, ['title', 'description', 'category', 'budget'])
        if validation_error:
            return func.HttpResponse(
                json.dumps({'error': validation_error}),
                status_code=400,
                mimetype="application/json"
            )
        
        # Validate category
        valid_categories = ['AI/ML', 'Web3', 'Finance', 'Governance', 'Trading', 'Infrastructure']
        if data['category'] not in valid_categories:
            return func.HttpResponse(
                json.dumps({'error': 'Invalid category'}),
                status_code=400,
                mimetype="application/json"
            )
        
        # Parse requirements
        requirements = parse_requirements(data.get('requirements', []))
        
        # Create problem object
        problem = {
            'id': generate_id(),
            'title': data['title'].strip(),
            'description': data['description'].strip(),
            'requirements': requirements,
            'category': data['category'],
            'budget': data['budget'],
            'budgetValue': parse_budget_value(data['budget']),
            'upvotes': 0,
            'proposals': 0,
            'author': data.get('author', 'Anonymous User'),
            'authorId': user_id,
            'deadline': data.get('deadline'),
            'createdAt': get_timestamp(),
            'updatedAt': get_timestamp()
        }
        
        # Save to database
        containers['problems'].create_item(body=problem)
        
        return func.HttpResponse(
            json.dumps(problem),
            status_code=201,
            mimetype="application/json"
        )
    
    except Exception as e:
        print(f"CreateProblem error: {str(e)}")
        return func.HttpResponse(
            json.dumps({'error': 'Failed to create problem', 'details': str(e)}),
            status_code=500,
            mimetype="application/json"
        )
