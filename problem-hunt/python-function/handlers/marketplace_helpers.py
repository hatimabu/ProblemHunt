"""Shared helpers for the Cosmos-backed marketplace and Supabase side tables."""

from __future__ import annotations

import json
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Dict, Iterable, List, Optional

import azure.functions as func

from cosmos import containers
from supabase_client import get_supabase_client
from utils import get_timestamp


PROBLEM_TYPE_PROBLEM = "problem"
PROBLEM_TYPE_JOB = "job"
JOB_STATUSES = {"open", "in_progress", "completed", "paid"}
PROPOSAL_STATUSES = {"pending", "accepted", "rejected"}
VALID_JOB_TYPES = {"one-time", "contract", "ongoing"}
VALID_TIP_CHAINS = {"ethereum", "polygon", "arbitrum", "solana"}


def json_response(body: Any, status: int = 200) -> func.HttpResponse:
    return func.HttpResponse(
        json.dumps(body),
        status_code=status,
        mimetype="application/json",
    )


def query_items(container_name: str, query: str, parameters: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    return list(
        containers[container_name].query_items(
            query=query,
            parameters=parameters or [],
            enable_cross_partition_query=True,
        )
    )


def get_problem(problem_id: str) -> Optional[Dict[str, Any]]:
    problems = query_items(
        "problems",
        "SELECT * FROM c WHERE c.id = @id",
        [{"name": "@id", "value": problem_id}],
    )
    return normalize_problem(problems[0]) if problems else None


def get_proposal(proposal_id: str) -> Optional[Dict[str, Any]]:
    proposals = query_items(
        "proposals",
        "SELECT * FROM c WHERE c.id = @id",
        [{"name": "@id", "value": proposal_id}],
    )
    return normalize_proposal(proposals[0]) if proposals else None


def get_proposals_for_problem(problem_id: str) -> List[Dict[str, Any]]:
    proposals = query_items(
        "proposals",
        "SELECT * FROM c WHERE c.problemId = @problemId ORDER BY c.createdAt DESC",
        [{"name": "@problemId", "value": problem_id}],
    )
    return [normalize_proposal(proposal) for proposal in proposals]


def replace_problem(problem: Dict[str, Any]) -> Dict[str, Any]:
    normalized = normalize_problem(problem)
    containers["problems"].replace_item(normalized["id"], normalized)
    return normalized


def replace_proposal(proposal: Dict[str, Any]) -> Dict[str, Any]:
    normalized = normalize_proposal(proposal)
    containers["proposals"].replace_item(normalized["id"], normalized)
    return normalized


def delete_document(container_name: str, document_id: str) -> None:
    containers[container_name].delete_item(document_id, document_id)


def delete_problem_related_documents(problem_id: str) -> None:
    proposals = get_proposals_for_problem(problem_id)
    proposal_ids = {proposal["id"] for proposal in proposals}

    upvotes = query_items(
        "upvotes",
        "SELECT * FROM c WHERE c.problemId = @problemId",
        [{"name": "@problemId", "value": problem_id}],
    )
    tips = query_items(
        "tips",
        "SELECT * FROM c WHERE c.problemId = @problemId",
        [{"name": "@problemId", "value": problem_id}],
    )

    if not tips and proposal_ids:
        all_tips = query_items("tips", "SELECT * FROM c")
        tips = [tip for tip in all_tips if tip.get("proposalId") in proposal_ids]

    for proposal in proposals:
        delete_document("proposals", proposal["id"])

    for upvote in upvotes:
        delete_document("upvotes", upvote["id"])

    for tip in tips:
        delete_document("tips", tip["id"])


def parse_problem_type(raw_value: Any) -> str:
    value = str(raw_value or PROBLEM_TYPE_PROBLEM).strip().lower()
    return PROBLEM_TYPE_JOB if value == PROBLEM_TYPE_JOB else PROBLEM_TYPE_PROBLEM


def parse_job_type(raw_value: Any) -> Optional[str]:
    value = str(raw_value or "").strip().lower()
    return value if value in VALID_JOB_TYPES else None


def parse_string_list(raw_value: Any) -> List[str]:
    if isinstance(raw_value, list):
        return [str(item).strip() for item in raw_value if str(item).strip()]
    if isinstance(raw_value, str):
        separators = [",", "\n"]
        values = [raw_value]
        for separator in separators:
            next_values: List[str] = []
            for value in values:
                next_values.extend(value.split(separator))
            values = next_values
        return [value.strip() for value in values if value.strip()]
    return []


def parse_optional_text(raw_value: Any) -> Optional[str]:
    if raw_value is None:
        return None
    value = str(raw_value).strip()
    return value or None


def parse_sol_amount(raw_value: Any) -> Optional[float]:
    if raw_value in (None, ""):
        return None

    try:
        amount = Decimal(str(raw_value)).quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError, TypeError):
        return None

    if amount <= 0:
        return None

    return float(amount)


