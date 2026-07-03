"""Shared helpers for the Supabase-Postgres-backed marketplace."""

from __future__ import annotations

import json
import logging
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Dict, Iterable, List, Optional

import azure.functions as func

from supabase_client import get_supabase_client
from utils import get_timestamp


logger = logging.getLogger(__name__)


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


# ─── snake_case ↔ camelCase converters ────────────────────────────────────────

def _pg_problem_to_camel(row: Dict[str, Any]) -> Dict[str, Any]:
    """Map a snake_case Postgres problems row to the camelCase shape normalize_problem expects."""
    if not row:
        return {}
    return {
        "id": row.get("id"),
        "type": row.get("type"),
        "title": row.get("title"),
        "description": row.get("description"),
        "requirements": row.get("requirements") or [],
        "category": row.get("category"),
        "upvotes": row.get("upvotes", 0),
        "proposals": row.get("proposals", 0),
        "author": row.get("author"),
        "authorId": row.get("author_id"),
        "deadline": row.get("deadline"),
        "budget": row.get("budget"),
        "budgetSol": row.get("budget_sol"),
        "budgetValue": row.get("budget_value"),
        "jobType": row.get("job_type"),
        "skillsRequired": row.get("skills_required") or [],
        "jobStatus": row.get("job_status"),
        "acceptedProposalId": row.get("accepted_proposal_id"),
        "acceptedBuilderId": row.get("accepted_builder_id"),
        "acceptedBuilderName": row.get("accepted_builder_name"),
        "acceptedBuilderWalletAddress": row.get("accepted_builder_wallet_address"),
        "completedAt": row.get("completed_at"),
        "paidAt": row.get("paid_at"),
        "paymentTxHash": row.get("payment_tx_hash"),
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


def _problem_insert_row(problem: Dict[str, Any]) -> Dict[str, Any]:
    """camelCase problem dict → snake_case dict for Postgres INSERT."""
    return {
        "id": problem.get("id"),
        "type": problem.get("type"),
        "title": problem.get("title"),
        "description": problem.get("description"),
        "requirements": problem.get("requirements") or [],
        "category": problem.get("category"),
        "upvotes": problem.get("upvotes", 0),
        "proposals": problem.get("proposals", 0),
        "author": problem.get("author"),
        "author_id": problem.get("authorId"),
        "deadline": problem.get("deadline"),
        "budget": problem.get("budget"),
        "budget_sol": problem.get("budgetSol"),
        "budget_value": problem.get("budgetValue"),
        "job_type": problem.get("jobType"),
        "skills_required": problem.get("skillsRequired") or [],
        "job_status": problem.get("jobStatus"),
        "accepted_proposal_id": problem.get("acceptedProposalId"),
        "accepted_builder_id": problem.get("acceptedBuilderId"),
        "accepted_builder_name": problem.get("acceptedBuilderName"),
        "accepted_builder_wallet_address": problem.get("acceptedBuilderWalletAddress"),
        "completed_at": problem.get("completedAt"),
        "paid_at": problem.get("paidAt"),
        "payment_tx_hash": problem.get("paymentTxHash"),
        "created_at": problem.get("createdAt"),
        "updated_at": problem.get("updatedAt"),
    }


def _problem_update_row(problem: Dict[str, Any]) -> Dict[str, Any]:
    """camelCase problem dict → snake_case dict for Postgres UPDATE (no id/created_at)."""
    return {
        "type": problem.get("type"),
        "title": problem.get("title"),
        "description": problem.get("description"),
        "requirements": problem.get("requirements") or [],
        "category": problem.get("category"),
        "author": problem.get("author"),
        "deadline": problem.get("deadline"),
        "budget": problem.get("budget"),
        "budget_sol": problem.get("budgetSol"),
        "budget_value": problem.get("budgetValue"),
        "job_type": problem.get("jobType"),
        "skills_required": problem.get("skillsRequired") or [],
        "job_status": problem.get("jobStatus"),
        "accepted_proposal_id": problem.get("acceptedProposalId"),
        "accepted_builder_id": problem.get("acceptedBuilderId"),
        "accepted_builder_name": problem.get("acceptedBuilderName"),
        "accepted_builder_wallet_address": problem.get("acceptedBuilderWalletAddress"),
        "completed_at": problem.get("completedAt"),
        "paid_at": problem.get("paidAt"),
        "payment_tx_hash": problem.get("paymentTxHash"),
        "updated_at": problem.get("updatedAt"),
    }


def _pg_proposal_to_camel(row: Dict[str, Any]) -> Dict[str, Any]:
    """Map a snake_case Postgres proposals row to the camelCase shape normalize_proposal expects."""
    if not row:
        return {}
    return {
        "id": row.get("id"),
        "problemId": row.get("problem_id"),
        "title": row.get("title"),
        "description": row.get("description"),
        "projectUrl": row.get("project_url"),
        "builderId": row.get("builder_id"),
        "builderName": row.get("builder_name"),
        "briefSolution": row.get("brief_solution"),
        "timeline": row.get("timeline"),
        "cost": row.get("cost"),
        "expertise": row.get("expertise") or [],
        "status": row.get("status", "pending"),
        "proposedPriceSol": row.get("proposed_price_sol"),
        "estimatedDelivery": row.get("estimated_delivery"),
        "paymentTxHash": row.get("payment_tx_hash"),
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


def _proposal_insert_row(proposal: Dict[str, Any]) -> Dict[str, Any]:
    """camelCase proposal dict → snake_case dict for Postgres INSERT."""
    return {
        "id": proposal.get("id"),
        "problem_id": proposal.get("problemId"),
        "title": proposal.get("title"),
        "description": proposal.get("description"),
        "project_url": proposal.get("projectUrl"),
        "builder_id": proposal.get("builderId"),
        "builder_name": proposal.get("builderName"),
        "brief_solution": proposal.get("briefSolution"),
        "timeline": proposal.get("timeline"),
        "cost": proposal.get("cost"),
        "expertise": proposal.get("expertise") or [],
        "status": proposal.get("status", "pending"),
        "proposed_price_sol": proposal.get("proposedPriceSol"),
        "estimated_delivery": proposal.get("estimatedDelivery"),
        "payment_tx_hash": proposal.get("paymentTxHash"),
        "created_at": proposal.get("createdAt"),
        "updated_at": proposal.get("updatedAt"),
    }


def _proposal_update_row(proposal: Dict[str, Any]) -> Dict[str, Any]:
    """camelCase proposal dict → snake_case dict for Postgres UPDATE (no id/created_at)."""
    return {
        "problem_id": proposal.get("problemId"),
        "title": proposal.get("title"),
        "description": proposal.get("description"),
        "project_url": proposal.get("projectUrl"),
        "builder_id": proposal.get("builderId"),
        "builder_name": proposal.get("builderName"),
        "brief_solution": proposal.get("briefSolution"),
        "timeline": proposal.get("timeline"),
        "cost": proposal.get("cost"),
        "expertise": proposal.get("expertise") or [],
        "status": proposal.get("status", "pending"),
        "proposed_price_sol": proposal.get("proposedPriceSol"),
        "estimated_delivery": proposal.get("estimatedDelivery"),
        "payment_tx_hash": proposal.get("paymentTxHash"),
        "updated_at": proposal.get("updatedAt"),
    }


# ─── marketplace DB helpers ────────────────────────────────────────────────────

def get_problem(problem_id: str) -> Optional[Dict[str, Any]]:
    try:
        sb = get_supabase_client()
        resp = sb.table("problems").select("*").eq("id", problem_id).limit(1).execute()
        return normalize_problem(_pg_problem_to_camel(resp.data[0])) if resp.data else None
    except Exception as e:
        logger.warning("get_problem failed for %s: %s", problem_id, e)
        return None


def get_proposal(proposal_id: str) -> Optional[Dict[str, Any]]:
    try:
        sb = get_supabase_client()
        resp = sb.table("proposals").select("*").eq("id", proposal_id).limit(1).execute()
        return normalize_proposal(_pg_proposal_to_camel(resp.data[0])) if resp.data else None
    except Exception as e:
        logger.warning("get_proposal failed for %s: %s", proposal_id, e)
        return None


def get_proposals_for_problem(problem_id: str) -> List[Dict[str, Any]]:
    try:
        sb = get_supabase_client()
        resp = (
            sb.table("proposals")
            .select("*")
            .eq("problem_id", problem_id)
            .order("created_at", desc=True)
            .execute()
        )
        return [normalize_proposal(_pg_proposal_to_camel(row)) for row in (resp.data or [])]
    except Exception as e:
        logger.warning("get_proposals_for_problem failed for %s: %s", problem_id, e)
        return []


def replace_problem(problem: Dict[str, Any]) -> Dict[str, Any]:
    normalized = normalize_problem(problem)
    try:
        sb = get_supabase_client()
        resp = (
            sb.table("problems")
            .update(_problem_update_row(normalized))
            .eq("id", normalized["id"])
            .execute()
        )
        if resp.data:
            return normalize_problem(_pg_problem_to_camel(resp.data[0]))
    except Exception as e:
        logger.warning("replace_problem failed for %s: %s", normalized.get("id"), e)
    return normalized


def replace_proposal(proposal: Dict[str, Any]) -> Dict[str, Any]:
    normalized = normalize_proposal(proposal)
    try:
        sb = get_supabase_client()
        resp = (
            sb.table("proposals")
            .update(_proposal_update_row(normalized))
            .eq("id", normalized["id"])
            .execute()
        )
        if resp.data:
            return normalize_proposal(_pg_proposal_to_camel(resp.data[0]))
    except Exception as e:
        logger.warning("replace_proposal failed for %s: %s", normalized.get("id"), e)
    return normalized


def delete_document(container_name: str, document_id: str) -> None:
    try:
        sb = get_supabase_client()
        sb.table(container_name).delete().eq("id", document_id).execute()
    except Exception as e:
        logger.warning("delete_document failed for %s/%s: %s", container_name, document_id, e)


def delete_problem_related_documents(problem_id: str) -> None:
    """Delete tips for a problem (proposals/upvotes cascade when problem is deleted)."""
    try:
        sb = get_supabase_client()
        # Collect proposal ids so we catch any tips whose problem_id is NULL
        proposals_resp = sb.table("proposals").select("id").eq("problem_id", problem_id).execute()
        proposal_ids = [r["id"] for r in (proposals_resp.data or [])]
        if proposal_ids:
            sb.table("tips").delete().in_("proposal_id", proposal_ids).execute()
        sb.table("tips").delete().eq("problem_id", problem_id).execute()
    except Exception as e:
        logger.warning("delete_problem_related_documents failed for %s: %s", problem_id, e)


def get_tip_totals_for_proposals(proposal_ids: Iterable[str]) -> Dict[str, float]:
    proposal_id_list = [pid for pid in proposal_ids if pid]
    if not proposal_id_list:
        return {}
    try:
        sb = get_supabase_client()
        resp = (
            sb.table("tips")
            .select("proposal_id, amount")
            .in_("proposal_id", proposal_id_list)
            .execute()
        )
        totals: Dict[str, float] = {}
        for row in (resp.data or []):
            pid = row.get("proposal_id")
            if pid:
                totals[pid] = totals.get(pid, 0.0) + float(row.get("amount", 0) or 0)
        return totals
    except Exception as e:
        logger.warning("get_tip_totals_for_proposals failed: %s", e)
        return {}


# ─── parsing / normalization ───────────────────────────────────────────────────

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


# ─── Supabase side-table helpers (profiles, wallets, notifications, payments) ──

def get_profile(user_id: str) -> Optional[Dict[str, Any]]:
    try:
        sb = get_supabase_client()
        response = (
            sb.table("profiles")
            .select("user_id, username, full_name, wallet_address")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None
    except Exception as e:
        logger.warning("get_profile failed for %s: %s", user_id, e)
        return None


def get_display_name(user_id: str, fallback: Optional[str] = None) -> str:
    try:
        profile = get_profile(user_id)
        if profile:
            return profile.get("full_name") or profile.get("username") or fallback or "Anonymous Builder"
    except Exception as e:
        logger.warning("get_display_name failed for %s: %s", user_id, e)
    return fallback or "Anonymous Builder"


def get_primary_wallet_address(user_id: str, chain: str = "solana") -> Optional[str]:
    try:
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
    except Exception as e:
        logger.warning("get_primary_wallet_address failed for %s (%s): %s", user_id, chain, e)
        return None


def get_wallet_addresses(user_id: str) -> Dict[str, str]:
    wallets: Dict[str, str] = {}
    try:
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
    except Exception as e:
        logger.warning("get_wallet_addresses failed for %s: %s", user_id, e)

    return wallets


def sync_profile_wallet_address(user_id: str, wallet_address: Optional[str]) -> None:
    try:
        sb = get_supabase_client()
        (
            sb.table("profiles")
            .update({"wallet_address": wallet_address})
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as e:
        logger.warning("sync_profile_wallet_address failed for %s: %s", user_id, e)


def create_notification(user_id: str, message: str, link: Optional[str] = None) -> None:
    # TODO: Add email notifications
    try:
        sb = get_supabase_client()
        (
            sb.table("notifications")
            .insert({"user_id": user_id, "message": message, "link": link})
            .execute()
        )
    except Exception as e:
        logger.warning("create_notification failed for %s: %s", user_id, e)


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
    try:
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
    except Exception as e:
        logger.warning("insert_payment_record failed: %s", e)
        return {
            "job_id": job_id,
            "from_user_id": from_user_id,
            "to_user_id": to_user_id,
            "amount_sol": amount_sol,
            "tx_hash": tx_hash,
            "from_wallet_address": from_wallet_address,
            "to_wallet_address": to_wallet_address,
        }


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
    try:
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
    except Exception as e:
        logger.warning("insert_tip_transaction_record failed: %s", e)
        return None


def build_problem_link(problem_id: str) -> str:
    return f"/problem/{problem_id}"
