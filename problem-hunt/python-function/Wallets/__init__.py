"""
Wallets Azure Function  –  GET /api/user/wallets  |  POST /api/user/wallets

GET  – list all wallets linked to the authenticated user
POST – add a new wallet address for a given chain

Request body for POST:
{
  "chain":   "ethereum" | "polygon" | "arbitrum" | "solana",
  "address": "<wallet address>"
}
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import json
import re
import azure.functions as func
from utils import get_authenticated_user_id
from supabase_client import get_supabase_client


# ── validation ────────────────────────────────────────────────────────────────

VALID_CHAINS = {"ethereum", "polygon", "arbitrum", "solana"}

EVM_RE = re.compile(r'^0x[a-fA-F0-9]{40}$')


def _validate_address(chain: str, address: str) -> str | None:
    """Return an error message or None if address is valid."""
    address = address.strip()
    if not address:
        return "address is required"
    if chain in ("ethereum", "polygon", "arbitrum"):
        if not EVM_RE.match(address):
            return "EVM address must be 0x followed by 40 hex characters"
    elif chain == "solana":
        if not (32 <= len(address) <= 44):
            return "Solana address must be 32–44 characters"
    return None


def _json(body, status: int = 200) -> func.HttpResponse:
    return func.HttpResponse(
        json.dumps(body),
        status_code=status,
        mimetype="application/json",
    )


# ── handler ───────────────────────────────────────────────────────────────────

def main(req: func.HttpRequest) -> func.HttpResponse:
    user_id = get_authenticated_user_id(req)
    if not user_id:
        return _json({"error": "Authentication required"}, 401)

    method = req.method.upper()

    # ── GET: list user wallets ────────────────────────────────────────────────
    if method == "GET":
        try:
            sb = get_supabase_client()
            result = (
                sb.table("wallets")
                .select("id, chain, address, is_primary, created_at")
                .eq("user_id", user_id)
                .order("created_at", desc=False)
                .execute()
            )
            return _json({"wallets": result.data})
        except Exception as exc:
            return _json({"error": "Failed to fetch wallets", "details": str(exc)}, 500)

    # ── POST: add wallet ──────────────────────────────────────────────────────
    if method == "POST":
        try:
            body = req.get_json()
        except ValueError:
            return _json({"error": "Invalid JSON body"}, 400)

        chain = (body.get("chain") or "").strip().lower()
        address = (body.get("address") or "").strip()

        if chain not in VALID_CHAINS:
            return _json({"error": f"chain must be one of: {', '.join(sorted(VALID_CHAINS))}"}, 400)

        err = _validate_address(chain, address)
        if err:
            return _json({"error": err}, 400)

        try:
            sb = get_supabase_client()

            # Remove any existing wallet for this user+chain (one per chain rule)
            sb.table("wallets").delete().eq("user_id", user_id).eq("chain", chain).execute()

            result = (
                sb.table("wallets")
                .insert({
                    "user_id": user_id,
                    "chain": chain,
                    "address": address,
                    "is_primary": True,
                })
                .execute()
            )
            return _json(result.data[0] if result.data else {}, 201)

        except Exception as exc:
            details = str(exc)
            if "23505" in details:
                return _json({"error": "This address is already linked to another account."}, 409)
            return _json({"error": "Failed to save wallet", "details": details}, 500)

    return _json({"error": "Method not allowed"}, 405)
