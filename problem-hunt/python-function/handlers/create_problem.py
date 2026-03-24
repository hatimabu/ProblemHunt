"""Create Problem/Job Handler."""

import azure.functions as func

from cosmos import containers
from handlers.marketplace_helpers import (
    PROBLEM_TYPE_JOB,
    VALID_JOB_TYPES,
    json_response,
    normalize_problem,
    parse_problem_type,
    parse_sol_amount,
    parse_string_list,
    sol_amount_to_string,
)
from utils import generate_id, get_authenticated_user_id, get_timestamp, parse_budget_value, parse_requirements, validate_required


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Create a new problem or job."""
    try:
        user_id = get_authenticated_user_id(req)
        if not user_id:
            return json_response({"error": "Authentication required"}, 401)

        try:
            data = req.get_json()
        except ValueError:
            return json_response({"error": "Invalid JSON"}, 400)

        problem_type = parse_problem_type(data.get("type"))
        validation_error = validate_required(data, ['title', 'description', 'category'])
        if validation_error:
            return json_response({'error': validation_error}, 400)

        valid_categories = ['AI/ML', 'Web3', 'Finance', 'Governance', 'Trading', 'Infrastructure']
        if data['category'] not in valid_categories:
            return json_response({'error': 'Invalid category'}, 400)

        timestamp = get_timestamp()
        requirements = parse_requirements(data.get('requirements', []))

        problem = {
            'id': generate_id(),
            'type': problem_type,
            'title': data['title'].strip(),
            'description': data['description'].strip(),
            'requirements': requirements,
            'category': data['category'],
            'upvotes': 0,
            'proposals': 0,
            'author': data.get('author', 'Anonymous User'),
            'authorId': user_id,
            'deadline': data.get('deadline'),
            'createdAt': timestamp,
            'updatedAt': timestamp
        }

        if problem_type == PROBLEM_TYPE_JOB:
            budget_sol = parse_sol_amount(data.get("budgetSol") or data.get("budget_sol") or data.get("budget"))
            job_type = str(data.get("jobType") or data.get("job_type") or "").strip().lower()
            if budget_sol is None or not data.get("deadline") or job_type not in VALID_JOB_TYPES:
                return json_response(
                    {'error': 'Jobs require budgetSol, deadline, and jobType (one-time, contract, or ongoing)'},
                    400,
                )

            problem.update(
                {
                    'budget': data.get('budget') or f"{sol_amount_to_string(budget_sol)} SOL",
                    'budgetSol': budget_sol,
                    'budgetValue': budget_sol,
                    'jobType': job_type,
                    'skillsRequired': parse_string_list(data.get('skillsRequired') or data.get('skills_required')),
                    'jobStatus': 'open',
                    'acceptedProposalId': None,
                }
            )
        else:
            budget = str(data.get('budget') or '').strip()
            if not budget:
                return json_response({'error': 'Problem posts require a budget'}, 400)
            problem.update(
                {
                    'budget': budget,
                    'budgetValue': parse_budget_value(budget),
                }
            )

        problem = normalize_problem(problem)
        containers['problems'].create_item(body=problem)

        return json_response(problem, 201)

    except Exception as exc:
        return json_response({'error': 'Failed to create post', 'details': str(exc)}, 500)
