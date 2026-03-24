"""Tip Builder Handler."""

import azure.functions as func

from cosmos import containers
from handlers.marketplace_helpers import (
    VALID_TIP_CHAINS,
    get_primary_wallet_address,
    get_proposal,
    insert_tip_transaction_record,
    json_response,
)
from utils import generate_id, get_authenticated_user_id, get_timestamp


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Create a tip for a proposal and persist tx metadata when provided."""
    try:
        proposal_id = req.route_params.get('id')
        user_id = get_authenticated_user_id(req)

        if not user_id:
            return json_response({'error': 'Authentication required'}, 401)

        try:
            data = req.get_json()
        except ValueError:
            return json_response({'error': 'Invalid JSON'}, 400)

        try:
            amount = float(data.get('amount', 0))
            if amount <= 0:
                raise ValueError("Amount must be greater than 0")
        except (ValueError, TypeError):
            return json_response({'error': 'Valid amount is required'}, 400)

        proposal = get_proposal(proposal_id)
        if not proposal:
            return json_response({'error': 'Proposal not found'}, 404)

        chain = str(data.get("chain") or "solana").strip().lower()
        if chain not in VALID_TIP_CHAINS:
            return json_response({'error': 'Unsupported chain'}, 400)

        currency = str(data.get("currency") or chain.upper()).strip().upper()
        tx_hash = str(data.get("txHash") or data.get("tx_hash") or "").strip()
        fallback_wallet = get_primary_wallet_address(proposal.get("builderId"), chain)
        to_wallet = str(data.get("toWallet") or "").strip() or fallback_wallet
        if to_wallet == proposal.get("builderId"):
            to_wallet = fallback_wallet

        tip = {
            'id': generate_id(),
            'proposalId': proposal_id,
            'problemId': proposal.get('problemId'),
            'builderId': proposal.get('builderId'),
            'tipperId': user_id,
            'amount': amount,
            'message': data.get('message'),
            'currency': currency,
            'chain': chain,
            'txHash': tx_hash or None,
            'toWallet': to_wallet,
            'createdAt': get_timestamp()
        }

        containers['tips'].create_item(body=tip)

        if tx_hash:
            insert_tip_transaction_record(
                proposal_id=proposal_id,
                problem_id=proposal.get("problemId"),
                builder_id=proposal.get("builderId"),
                tipper_id=user_id,
                amount=amount,
                currency=currency,
                chain=chain,
                tx_hash=tx_hash,
                to_wallet_address=to_wallet,
                message=data.get("message"),
            )

        return json_response(tip, 201)

    except Exception as exc:
        return json_response({'error': 'Internal server error', 'details': str(exc)}, 500)
