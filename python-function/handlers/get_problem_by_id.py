"""Get Problem By ID Handler"""
import json
import azure.functions as func
from cosmos import containers


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Get a problem by ID"""
    try:
        problem_id = req.route_params.get('id')
        
        if not problem_id:
            return func.HttpResponse(
                json.dumps({'error': 'Problem ID is required'}),
                status_code=400,
                mimetype="application/json"
            )
        
        # Query for problem
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
        
        return func.HttpResponse(
            json.dumps(problems[0]),
            status_code=200,
            mimetype="application/json"
        )
    
    except Exception as e:
        print(f"GetProblemById error: {str(e)}")
        return func.HttpResponse(
            json.dumps({'error': 'Failed to fetch problem', 'details': str(e)}),
            status_code=500,
            mimetype="application/json"
        )
