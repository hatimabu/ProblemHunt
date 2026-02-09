import json
import uuid
import datetime
from typing import Optional, Dict, Any, List
import os
import jwt


def create_response(status_code: int, body: Any, headers: Dict = None) -> Dict:
    """Create a standardized API response"""
    if headers is None:
        headers = {}
    
    return {
        'status_code': status_code,
        'body': body if isinstance(body, str) else json.dumps(body),
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            **headers
        }
    }


def error_response(status_code: int, message: str) -> Dict:
    """Create error response"""
    return create_response(status_code, {
        'error': message,
        'timestamp': datetime.datetime.utcnow().isoformat() + 'Z'
    })


def get_authenticated_user_id(req) -> Optional[str]:
    """Get authenticated user ID from JWT token"""
    auth_header = req.headers.get('Authorization') or req.headers.get('authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.replace('Bearer ', '').strip()
    
    try:
        secret = os.getenv('SUPABASE_JWT_SECRET')
        if not secret:
            return None
        
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        user_id = payload.get('sub')
        return user_id
    except (jwt.PyJWTError, Exception):
        return None


def get_user_id(req) -> str:
    """Get user ID from request (with fallback to IP-based ID)"""
    auth_header = req.headers.get('Authorization') or req.headers.get('authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        # Fallback to IP-based ID
        ip = req.headers.get('X-Forwarded-For') or req.headers.get('X-Real-IP') or 'unknown'
        user_agent = req.headers.get('User-Agent') or 'unknown'
        return _hash_id(f"{ip}-{user_agent}")
    
    try:
        token = auth_header.replace('Bearer ', '').strip()
        secret = os.getenv('SUPABASE_JWT_SECRET')
        if secret:
            payload = jwt.decode(token, secret, algorithms=['HS256'])
            user_id = payload.get('sub')
            if user_id:
                return user_id
    except (jwt.PyJWTError, Exception):
        pass
    
    # Fallback to IP-based ID
    ip = req.headers.get('X-Forwarded-For') or req.headers.get('X-Real-IP') or 'unknown'
    user_agent = req.headers.get('User-Agent') or 'unknown'
    return _hash_id(f"{ip}-{user_agent}")


def _hash_id(value: str) -> str:
    """Create a hash-based ID from string"""
    import hashlib
    return hashlib.md5(value.encode()).hexdigest()[:32]


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
    return datetime.datetime.utcnow().isoformat() + 'Z'


def time_ago(date_string: str) -> str:
    """Calculate time ago string"""
    try:
        date = datetime.datetime.fromisoformat(date_string.replace('Z', '+00:00'))
        now = datetime.datetime.utcnow().replace(tzinfo=None)
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
