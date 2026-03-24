"""Mark an accepted job as completed by the builder."""

import azure.functions as func

from handlers.marketplace_helpers import (
    PROBLEM_TYPE_JOB,
    build_problem_link,
    create_notification,
    get_problem,
    get_proposal,
    json_response,
    replace_problem,
)
from utils import get_authenticated_user_id, get_timestamp


def handle(req: func.HttpRequest) -> func.HttpResponse:
    try:
        problem_id = req.route_params.get("id")
        user_id = get_authenticated_user_id(req)

        if not user_id:
            return json_response({"error": "Authentication required"}, 401)

        problem = get_problem(problem_id)
        if not problem:
            return json_response({"error": "Job not found"}, 404)
        if problem.get("type") != PROBLEM_TYPE_JOB:
            return json_response({"error": "Only job posts can be completed"}, 400)
        if problem.get("jobStatus") != "in_progress":
            return json_response({"error": "Only in-progress jobs can be completed"}, 400)

        accepted_proposal_id = problem.get("acceptedProposalId")
        accepted_proposal = get_proposal(accepted_proposal_id) if accepted_proposal_id else None
        if not accepted_proposal:
            return json_response({"error": "Accepted proposal not found"}, 400)
        if accepted_proposal.get("builderId") != user_id:
            return json_response({"error": "Only the accepted builder can mark this job complete"}, 403)

        problem["jobStatus"] = "completed"
        problem["completedAt"] = get_timestamp()
        problem["updatedAt"] = problem["completedAt"]
        replace_problem(problem)

        builder_name = accepted_proposal.get("builderName") or "The builder"
        create_notification(
            problem["authorId"],
            f"{builder_name} marked the job done - review and pay",
            build_problem_link(problem_id),
        )

        return json_response({"job": problem})
    except Exception as exc:
        return json_response({"error": "Failed to mark job complete", "details": str(exc)}, 500)
