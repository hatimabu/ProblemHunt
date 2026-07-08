"""
Shared authentication module for validating Supabase JWT tokens.

This module supports both shared-secret tokens (HS256) and Supabase JWKS-backed
tokens (ES256/RS256), which lets the Functions app accept the default Supabase
session tokens as well as existing project-specific HS256 flows.
"""

import json
import logging
import os
from functools import lru_cache, wraps
from typing import Any, Dict, Optional, Tuple

import jwt
import requests
from azure.functions import HttpRequest
from jwt import PyJWKClient


logger = logging.getLogger(__name__)
SUPPORTED_ASYMMETRIC_ALGORITHMS = {"ES256", "RS256"}
DEFAULT_INTROSPECTION_TIMEOUT_SECONDS = 10


class AuthError(Exception):
    """Custom exception for authentication errors."""


def get_jwt_secret() -> str:
    """
    Retrieve the Supabase JWT secret from environment variables.

    Reads JWT_SECRET (Azure-safe name) with fallback to SUPABASE_JWT_SECRET.
    """
    secret = os.getenv("JWT_SECRET") or os.getenv("SUPABASE_JWT_SECRET")
    if not secret:
        raise AuthError(
            "JWT_SECRET environment variable is not set. "
            "Please configure it in local.settings.json or Azure Function App settings."
        )
    return secret


def get_jwks_url() -> str:
    """
    Retrieve the JWKS endpoint used for asymmetric JWT verification.
    """
    explicit_url = os.getenv("JWKS_URL", "").strip()
    if explicit_url:
        return explicit_url

    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    if not supabase_url:
        raise AuthError(
            "SUPABASE_URL environment variable is not set. "
            "Please configure it in local.settings.json or Azure Function App settings."
        )

    return f"{supabase_url}/auth/v1/.well-known/jwks.json"


def get_supabase_url() -> str:
    """Retrieve the project's Supabase base URL."""
    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    if not supabase_url:
        raise AuthError(
            "SUPABASE_URL environment variable is not set. "
            "Please configure it in local.settings.json or Azure Function App settings."
        )
    return supabase_url


def get_supabase_anon_key() -> str:
    """Retrieve the publishable key required for Supabase auth introspection."""
    anon_key = os.getenv("SUPABASE_ANON_KEY", "").strip()
    if not anon_key:
        raise AuthError(
            "SUPABASE_ANON_KEY environment variable is not set. "
            "Please configure it in local.settings.json or Azure Function App settings."
        )
    return anon_key


def get_allowed_issuer() -> Optional[str]:
    """
    Retrieve an optional issuer restriction for JWT validation.

    This is only enforced when ALLOWED_ISS is explicitly set so older
    project-specific tokens without an issuer claim keep working.
    """
    issuer = os.getenv("ALLOWED_ISS", "").strip()
    return issuer or None


def get_allowed_audience() -> Optional[list[str]]:
    """
    Retrieve an optional audience restriction for JWT validation.
    """
    raw_value = os.getenv("ALLOWED_AUD", "").strip()
    if not raw_value:
        return None

    audiences = [item.strip() for item in raw_value.split(",") if item.strip()]
    return audiences or None


@lru_cache(maxsize=4)
def get_jwks_client(jwks_url: str) -> PyJWKClient:
    """Reuse the JWKS client so we do not refetch keys on every request."""
    return PyJWKClient(jwks_url)


def build_decode_kwargs(algorithms: list[str]) -> Dict[str, Any]:
    """Build shared JWT verification options from environment settings."""
    audiences = get_allowed_audience()
    kwargs: Dict[str, Any] = {
        "algorithms": algorithms,
        "options": {
            "verify_signature": True,
            "verify_exp": True,
            "verify_aud": bool(audiences),
        },
    }

    issuer = get_allowed_issuer()
    if issuer:
        kwargs["issuer"] = issuer

    if audiences:
        kwargs["audience"] = audiences if len(audiences) > 1 else audiences[0]

    return kwargs


def extract_token(req: HttpRequest) -> str:
    """
    Extract the JWT token from the Authorization header.

    Expected format: Bearer <token>
    """
    auth_header = req.headers.get("Authorization") or req.headers.get("authorization")

    if not auth_header:
        raise AuthError("Missing Authorization header")

    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise AuthError("Invalid Authorization header format. Expected 'Bearer <token>'")

    return parts[1]


def get_token_algorithm(token: str) -> str:
    """Read the JWT algorithm from the unverified header."""
    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as e:
        raise AuthError(f"Invalid token header: {str(e)}") from e

    algorithm = header.get("alg")
    if not algorithm:
        raise AuthError("Token header is missing alg")

    return algorithm


