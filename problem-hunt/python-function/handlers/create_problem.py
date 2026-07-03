"""Create Problem/Job Handler."""

import logging

import azure.functions as func

from handlers.marketplace_helpers import (
    PROBLEM_TYPE_JOB,
    VALID_JOB_TYPES,
    _problem_insert_row,
    json_response,
    normalize_problem,
    parse_problem_type,
    parse_sol_amount,
    parse_string_list,
    sol_amount_to_string,
)
from supabase_client import get_supabase_client
from utils import generate_id, get_timestamp, parse_budget_value, parse_requirements, validate_required
from shared.auth import authenticate_request, AuthError


logger = logging.getLogger(__name__)


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Create a new problem or job."""
    try:
        user_id, _ = authenticate_request(req)
    except AuthError as e:
        return json_response({"error": str(e)}, 401)

    try:
        try:
            data = req.get_json()
        except ValueError:
            return json_response({"error": "Invalid JSON"}, 400)

        problem_type = parse_problem_type(data.get("type"))
        validation_error = validate_required(data, ['title', 'description', 'category'])
        if validation_error:
            return json_response({'error': validation_error}, 400)
        if len(data['title']) > 200:
            return json_response({'error': 'title must be 200 characters or fewer'}, 400)
        if len(data['description']) > 5000:
            return json_response({'error': 'description must be 5000 characters or fewer'}, 400)
        brief_solution = data.get('briefSolution')
        if brief_solution and len(brief_solution) > 2000:
            return json_response({'error': 'briefSolution must be 2000 characters or fewer'}, 400)

        valid_categories = ['AI/ML', 'Web3', 'Finance', 'Governance', 'Trading', 'Infrastructure', 'Security', 'Data Engineering', 'DevOps', 'Backend', 'Frontend', 'Mobile', 'Automation']
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
            'updatedAt': timestamp,
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

        sb = get_supabase_client()
        sb.table('problems').insert(_problem_insert_row(problem)).execute()

        return json_response(problem, 201)

    except Exception:
        logger.exception("Handler error")
        return json_response({'error': 'Failed to create post'}, 500)
