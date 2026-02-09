"""Tip Builder Handler"""
import json
import azure.functions as func
from cosmos import containers
from utils import get_authenticated_user_id, generate_id, get_timestamp


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Create a tip for a proposal"""
    try:
        proposal_id = req.route_params.get('id')
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
        
        # Validate amount
        try:
            amount = float(data.get('amount', 0))
            if amount <= 0:
                raise ValueError("Amount must be greater than 0")
        except (ValueError, TypeError):
            return func.HttpResponse(
                json.dumps({'error': 'Valid amount is required'}),
                status_code=400,
                mimetype="application/json"
            )
        
        # Check if proposal exists
        proposals = containers['proposals'].query_items(
            query="SELECT * FROM c WHERE c.id = @id",
            parameters=[{'name': '@id', 'value': proposal_id}],
            enable_cross_partition_query=True
        )
        
        if not proposals:
            return func.HttpResponse(
                json.dumps({'error': 'Proposal not found'}),
                status_code=404,
                mimetype="application/json"
            )
        
        proposal = proposals[0]
        
        # Create tip record
        tip = {
            'id': generate_id(),
            'proposalId': proposal_id,
            'builderId': proposal.get('builderId'),
            'tipperId': user_id,
            'amount': amount,
            'message': data.get('message'),
            'createdAt': get_timestamp()
        }
        
        containers['tips'].create_item(body=tip)
        
        return func.HttpResponse(
            json.dumps(tip),
            status_code=201,
            mimetype="application/json"
        )
    
    except Exception as e:
        print(f"TipBuilder error: {str(e)}")
        return func.HttpResponse(
            json.dumps({'error': 'Internal server error', 'details': str(e)}),
            status_code=500,
            mimetype="application/json"
        )
