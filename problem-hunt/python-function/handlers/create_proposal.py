"""Create Proposal Handler."""

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
            'briefSolution': (data.get('briefSolution') or data['description']).strip(),
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

        problem['proposals'] = problem.get('proposals', 0) + 1
        problem['updatedAt'] = get_timestamp()
        containers['problems'].replace_item(problem['id'], problem)

        if problem["type"] == PROBLEM_TYPE_JOB:
            create_notification(
                problem["authorId"],
                f"New proposal received on {problem['title']}",
                build_problem_link(problem_id),
            )

        return json_response(proposal, 201)

    except Exception as exc:
        return json_response({'error': 'Failed to create proposal', 'details': str(exc)}, 500)
