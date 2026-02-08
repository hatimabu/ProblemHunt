import azure.functions as func
from handlers import (
    create_problem,
    get_problems,
    get_problem_by_id,
    update_problem,
    delete_problem,
    upvote_problem,
    remove_upvote,
    get_proposals,
    create_proposal,
    search_problems,
    get_user_problems
)


def main(req: func.HttpRequest) -> func.HttpResponse:
    """Main router for all API endpoints"""
    
    try:
        # Route to appropriate handler based on request
        method = req.method
        route = req.route_params.get('route', '').lower()
        
        # Handle different endpoints
        if route == 'problems' and method == 'POST':
            return create_problem.handle(req)
        
        elif route == 'problems' and method == 'GET':
            return get_problems.handle(req)
        
        elif route == 'problems/{id}' and method == 'GET':
            return get_problem_by_id.handle(req)
        
        elif route == 'problems/{id}' and method == 'PUT':
            return update_problem.handle(req)
        
        elif route == 'problems/{id}' and method == 'DELETE':
            return delete_problem.handle(req)
        
        elif route == 'problems/{id}/upvote' and method == 'POST':
            return upvote_problem.handle(req)
        
        elif route == 'problems/{id}/upvote' and method == 'DELETE':
            return remove_upvote.handle(req)
        
        elif route == 'problems/{id}/proposals' and method == 'GET':
            return get_proposals.handle(req)
        
        elif route == 'problems/{id}/proposals' and method == 'POST':
            return create_proposal.handle(req)
        
        elif route == 'problems/search' and method == 'GET':
            return search_problems.handle(req)
        
        elif route == 'user/problems' and method == 'GET':
            return get_user_problems.handle(req)
        
        else:
            return func.HttpResponse(
                '{"error": "Route not found"}',
                status_code=404,
                mimetype="application/json"
            )
    
    except Exception as e:
        return func.HttpResponse(
            f'{{"error": "Internal server error", "details": "{str(e)}"}}',
            status_code=500,
            mimetype="application/json"
        )
