"""
Shared authentication module for validating Supabase JWT tokens.

This module provides utilities to extract and validate JWT tokens from
incoming requests, verified against your Supabase JWT secret.
"""

import os
import json
import logging
from typing import Dict, Any, Optional, Tuple
import jwt
from azure.functions import HttpRequest
from functools import wraps


logger = logging.getLogger(__name__)


class AuthError(Exception):
    """Custom exception for authentication errors."""
    pass


def get_jwt_secret() -> str:
    """
    Retrieve the Supabase JWT secret from environment variables.
    
    Required environment variable: SUPABASE_JWT_SECRET
    
    Returns:
        str: The JWT secret key
        
    Raises:
        AuthError: If SUPABASE_JWT_SECRET is not set
    """
    secret = os.getenv("SUPABASE_JWT_SECRET")
    if not secret:
        raise AuthError(
            "SUPABASE_JWT_SECRET environment variable is not set. "
            "Please configure it in local.settings.json or Azure Function App settings."
        )
    return secret


def extract_token(req: HttpRequest) -> str:
    """
    Extract the JWT token from the Authorization header.
    
    Expected format: Bearer <token>
    
    Args:
        req: Azure Function HttpRequest object
        
    Returns:
        str: The JWT token
        
    Raises:
        AuthError: If Authorization header is missing or malformed
    """
    auth_header = req.headers.get("Authorization")
    
    if not auth_header:
        raise AuthError("Missing Authorization header")
    
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise AuthError("Invalid Authorization header format. Expected 'Bearer <token>'")
    
    return parts[1]


def validate_jwt(token: str) -> Dict[str, Any]:
    """
    Validate and decode a Supabase JWT token using HS256.
    
    Args:
        token: The JWT token string
        
    Returns:
        Dict: The decoded JWT payload containing user information
        
    Raises:
        AuthError: If token is invalid, expired, or signature verification fails
    """
    try:
        secret = get_jwt_secret()
        # Supabase uses HS256 by default
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={
                "verify_signature": True,
                "verify_exp": True,  # Verify expiration
            }
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthError("Token has expired")
    except jwt.InvalidTokenError as e:
        logger.error(f"JWT validation error: {str(e)}")
        raise AuthError(f"Invalid token: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error during token validation: {str(e)}")
        raise AuthError(f"Token validation failed: {str(e)}")


def get_user_id_from_token(payload: Dict[str, Any]) -> str:
    """
    Extract the user ID from the decoded JWT payload.
    
    Supabase stores the user ID in the 'sub' (subject) claim.
    
    Args:
        payload: The decoded JWT payload
        
    Returns:
        str: The user ID
        
    Raises:
        AuthError: If user ID is not found in the payload
    """
    user_id = payload.get("sub")
    if not user_id:
        raise AuthError("User ID not found in token payload")
    return user_id


def authenticate_request(req: HttpRequest) -> Tuple[str, str]:
    """
    Complete authentication flow: extract, validate, and return user ID.
    
    This is the main function to call from your route handlers.
    
    Args:
        req: Azure Function HttpRequest object
        
    Returns:
        Tuple[str, str]: (user_id, token) extracted and validated from request
        
    Raises:
        AuthError: If authentication fails at any step
        
    Example:
        try:
            user_id, token = authenticate_request(req)
            # Use user_id for database operations
        except AuthError as e:
            return func.HttpResponse(
                json.dumps({"error": str(e)}),
                status_code=401,
                mimetype="application/json"
            )
    """
    try:
        token = extract_token(req)
        payload = validate_jwt(token)
        user_id = get_user_id_from_token(payload)
        return user_id, payload
    except AuthError:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in authenticate_request: {str(e)}")
        raise AuthError(f"Authentication failed: {str(e)}")


def auth_required(f):
    """
    Decorator to protect Azure Function endpoints with JWT authentication.
    
    Usage:
        @auth_required
        def main(req: func.HttpRequest) -> func.HttpResponse:
            # req.user_id and req.auth_payload are available
            user_id = req.user_id
            ...
    """
    @wraps(f)
    def wrapper(req: HttpRequest, *args, **kwargs):
        try:
            user_id, payload = authenticate_request(req)
            # Attach to request object for use in handler
            req.user_id = user_id
            req.auth_payload = payload
            return f(req, *args, **kwargs)
        except AuthError as e:
            logger.warning(f"Authentication failed: {str(e)}")
            return {
                "status": 401,
                "body": json.dumps({"error": str(e)})
            }
    return wrapper
