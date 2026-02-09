"""GetPosts Azure Function

HTTP Trigger: GET /api/get-posts

Authenticated endpoint to retrieve all posts for the current user.
Requires a valid Supabase JWT token in the Authorization header.

Query Parameters:
  - limit: Number of posts to return (default: 10, max: 100)
  - offset: Number of posts to skip for pagination (default: 0)

Response (200 OK):
[
  {
    "id": "post-uuid",
    "user_id": "user-uuid",
    "title": "Post Title",
    "content": "Post content here",
    "tags": ["tag1"],
    "upvotes": 5,
    "created_at": "2024-01-15T10:30:00.000000",
    "updated_at": "2024-01-15T10:35:00.000000"
  },
  ...
]

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
    """Handle GET request to retrieve user's posts."""
    
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
        
        # Step 2: Get pagination parameters
        try:
            limit = int(req.params.get("limit", 10))
            offset = int(req.params.get("offset", 0))
            
            # Validate limits
            limit = min(limit, 100)  # Max 100 posts per request
            limit = max(limit, 1)    # At least 1 post
            offset = max(offset, 0)  # Offset can't be negative
        
        except ValueError:
            return func.HttpResponse(
                json.dumps({"error": "Invalid limit or offset parameters"}),
                status_code=400,
                mimetype="application/json"
            )
        
        # Step 3: Retrieve posts from Cosmos DB
        try:
            db_client = get_db_client()
            posts = db_client.get_posts(
                user_id=user_id,
                limit=limit,
                offset=offset
            )
            
            logger.info(f"Retrieved {len(posts)} posts for user {user_id}")
            
            return func.HttpResponse(
                json.dumps(posts),
                status_code=200,
                mimetype="application/json"
            )
        
        except CosmosDBError as e:
            logger.error(f"Database error: {str(e)}")
            return func.HttpResponse(
                json.dumps({"error": "Failed to retrieve posts"}),
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
