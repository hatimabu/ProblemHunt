"""DeleteProblem Azure Function.

HTTP Trigger: DELETE /api/problems/{id}

Authenticated endpoint to delete a problem document from Cosmos DB.
Requires a valid Supabase JWT token in the Authorization header.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import logging
import json
import azure.functions as func
from shared.auth import authenticate_request, AuthError
from shared.db import get_db_client, CosmosDBError


logger = logging.getLogger(__name__)


def main(req: func.HttpRequest) -> func.HttpResponse:
    """Handle DELETE request to remove a problem."""
    try:
        try:
            user_id, _ = authenticate_request(req)
            logger.info("User %s authenticated successfully", user_id)
        except AuthError as e:
            return func.HttpResponse(
                json.dumps({"error": str(e)}),
                status_code=401,
                mimetype="application/json"
            )
        
        problem_id = (req.route_params.get("id") or "").strip()
        if not problem_id:
            return func.HttpResponse(
                json.dumps({"error": "id is required in the URL path"}),
                status_code=400,
                mimetype="application/json"
            )

        try:
            db_client = get_db_client()

            try:
                problem = db_client.get_post_by_id(user_id, problem_id)

                if problem.get("user_id") != user_id:
                    logger.warning(
                        "User %s attempted to delete problem %s they do not own",
                        user_id,
                        problem_id,
                    )
                    return func.HttpResponse(
                        json.dumps({"error": "Unauthorized: You can only delete your own problems"}),
                        status_code=403,
                        mimetype="application/json"
                    )

                db_client.delete_post(user_id, problem_id)
                logger.info("Problem %s deleted by user %s", problem_id, user_id)

                return func.HttpResponse(
                    json.dumps({
                        "message": "Problem deleted successfully",
                        "id": problem_id
                    }),
                    status_code=200,
                    mimetype="application/json"
                )
            
            except CosmosDBError as e:
                logger.error(f"Database error: {str(e)}")
                if "not found" in str(e).lower():
                    return func.HttpResponse(
                        json.dumps({"error": "Problem not found"}),
                        status_code=404,
                        mimetype="application/json"
                    )
                raise

        except CosmosDBError as e:
            logger.error(f"Database error: {str(e)}")
            return func.HttpResponse(
                json.dumps({"error": "Failed to delete problem"}),
                status_code=500,
                mimetype="application/json"
            )

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return func.HttpResponse(
            json.dumps({"error": "Internal server error"}),
            status_code=500,
            mimetype="application/json"
        )
