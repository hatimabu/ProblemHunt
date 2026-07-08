import json
import uuid
import datetime
import os
from typing import Optional, Dict, Any, List

from shared.auth import authenticate_request, AuthError


def _utc_now() -> datetime.datetime:
    """Return timezone-aware UTC datetime."""
    return datetime.datetime.now(datetime.timezone.utc)


def create_response(status_code: int, body: Any, headers: Dict = None) -> Dict:
    """Create a standardized API response"""
    if headers is None:
        headers = {}
    allowed_origins = os.getenv("ALLOWED_ORIGINS", "*")
    
    return {
        'status_code': status_code,
        'body': body if isinstance(body, str) else json.dumps(body),
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': allowed_origins,
            **headers
        }
    }


def error_response(status_code: int, message: str) -> Dict:
    """Create error response"""
    return create_response(status_code, {
        'error': message,
        'timestamp': _utc_now().isoformat().replace('+00:00', 'Z')
    })


def get_authenticated_user_id(req) -> Optional[str]:
    """Get authenticated user ID from JWT token"""
    try:
        user_id, _ = authenticate_request(req)
        return user_id
    except AuthError:
        return None


def get_user_id(req) -> Optional[str]:
    """Get authenticated user ID from request."""
    return get_authenticated_user_id(req)


def generate_id() -> str:
    """Generate unique ID"""
    return str(uuid.uuid4())


def validate_required(obj: Dict, fields: List[str]) -> Optional[str]:
    """Validate required fields"""
    missing = [field for field in fields if not obj.get(field)]
    if missing:
        return f"Missing required fields: {', '.join(missing)}"
    return None


def parse_budget_value(budget_string: str) -> int:
    """Parse budget value from string like "$50/month" or "$10/use" """
    import re
    match = re.search(r'\$?(\d+)', budget_string)
    return int(match.group(1)) if match else 0


def get_timestamp() -> str:
    """Get current timestamp"""
    return _utc_now().isoformat().replace('+00:00', 'Z')


def time_ago(date_string: str) -> str:
    """Calculate time ago string"""
    try:
        date = datetime.datetime.fromisoformat(date_string.replace('Z', '+00:00'))
        now = _utc_now().replace(tzinfo=None)
        date_no_tz = date.replace(tzinfo=None)
        seconds = int((now - date_no_tz).total_seconds())
        
        if seconds < 60:
            return 'just now'
        if seconds < 3600:
            return f"{seconds // 60} minutes ago"
        if seconds < 86400:
            return f"{seconds // 3600} hours ago"
        if seconds < 604800:
            return f"{seconds // 86400} days ago"
        return f"{seconds // 604800} weeks ago"
    except Exception:
        return 'unknown'


def parse_requirements(raw_requirements) -> List[str]:
    """Parse requirements from various formats"""
    if isinstance(raw_requirements, list):
        return [str(req).strip() for req in raw_requirements if str(req).strip()]
    elif isinstance(raw_requirements, str):
        return [req.strip() for req in raw_requirements.split('\n') if req.strip()]
    return []
