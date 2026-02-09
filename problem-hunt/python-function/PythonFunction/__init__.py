"""
Main entry point for the Problem Hunt API
Routes all requests to appropriate handlers
"""
import sys
import os
import json
import azure.functions as func

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

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
    get_user_problems,
    tip_builder
)


def main(req: func.HttpRequest) -> func.HttpResponse:
    """Main router for all API endpoints"""
    try:
        method = req.method
        path = req.route_params.get('route', '').lower()
        problem_id = req.route_params.get('id', '')
        
        # Route to appropriate handler based on path and method
        
        # CREATE PROBLEM: POST /problems
        if path == 'problems' and method == 'POST':
            return create_problem.handle(req)
        
        # GET PROBLEMS: GET /problems
        elif path == 'problems' and method == 'GET':
            return get_problems.handle(req)
        
        # GET PROBLEM BY ID: GET /problems/{id}
        elif path == 'problems/{id}' and method == 'GET':
            return get_problem_by_id.handle(req)
        
        # UPDATE PROBLEM: PUT /problems/{id}
        elif path == 'problems/{id}' and method == 'PUT':
            return update_problem.handle(req)
        
        # DELETE PROBLEM: DELETE /problems/{id}
        elif path == 'problems/{id}' and method == 'DELETE':
            return delete_problem.handle(req)
        
        # UPVOTE PROBLEM: POST /problems/{id}/upvote
        elif path == 'problems/{id}/upvote' and method == 'POST':
            return upvote_problem.handle(req)
        
        # REMOVE UPVOTE: DELETE /problems/{id}/upvote
        elif path == 'problems/{id}/upvote' and method == 'DELETE':
            return remove_upvote.handle(req)
        
        # GET PROPOSALS: GET /problems/{id}/proposals
        elif path == 'problems/{id}/proposals' and method == 'GET':
            return get_proposals.handle(req)
        
        # CREATE PROPOSAL: POST /problems/{id}/proposals
        elif path == 'problems/{id}/proposals' and method == 'POST':
            return create_proposal.handle(req)
        
        # SEARCH PROBLEMS: GET /problems/search
        elif 'search' in path and method == 'GET':
            return search_problems.handle(req)
        
        # GET USER PROBLEMS: GET /user/problems
        elif 'user' in path and 'problems' in path and method == 'GET':
            return get_user_problems.handle(req)
        
        # CREATE TIP: POST /proposals/{id}/tip
        elif 'proposals' in path and 'tip' in path and method == 'POST':
            return tip_builder.handle(req)
        
        # UNKNOWN ROUTE
        else:
            return func.HttpResponse(
                json.dumps({'error': f'Route not found: {path}'}),
                status_code=404,
                mimetype="application/json"
            )
    
    except Exception as e:
        print(f"Router error: {str(e)}")
        return func.HttpResponse(
            json.dumps({'error': 'Internal server error', 'details': str(e)}),
            status_code=500,
            mimetype="application/json"
        )
