"""Create Proposal Handler"""
import json
import azure.functions as func
from cosmos import containers
from utils import (
    get_authenticated_user_id, validate_required, generate_id, get_timestamp
)


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Create a new proposal for a problem"""
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
            data = req.get_json()
        except ValueError:
            return func.HttpResponse(
                json.dumps({'error': 'Invalid JSON'}),
                status_code=400,
                mimetype="application/json"
            )
        
        # Validate required fields
        validation_error = validate_required(data, ['title', 'description'])
        if validation_error:
            return func.HttpResponse(
                json.dumps({'error': validation_error}),
                status_code=400,
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
        
        # Get builder name from Supabase profiles (optional)
        builder_name = data.get('builderName', 'Anonymous Builder')
        
        # Create proposal
        proposal = {
            'id': generate_id(),
            'problemId': problem_id,
            'title': data['title'].strip(),
            'description': data['description'].strip(),
            'projectUrl': data.get('projectUrl'),
            'builderId': user_id,
            'builderName': builder_name,
            'briefSolution': data.get('briefSolution', ''),
            'timeline': data.get('timeline'),
            'cost': data.get('cost'),
            'expertise': data.get('expertise', []),
            'createdAt': get_timestamp(),
            'updatedAt': get_timestamp()
        }
        
        # Save to database
        containers['proposals'].create_item(body=proposal)
        
        # Increment proposal count on problem
        problem['proposals'] = problem.get('proposals', 0) + 1
        problem['updatedAt'] = get_timestamp()
        containers['problems'].replace_item(problem['id'], problem)
        
        return func.HttpResponse(
            json.dumps(proposal),
            status_code=201,
            mimetype="application/json"
        )
    
    except Exception as e:
        print(f"CreateProposal error: {str(e)}")
        return func.HttpResponse(
            json.dumps({'error': 'Failed to create proposal', 'details': str(e)}),
            status_code=500,
            mimetype="application/json"
        )
