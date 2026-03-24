"""Update Problem Handler."""

import azure.functions as func

from handlers.marketplace_helpers import (
    PROBLEM_TYPE_JOB,
    get_problem,
    json_response,
    parse_job_type,
    parse_sol_amount,
    parse_string_list,
    replace_problem,
    sol_amount_to_string,
)
from utils import get_authenticated_user_id, parse_budget_value, get_timestamp, parse_requirements


def handle(req: func.HttpRequest) -> func.HttpResponse:
    """Update a problem or job."""
    try:
        problem_id = req.route_params.get('id')
        user_id = get_authenticated_user_id(req)

        if not user_id:
            return json_response({'error': 'Authentication required'}, 401)

        try:
            updates = req.get_json()
        except ValueError:
            return json_response({'error': 'Invalid JSON'}, 400)

        problem = get_problem(problem_id)
        if not problem:
            return json_response({'error': 'Problem not found'}, 404)

        if problem.get('authorId') != user_id:
            return json_response({'error': 'You can only edit your own problems'}, 403)

        if 'title' in updates:
            problem['title'] = updates['title'].strip()
        if 'description' in updates:
            problem['description'] = updates['description'].strip()
        if 'category' in updates:
            problem['category'] = updates['category']
        if 'budget' in updates:
            problem['budget'] = updates['budget']
            problem['budgetValue'] = parse_budget_value(updates['budget'])
        if 'requirements' in updates:
            problem['requirements'] = parse_requirements(updates['requirements'])
        if 'deadline' in updates:
            problem['deadline'] = updates.get('deadline')

        if problem.get("type") == PROBLEM_TYPE_JOB:
            if 'budgetSol' in updates or 'budget_sol' in updates:
                budget_sol = parse_sol_amount(updates.get('budgetSol') or updates.get('budget_sol'))
                if budget_sol is not None:
                    problem['budgetSol'] = budget_sol
                    problem['budgetValue'] = budget_sol
                    problem['budget'] = updates.get('budget') or f"{sol_amount_to_string(budget_sol)} SOL"
            if 'jobType' in updates or 'job_type' in updates:
                job_type = parse_job_type(updates.get('jobType') or updates.get('job_type'))
                if job_type:
                    problem['jobType'] = job_type
            if 'skillsRequired' in updates or 'skills_required' in updates:
                problem['skillsRequired'] = parse_string_list(
                    updates.get('skillsRequired') or updates.get('skills_required')
                )

        problem['updatedAt'] = get_timestamp()

        return json_response(replace_problem(problem))

    except Exception as exc:
        return json_response({'error': 'Failed to update problem', 'details': str(exc)}, 500)
