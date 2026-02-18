"""
WalletById Azure Function  –  DELETE /api/user/wallets/{wallet_id}

Removes a wallet that belongs to the authenticated user.
Only the owner can delete their own wallet (enforced server-side).
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import json
import azure.functions as func
from utils import get_authenticated_user_id
from supabase_client import get_supabase_client


def _json(body, status: int = 200) -> func.HttpResponse:
    return func.HttpResponse(
        json.dumps(body),
        status_code=status,
        mimetype="application/json",
    )


def main(req: func.HttpRequest) -> func.HttpResponse:
    user_id = get_authenticated_user_id(req)
    if not user_id:
        return _json({"error": "Authentication required"}, 401)

    wallet_id = req.route_params.get("wallet_id", "").strip()
    if not wallet_id:
        return _json({"error": "wallet_id is required"}, 400)

    try:
        sb = get_supabase_client()

        # Verify ownership before deleting
        check = (
            sb.table("wallets")
            .select("id")
            .eq("id", wallet_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not check.data:
            return _json({"error": "Wallet not found or access denied"}, 404)

        sb.table("wallets").delete().eq("id", wallet_id).eq("user_id", user_id).execute()

        return _json({"deleted": wallet_id})

    except Exception as exc:
        return _json({"error": "Failed to delete wallet", "details": str(exc)}, 500)
