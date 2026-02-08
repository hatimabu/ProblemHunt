"""Search Problems Handler"""
import json
import azure.functions as func
from cosmos import containers


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Search problems by term"""
    try:
        search_term = req.params.get('q', '').strip()
        
        if not search_term:
            return func.HttpResponse(
                json.dumps({'error': 'Search term is required'}),
                status_code=400,
                mimetype="application/json"
            )
        
        # Get all problems and search in memory
        # (Cosmos DB CONTAINS is case-sensitive, so we do client-side search)
        all_problems = containers['problems'].query_items(
            query="SELECT * FROM c",
            enable_cross_partition_query=True
        )
        
        # Filter by search term
        search_term_lower = search_term.lower()
        results = [
            p for p in all_problems
            if search_term_lower in p.get('title', '').lower() or
               search_term_lower in p.get('description', '').lower()
        ]
        
        return func.HttpResponse(
            json.dumps({
                'results': results,
                'total': len(results),
                'searchTerm': search_term
            }),
            status_code=200,
            mimetype="application/json"
        )
    
    except Exception as e:
        print(f"SearchProblems error: {str(e)}")
        return func.HttpResponse(
            json.dumps({'error': 'Search failed', 'details': str(e)}),
            status_code=500,
            mimetype="application/json"
        )