def validate_hs256_jwt(token: str) -> Dict[str, Any]:
    """Validate a shared-secret JWT."""
    return jwt.decode(
        token,
        get_jwt_secret(),
        **build_decode_kwargs(["HS256"]),
    )


def validate_asymmetric_jwt(token: str, algorithm: str) -> Dict[str, Any]:
    """Validate an ES256/RS256 JWT using the project's JWKS."""
    if algorithm not in SUPPORTED_ASYMMETRIC_ALGORITHMS:
        raise AuthError(f"Unsupported asymmetric token algorithm: {algorithm}")

    jwks_url = get_jwks_url()
    signing_key = get_jwks_client(jwks_url).get_signing_key_from_jwt(token)

    return jwt.decode(
        token,
        signing_key.key,
        **build_decode_kwargs([algorithm]),
    )


def introspect_token_with_supabase(token: str) -> Dict[str, Any]:
    """
    Ask Supabase Auth to validate the token and return the authenticated user.

    This is a safe fallback for local environments where asymmetric crypto
    primitives are unavailable or the Python worker has not been rebuilt yet.
    """
    auth_user_url = f"{get_supabase_url()}/auth/v1/user"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": get_supabase_anon_key(),
    }

    try:
        response = requests.get(
            auth_user_url,
            headers=headers,
            timeout=DEFAULT_INTROSPECTION_TIMEOUT_SECONDS,
        )
    except requests.RequestException as e:
        raise AuthError(f"Token introspection failed: {str(e)}") from e

    if response.status_code != 200:
        raise AuthError("Authentication required")

    try:
        user_payload = response.json()
    except ValueError as e:
        raise AuthError("Token introspection returned invalid JSON") from e

    if not isinstance(user_payload, dict):
        raise AuthError("Token introspection returned an unexpected payload")

    user_id = user_payload.get("id")
    if not user_id:
        raise AuthError("Authenticated user ID missing from introspection response")

    normalized_payload = dict(user_payload)
    normalized_payload.setdefault("sub", user_id)
    normalized_payload.setdefault("role", "authenticated")
    normalized_payload.setdefault("aud", "authenticated")

    return normalized_payload


def validate_jwt(token: str) -> Dict[str, Any]:
    """
    Validate and decode a Supabase JWT token.

    Supports HS256 tokens signed with the configured shared secret and
    ES256/RS256 tokens signed by keys exposed through Supabase JWKS.
    """
    try:
        algorithm = get_token_algorithm(token)

        if algorithm == "HS256":
            return validate_hs256_jwt(token)

        if algorithm in SUPPORTED_ASYMMETRIC_ALGORITHMS:
            try:
                return validate_asymmetric_jwt(token, algorithm)
            except Exception as e:
                logger.warning(
                    "Asymmetric JWT verification failed for %s; falling back to Supabase introspection: %s",
                    algorithm,
                    str(e),
                )
                return introspect_token_with_supabase(token)

        raise AuthError(f"Unsupported token algorithm: {algorithm}")
    except jwt.ExpiredSignatureError:
        raise AuthError("Token has expired")
    except AuthError:
        raise
    except jwt.InvalidTokenError as e:
        logger.error("JWT validation error: %s", str(e))
        raise AuthError(f"Invalid token: {str(e)}") from e
    except Exception as e:
        logger.error("Unexpected error during token validation: %s", str(e))
        raise AuthError(f"Token validation failed: {str(e)}") from e


def get_user_id_from_token(payload: Dict[str, Any]) -> str:
    """
    Extract the user ID from the decoded JWT payload.

    Supabase stores the user ID in the 'sub' (subject) claim.
    """
    user_id = payload.get("sub")
    if not user_id:
        raise AuthError("User ID not found in token payload")
    return user_id


def authenticate_request(req: HttpRequest) -> Tuple[str, Dict[str, Any]]:
    """
    Complete authentication flow: extract, validate, and return user ID.
    """
    try:
        token = extract_token(req)
        payload = validate_jwt(token)
        user_id = get_user_id_from_token(payload)
        return user_id, payload
    except AuthError:
        raise
    except Exception as e:
        logger.error("Unexpected error in authenticate_request: %s", str(e))
        raise AuthError(f"Authentication failed: {str(e)}") from e


def auth_required(f):
    """
    Decorator to protect Azure Function endpoints with JWT authentication.
    """

    @wraps(f)
    def wrapper(req: HttpRequest, *args, **kwargs):
        try:
            user_id, payload = authenticate_request(req)
            req.user_id = user_id
            req.auth_payload = payload
            return f(req, *args, **kwargs)
        except AuthError as e:
            logger.warning("Authentication failed: %s", str(e))
            return {
                "status": 401,
                "body": json.dumps({"error": str(e)}),
            }

    return wrapper
