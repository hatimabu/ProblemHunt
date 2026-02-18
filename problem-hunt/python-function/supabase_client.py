"""
Shared Supabase client for Python Azure Functions.

Usage:
    from supabase_client import get_supabase_client
    sb = get_supabase_client()
    data = sb.table('wallets').select('*').eq('user_id', uid).execute()
"""

import os
from supabase import create_client, Client

_client: Client | None = None


def get_supabase_client() -> Client:
    """Return a singleton Supabase client using service role key for server-side access."""
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL", "")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")
        if not url or not key:
            raise ValueError(
                "Missing Supabase credentials. "
                "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in local.settings.json."
            )
        _client = create_client(url, key)
    return _client
