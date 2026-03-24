"""Record a completed peer-to-peer SOL job payment."""

from decimal import Decimal, InvalidOperation

import azure.functions as func

from handlers.marketplace_helpers import (
    PROBLEM_TYPE_JOB,
    build_problem_link,
    create_notification,
    get_primary_wallet_address,
    get_problem,
    get_proposal,
    insert_payment_record,
    json_response,
    parse_sol_amount,
    replace_problem,
    replace_proposal,
)
from utils import get_authenticated_user_id, get_timestamp


def _amount_matches(expected: float, provided: float) -> bool:
    try:
        expected_decimal = Decimal(str(expected))
        provided_decimal = Decimal(str(provided))
    except (InvalidOperation, ValueError, TypeError):
        return False
    return abs(expected_decimal - provided_decimal) <= Decimal("0.000001")


def handle(req: func.HttpRequest) -> func.HttpResponse:
    try:
        problem_id = req.route_params.get("id")
        user_id = get_authenticated_user_id(req)
        if not user_id:
            return json_response({"error": "Authentication required"}, 401)

        try:
            data = req.get_json()
        except ValueError:
            return json_response({"error": "Invalid JSON"}, 400)

        tx_hash = str(data.get("txHash") or data.get("tx_hash") or "").strip()
        if not tx_hash:
            return json_response({"error": "txHash is required"}, 400)

        problem = get_problem(problem_id)
        if not problem:
            return json_response({"error": "Job not found"}, 404)
        if problem.get("type") != PROBLEM_TYPE_JOB:
            return json_response({"error": "Only job posts support payout recording"}, 400)
        if problem.get("authorId") != user_id:
            return json_response({"error": "Only the job owner can record payment"}, 403)
        if problem.get("jobStatus") != "completed":
            return json_response({"error": "Jobs must be completed before payment is recorded"}, 400)

        accepted_proposal_id = problem.get("acceptedProposalId")
        accepted_proposal = get_proposal(accepted_proposal_id) if accepted_proposal_id else None
        if not accepted_proposal:
            return json_response({"error": "Accepted proposal not found"}, 400)

        agreed_amount = accepted_proposal.get("proposedPriceSol") or problem.get("budgetSol")
        if agreed_amount is None:
            return json_response({"error": "Agreed SOL amount is missing on the accepted proposal"}, 400)

        provided_amount = parse_sol_amount(data.get("amountSol") or data.get("amount_sol")) or agreed_amount
        if not _amount_matches(agreed_amount, provided_amount):
            return json_response({"error": "Payment amount must match the accepted proposal price"}, 400)

        builder_wallet_address = get_primary_wallet_address(accepted_proposal["builderId"], "solana")
        if not builder_wallet_address:
            return json_response({"error": "The accepted builder has not linked a Solana wallet"}, 400)

        from_wallet_address = str(data.get("fromWalletAddress") or data.get("from_wallet_address") or "").strip() or None

        # TODO: Add escrow smart contract when platform scales
        # TODO: Add platform fee mechanism here if monetization is added later
        payment = insert_payment_record(
            job_id=problem_id,
            from_user_id=user_id,
            to_user_id=accepted_proposal["builderId"],
            amount_sol=provided_amount,
            tx_hash=tx_hash,
            from_wallet_address=from_wallet_address,
            to_wallet_address=builder_wallet_address,
        )

        timestamp = get_timestamp()
        problem["jobStatus"] = "paid"
        problem["paidAt"] = timestamp
        problem["paymentTxHash"] = tx_hash
        problem["updatedAt"] = timestamp
        replace_problem(problem)

        accepted_proposal["paymentTxHash"] = tx_hash
        accepted_proposal["updatedAt"] = timestamp
        replace_proposal(accepted_proposal)

        # TODO: Add builder rating/review after job completion
        create_notification(
            accepted_proposal["builderId"],
            f"Payment received for {problem['title']} \u2705",
            build_problem_link(problem_id),
        )

        return json_response({"payment": payment, "job": problem})
    except Exception as exc:
        details = str(exc)
        status = 409 if "duplicate key" in details.lower() or "23505" in details else 500
        return json_response({"error": "Failed to record payment", "details": details}, status)
