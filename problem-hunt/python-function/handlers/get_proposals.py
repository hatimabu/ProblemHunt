"""Get Proposals Handler"""
import json
import azure.functions as func
from cosmos import containers


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Get proposals for a problem"""
    try:
        problem_id = req.route_params.get('id')
        
        # Query proposals for this problem
        proposals = containers['proposals'].query_items(
            query="SELECT * FROM c WHERE c.problemId = @problemId ORDER BY c.createdAt DESC",
            parameters=[{'name': '@problemId', 'value': problem_id}],
            enable_cross_partition_query=True
        )
        
        return func.HttpResponse(
            json.dumps({
                'proposals': proposals,
                'total': len(proposals)
            }),
            status_code=200,
            mimetype="application/json"
        )
    
    except Exception as e:
        print(f"GetProposals error: {str(e)}")
        return func.HttpResponse(
            json.dumps({'error': 'Failed to fetch proposals', 'details': str(e)}),
            status_code=500,
            mimetype="application/json"
        )
