"""
CreatePost Azure Function

HTTP Trigger: POST /api/create-post

Authenticated endpoint to create a new post in Cosmos DB.
Requires a valid Supabase JWT token in the Authorization header.

Request Body:
{
  "title": "Post Title",
  "content": "Post content here",
  "tags": ["tag1", "tag2"]
}

Response (201 Created):
{
  "id": "post-uuid",
  "user_id": "user-uuid",
  "title": "Post Title",
  "content": "Post content here",
  "tags": ["tag1", "tag2"],
  "upvotes": 0,
  "created_at": "2024-01-15T10:30:00.000000",
  "updated_at": "2024-01-15T10:30:00.000000"
}

Error Response (4xx/5xx):
{
  "error": "Error message"
}
"""

import json
import logging
import azure.functions as func
from shared.auth import authenticate_request, AuthError
from shared.db import get_db_client, CosmosDBError


logger = logging.getLogger(__name__)


def main(req: func.HttpRequest) -> func.HttpResponse:
    """Handle POST request to create a new post."""
    
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
        
        # Step 2: Parse request body
        try:
            req_body = req.get_json()
        except ValueError:
            return func.HttpResponse(
                json.dumps({"error": "Invalid JSON in request body"}),
                status_code=400,
                mimetype="application/json"
            )
        
        # Step 3: Validate required fields
        title = req_body.get("title", "").strip()
        content = req_body.get("content", "").strip()
        
        if not title or not content:
            return func.HttpResponse(
                json.dumps({"error": "Title and content are required"}),
                status_code=400,
                mimetype="application/json"
            )
        
        # Step 4: Save post to Cosmos DB
        try:
            db_client = get_db_client()
            post = db_client.save_post(
                user_id=user_id,
                post_data={
                    "title": title,
                    "content": content,
                    "tags": req_body.get("tags", []),
                    "upvotes": 0,
                }
            )
            
            logger.info(f"Post created with id: {post.get('id')}")
            
            return func.HttpResponse(
                json.dumps(post),
                status_code=201,
                mimetype="application/json"
            )
        
        except CosmosDBError as e:
            logger.error(f"Database error: {str(e)}")
            return func.HttpResponse(
                json.dumps({"error": "Failed to create post"}),
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
