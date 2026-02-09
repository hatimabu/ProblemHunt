"""
Shared utilities module for Azure Functions.

Exports commonly used functions and classes for authentication and database operations.
"""

from .auth import (
    authenticate_request,
    extract_token,
    validate_jwt,
    get_user_id_from_token,
    auth_required,
    AuthError,
)
from .db import (
    CosmosDBClient,
    get_db_client,
    CosmosDBError,
)

__all__ = [
    "authenticate_request",
    "extract_token",
    "validate_jwt",
    "get_user_id_from_token",
    "auth_required",
    "AuthError",
    "CosmosDBClient",
    "get_db_client",
    "CosmosDBError",
]
