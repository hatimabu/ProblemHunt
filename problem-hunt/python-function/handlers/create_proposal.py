"""Create Proposal Handler."""

import logging

import azure.functions as func

from cosmos import containers
from handlers.marketplace_helpers import (
    PROBLEM_TYPE_JOB,
    build_problem_link,
    create_notification,
    get_display_name,
    get_problem,
    json_response,
    normalize_proposal,
    parse_sol_amount,
    parse_string_list,
    sol_amount_to_string,
)
from utils import generate_id, get_authenticated_user_id, get_timestamp, validate_required


logger = logging.getLogger(__name__)


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Create a new proposal for a problem or job."""
    try:
        problem_id = req.route_params.get('id')
        user_id = get_authenticated_user_id(req)

        if not user_id:
            return json_response({'error': 'Authentication required'}, 401)

        try:
            data = req.get_json()
        except ValueError:
            return json_response({'error': 'Invalid JSON'}, 400)

        validation_error = validate_required(data, ['title', 'description'])
        if validation_error:
            return json_response({'error': validation_error}, 400)
        if len(data['title']) > 200:
            return json_response({'error': 'title must be 200 characters or fewer'}, 400)
        if len(data['description']) > 5000:
            return json_response({'error': 'description must be 5000 characters or fewer'}, 400)
        brief_solution = data.get('briefSolution') or data['description']
        if len(brief_solution) > 2000:
            return json_response({'error': 'briefSolution must be 2000 characters or fewer'}, 400)

        problem = get_problem(problem_id)
        if not problem:
            return json_response({'error': 'Problem not found'}, 404)

        builder_name = get_display_name(user_id, data.get('builderName'))
        proposed_price_sol = parse_sol_amount(data.get('proposedPriceSol') or data.get('proposed_price_sol'))
        estimated_delivery = (data.get('estimatedDelivery') or data.get('estimated_delivery') or '').strip() or None
        if problem["type"] == PROBLEM_TYPE_JOB and (proposed_price_sol is None or not estimated_delivery):
            return json_response({'error': 'Job proposals require proposedPriceSol and estimatedDelivery'}, 400)

        proposal = {
            'id': generate_id(),
            'problemId': problem_id,
            'title': data['title'].strip(),
            'description': data['description'].strip(),
            'projectUrl': data.get('projectUrl'),
            'builderId': user_id,
            'builderName': builder_name,
            'briefSolution': brief_solution.strip(),
            'timeline': data.get('timeline') or estimated_delivery,
            'cost': data.get('cost') or (f"{sol_amount_to_string(proposed_price_sol)} SOL" if proposed_price_sol else None),
            'expertise': parse_string_list(data.get('expertise', [])),
            'status': 'pending',
            'proposedPriceSol': proposed_price_sol,
            'estimatedDelivery': estimated_delivery,
            'createdAt': get_timestamp(),
            'updatedAt': get_timestamp()
        }

        proposal = normalize_proposal(proposal)
        containers['proposals'].create_item(body=proposal)

        containers['problems'].patch_item(
            item=problem_id,
            partition_key=problem_id,
            patch_operations=[{"op": "incr", "path": "/proposals", "value": 1}],
        )

        if problem["type"] == PROBLEM_TYPE_JOB:
            create_notification(
                problem["authorId"],
                f"New proposal received on {problem['title']}",
                build_problem_link(problem_id),
            )

        return json_response(proposal, 201)

    except Exception:
        logger.exception("Handler error")
        return json_response({'error': 'Failed to create proposal'}, 500)
