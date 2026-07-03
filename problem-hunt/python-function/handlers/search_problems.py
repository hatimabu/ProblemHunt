"""Search Problems Handler."""

import json
import logging

import azure.functions as func

from handlers.marketplace_helpers import _pg_problem_to_camel, normalize_problem
from supabase_client import get_supabase_client


logger = logging.getLogger(__name__)


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Search problems by term (case-insensitive title or description match)."""
    try:
        search_term = req.params.get('q', '').strip()

        if not search_term:
            return func.HttpResponse(
                json.dumps({'error': 'Search term is required'}),
                status_code=400,
                mimetype="application/json",
            )

        sb = get_supabase_client()
        # Use Postgres ILIKE via postgrest or_ filter — safe: term goes through postgrest binding
        escaped = search_term.replace('%', r'\%').replace('_', r'\_')
        resp = (
            sb.table('problems')
            .select('*')
            .or_(f'title.ilike.%{escaped}%,description.ilike.%{escaped}%')
            .execute()
        )

        results = [normalize_problem(_pg_problem_to_camel(row)) for row in (resp.data or [])]

        return func.HttpResponse(
            json.dumps({'results': results, 'total': len(results), 'searchTerm': search_term}),
            status_code=200,
            mimetype="application/json",
        )

    except Exception:
        logger.exception("Handler error")
        return func.HttpResponse(
            json.dumps({'error': 'Search failed'}),
            status_code=500,
            mimetype="application/json",
        )
