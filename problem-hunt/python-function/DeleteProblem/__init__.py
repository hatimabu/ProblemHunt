"""DeletePost Azure Function

HTTP Trigger: DELETE /api/delete-post/{post_id}

Authenticated endpoint to delete a post from Cosmos DB.
Requires a valid Supabase JWT token in the Authorization header.

Path Parameters:
  - post_id: The ID of the post to delete

Response (200 OK):
{
  "message": "Post deleted successfully",
  "post_id": "post-uuid"
}

Error Response (4xx/5xx):
{
  "error": "Error message"
}"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import json
import logging
import azure.functions as func
from shared.auth import authenticate_request, AuthError
from shared.db import get_db_client, CosmosDBError


logger = logging.getLogger(__name__)


def main(req: func.HttpRequest) -> func.HttpResponse:
    """Handle DELETE request to remove a post."""
    
    try:
        # Step 1: Authenticate the request using Supabase JWT
        try:
            user_id, auth_payload = authenticate_request(req)
            logger.info(f"User {user_id} authenticated successfully")
        except AuthError as e:
            return func.HttpResponse(
                json.dumps({"error": str(e)}),
                status_code=401,
                mimetype="application/json"
            )
        
        # Step 2: Get the post_id from the URL path
        post_id = req.route_params.get("post_id")
        if not post_id:
            return func.HttpResponse(
                json.dumps({"error": "post_id is required in the URL path"}),
                status_code=400,
                mimetype="application/json"
            )
        
        # Step 3: Delete the post from Cosmos DB
        try:
            db_client = get_db_client()
            
            # Verify the post belongs to the user before deleting
            try:
                post = db_client.get_post_by_id(user_id, post_id)
                
                # Check ownership
                if post.get("user_id") != user_id:
                    logger.warning(f"User {user_id} attempted to delete post {post_id} they don't own")
                    return func.HttpResponse(
                        json.dumps({"error": "Unauthorized: You can only delete your own posts"}),
                        status_code=403,
                        mimetype="application/json"
                    )
                
                # Delete the post
                db_client.delete_post(user_id, post_id)
                logger.info(f"Post {post_id} deleted by user {user_id}")
                
                return func.HttpResponse(
                    json.dumps({
                        "message": "Post deleted successfully",
                        "post_id": post_id
                    }),
                    status_code=200,
                    mimetype="application/json"
                )
            
            except CosmosDBError as e:
                logger.error(f"Database error: {str(e)}")
                if "not found" in str(e).lower():
                    return func.HttpResponse(
                        json.dumps({"error": "Post not found"}),
                        status_code=404,
                        mimetype="application/json"
                    )
                raise
        
        except CosmosDBError as e:
            logger.error(f"Database error: {str(e)}")
            return func.HttpResponse(
                json.dumps({"error": "Failed to delete post"}),
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
