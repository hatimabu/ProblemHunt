"""Get Proposals Handler."""

import azure.functions as func

from handlers.marketplace_helpers import (
    get_primary_wallet_address,
    get_wallet_addresses,
    get_proposals_for_problem,
    get_tip_totals_for_proposals,
    json_response,
)


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Get proposals for a problem or job."""
    try:
        problem_id = req.route_params.get('id')

        proposals = get_proposals_for_problem(problem_id)
        tip_totals = get_tip_totals_for_proposals([proposal["id"] for proposal in proposals])
        wallet_cache = {}
        enriched = []

        for proposal in proposals:
            builder_id = proposal.get("builderId")
            if builder_id and builder_id not in wallet_cache:
                wallet_cache[builder_id] = get_wallet_addresses(builder_id)

            enriched.append(
                {
                    **proposal,
                    "builderWalletAddress": (wallet_cache.get(builder_id) or {}).get("solana"),
                    "builderWallets": wallet_cache.get(builder_id) or {},
                    "tipTotal": tip_totals.get(proposal["id"], 0.0),
                }
            )

        return json_response({'proposals': enriched, 'total': len(enriched)})

    except Exception as exc:
        return json_response({'error': 'Failed to fetch proposals', 'details': str(exc)}, 500)
