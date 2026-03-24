"""Accept a proposal for a job post."""

import azure.functions as func

from handlers.marketplace_helpers import (
    PROBLEM_TYPE_JOB,
    build_problem_link,
    create_notification,
    get_primary_wallet_address,
    get_problem,
    get_proposal,
    get_proposals_for_problem,
    json_response,
    replace_problem,
    replace_proposal,
)
from utils import get_authenticated_user_id, get_timestamp


def handle(req: func.HttpRequest) -> func.HttpResponse:
    try:
        problem_id = req.route_params.get("id")
        proposal_id = req.route_params.get("proposal_id")
        user_id = get_authenticated_user_id(req)

        if not user_id:
            return json_response({"error": "Authentication required"}, 401)

        problem = get_problem(problem_id)
        if not problem:
            return json_response({"error": "Job not found"}, 404)
        if problem.get("type") != PROBLEM_TYPE_JOB:
            return json_response({"error": "Only job posts support proposal acceptance"}, 400)
        if problem.get("authorId") != user_id:
            return json_response({"error": "Only the job owner can accept a proposal"}, 403)
        if problem.get("jobStatus") != "open":
            return json_response({"error": "Only open jobs can accept a proposal"}, 400)

        accepted_proposal = get_proposal(proposal_id)
        if not accepted_proposal or accepted_proposal.get("problemId") != problem_id:
            return json_response({"error": "Proposal not found for this job"}, 404)

        timestamp = get_timestamp()
        proposals = get_proposals_for_problem(problem_id)
        for proposal in proposals:
            proposal["status"] = "accepted" if proposal["id"] == proposal_id else "rejected"
            proposal["updatedAt"] = timestamp
            replace_proposal(proposal)

        problem["acceptedProposalId"] = proposal_id
        problem["acceptedBuilderId"] = accepted_proposal.get("builderId")
        problem["acceptedBuilderName"] = accepted_proposal.get("builderName")
        problem["acceptedBuilderWalletAddress"] = get_primary_wallet_address(accepted_proposal.get("builderId"), "solana")
        problem["jobStatus"] = "in_progress"
        problem["updatedAt"] = timestamp
        replace_problem(problem)

        create_notification(
            accepted_proposal["builderId"],
            "Your proposal was accepted! Get to work \ud83d\ude80",
            build_problem_link(problem_id),
        )

        return json_response(
            {
                "job": problem,
                "acceptedProposal": get_proposal(proposal_id),
            }
        )
    except Exception as exc:
        return json_response({"error": "Failed to accept proposal", "details": str(exc)}, 500)