def sol_amount_to_string(raw_value: Any) -> Optional[str]:
    amount = parse_sol_amount(raw_value)
    if amount is None:
        return None
    normalized = format(Decimal(str(amount)).normalize(), "f").rstrip("0").rstrip(".")
    return normalized or "0"


def normalize_problem(problem: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(problem)
    problem_type = parse_problem_type(normalized.get("type"))

    normalized["type"] = problem_type
    normalized["requirements"] = parse_string_list(normalized.get("requirements"))
    normalized["upvotes"] = int(normalized.get("upvotes", 0) or 0)
    normalized["proposals"] = int(normalized.get("proposals", 0) or 0)
    normalized["deadline"] = parse_optional_text(normalized.get("deadline"))
    normalized["acceptedProposalId"] = normalized.get("acceptedProposalId") or normalized.get("accepted_proposal_id")
    normalized["createdAt"] = normalized.get("createdAt") or get_timestamp()
    normalized["updatedAt"] = normalized.get("updatedAt") or normalized["createdAt"]

    job_type = parse_job_type(normalized.get("jobType") or normalized.get("job_type"))
    budget_sol = parse_sol_amount(normalized.get("budgetSol") or normalized.get("budget_sol"))
    skills_required = parse_string_list(normalized.get("skillsRequired") or normalized.get("skills_required"))

    normalized["jobType"] = job_type
    normalized["budgetSol"] = budget_sol
    normalized["skillsRequired"] = skills_required

    if problem_type == PROBLEM_TYPE_JOB:
        normalized["jobStatus"] = normalized.get("jobStatus") or normalized.get("job_status") or "open"
        if normalized["jobStatus"] not in JOB_STATUSES:
            normalized["jobStatus"] = "open"

        if budget_sol is not None:
            normalized["budgetValue"] = budget_sol
            normalized["budget"] = normalized.get("budget") or f"{sol_amount_to_string(budget_sol)} SOL"
        else:
            normalized["budgetValue"] = normalized.get("budgetValue")
            normalized["budget"] = normalized.get("budget") or ""
    else:
        normalized["jobStatus"] = normalized.get("jobStatus") or None
        normalized["budget"] = normalized.get("budget") or ""
        normalized["budgetValue"] = normalized.get("budgetValue", 0)

    return normalized


def normalize_proposal(proposal: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(proposal)
    normalized["status"] = str(normalized.get("status") or "pending").strip().lower()
    if normalized["status"] not in PROPOSAL_STATUSES:
        normalized["status"] = "pending"

    normalized["briefSolution"] = normalized.get("briefSolution") or normalized.get("description") or ""
    normalized["expertise"] = parse_string_list(normalized.get("expertise"))
    normalized["timeline"] = parse_optional_text(normalized.get("timeline"))
    normalized["cost"] = parse_optional_text(normalized.get("cost"))
    normalized["estimatedDelivery"] = parse_optional_text(
        normalized.get("estimatedDelivery") or normalized.get("estimated_delivery")
    )
    normalized["proposedPriceSol"] = parse_sol_amount(
        normalized.get("proposedPriceSol") or normalized.get("proposed_price_sol")
    )
    normalized["createdAt"] = normalized.get("createdAt") or get_timestamp()
    normalized["updatedAt"] = normalized.get("updatedAt") or normalized["createdAt"]
    return normalized


def get_profile(user_id: str) -> Optional[Dict[str, Any]]:
    sb = get_supabase_client()
    response = (
        sb.table("profiles")
        .select("user_id, username, full_name, wallet_address")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    return response.data[0] if response.data else None


def get_display_name(user_id: str, fallback: Optional[str] = None) -> str:
    profile = get_profile(user_id)
    if profile:
        return profile.get("full_name") or profile.get("username") or fallback or "Anonymous Builder"
    return fallback or "Anonymous Builder"


def get_primary_wallet_address(user_id: str, chain: str = "solana") -> Optional[str]:
    profile = get_profile(user_id)
    if chain == "solana" and profile and profile.get("wallet_address"):
        return profile["wallet_address"]

    sb = get_supabase_client()
    response = (
        sb.table("wallets")
        .select("address, is_primary, created_at")
        .eq("user_id", user_id)
        .eq("chain", chain)
        .order("is_primary", desc=True)
        .order("created_at", desc=False)
        .limit(1)
        .execute()
    )
    return response.data[0]["address"] if response.data else None


def get_wallet_addresses(user_id: str) -> Dict[str, str]:
    wallets: Dict[str, str] = {}
    profile = get_profile(user_id)
    if profile and profile.get("wallet_address"):
        wallets["solana"] = profile["wallet_address"]

    sb = get_supabase_client()
    response = (
        sb.table("wallets")
        .select("chain, address, is_primary, created_at")
        .eq("user_id", user_id)
        .order("is_primary", desc=True)
        .order("created_at", desc=False)
        .execute()
    )

    for wallet in response.data or []:
        wallets.setdefault(wallet["chain"], wallet["address"])

    return wallets


def sync_profile_wallet_address(user_id: str, wallet_address: Optional[str]) -> None:
    sb = get_supabase_client()
    (
        sb.table("profiles")
        .update({"wallet_address": wallet_address})
        .eq("user_id", user_id)
        .execute()
    )


def create_notification(user_id: str, message: str, link: Optional[str] = None) -> None:
    # TODO: Add email notifications
    sb = get_supabase_client()
    (
        sb.table("notifications")
        .insert(
            {
                "user_id": user_id,
                "message": message,
                "link": link,
            }
        )
        .execute()
    )


def insert_payment_record(
    *,
    job_id: str,
    from_user_id: str,
    to_user_id: str,
    amount_sol: float,
    tx_hash: str,
    from_wallet_address: Optional[str],
    to_wallet_address: Optional[str],
) -> Dict[str, Any]:
    sb = get_supabase_client()
    response = (
        sb.table("payments")
        .insert(
            {
                "job_id": job_id,
                "from_user_id": from_user_id,
                "to_user_id": to_user_id,
                "amount_sol": amount_sol,
                "tx_hash": tx_hash,
                "from_wallet_address": from_wallet_address,
                "to_wallet_address": to_wallet_address,
            }
        )
        .execute()
    )
    return response.data[0] if response.data else {}


def insert_tip_transaction_record(
    *,
    proposal_id: str,
    problem_id: Optional[str],
    builder_id: Optional[str],
    tipper_id: str,
    amount: float,
    currency: str,
    chain: str,
    tx_hash: str,
    to_wallet_address: Optional[str],
    message: Optional[str],
) -> Optional[Dict[str, Any]]:
    if not tx_hash:
        return None

    sb = get_supabase_client()
    response = (
        sb.table("tip_transactions")
        .insert(
            {
                "proposal_id": proposal_id,
                "problem_id": problem_id,
                "builder_id": builder_id,
                "tipper_id": tipper_id,
                "amount": amount,
                "currency": currency,
                "chain": chain,
                "tx_hash": tx_hash,
                "to_wallet_address": to_wallet_address,
                "message": message,
            }
        )
        .execute()
    )
    return response.data[0] if response.data else None


def get_tip_totals_for_proposals(proposal_ids: Iterable[str]) -> Dict[str, float]:
    proposal_id_set = {proposal_id for proposal_id in proposal_ids if proposal_id}
    if not proposal_id_set:
        return {}

    tips = query_items("tips", "SELECT * FROM c")
    totals: Dict[str, float] = {}
    for tip in tips:
        proposal_id = tip.get("proposalId")
        if proposal_id not in proposal_id_set:
            continue
        totals[proposal_id] = totals.get(proposal_id, 0.0) + float(tip.get("amount", 0) or 0)
    return totals


def build_problem_link(problem_id: str) -> str:
    return f"/problem/{problem_id}"
